import cron from 'node-cron';
import pool, { query } from '../db/pool.js';
import { bulkInsertTyped } from '../utils/bulkInsert.js';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const API_BASE = process.env.HIERARCHY_API_BASE;
const CLIENT_ID = process.env.HIERARCHY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.HIERARCHY_API_CLIENT_SECRET;
const PAGE_SIZE = parseInt(process.env.HIERARCHY_SYNC_PAGE_SIZE || '500', 10);

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MULTIPLIER = 4;
const REQUEST_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────
// Token Management
// ─────────────────────────────────────────────

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain or reuse a cached JWT token from the Hierarchy API.
 */
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const res = await fetchWithTimeout(`${API_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000;
  return cachedToken;
}

/**
 * Invalidate the cached token so the next call fetches a fresh one.
 */
function clearToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ─────────────────────────────────────────────
// HTTP Helpers
// ─────────────────────────────────────────────

/**
 * Fetch with a timeout using AbortController.
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Make an authenticated GET request with retry + exponential backoff.
 * On 401, refreshes the token once and retries.
 */
async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, v);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const token = await getToken();
    const res = await fetchWithTimeout(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Source-System': 'INCENTIVE_MGMT',
      },
    });

    // 401 → refresh token and retry once
    if (res.status === 401 && attempt === 1) {
      clearToken();
      continue;
    }

    // 429 → respect Retry-After
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      console.warn(`[HierarchySync] 429 — waiting ${retryAfter}s before retry...`);
      await sleep(retryAfter * 1000);
      continue;
    }

    // 5xx → retry with backoff
    if (res.status >= 500) {
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
        console.warn(`[HierarchySync] ${res.status} on attempt ${attempt} — retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      const body = await res.text();
      throw new Error(`Server error after ${MAX_RETRIES} attempts (${res.status}): ${body}`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error (${res.status}): ${body}`);
    }

    return await res.json();
  }

  throw new Error('Max retries exhausted');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// Lookup Maps
// ─────────────────────────────────────────────

/**
 * Pre-fetch channel and region lookup maps.
 */
async function fetchLookupMaps() {
  const channels = await query('SELECT id, name FROM channels');
  const channelMap = new Map(channels.map((r) => [r.name.toUpperCase(), r.id]));

  const regions = await query('SELECT id, region_code FROM ins_regions');
  const regionMap = new Map(regions.map((r) => [r.region_code.toUpperCase(), r.id]));

  return { channelMap, regionMap };
}

// ─────────────────────────────────────────────
// Sync Logic
// ─────────────────────────────────────────────

/**
 * Get the last successful hierarchy sync date from file_processing_log.
 */
async function getLastSyncDate() {
  const rows = await query(
    `SELECT completed_at FROM file_processing_log
     WHERE file_type = 'HIERARCHY_SYNC' AND status = 'SUCCESS'
     ORDER BY completed_at DESC LIMIT 1`
  );
  return rows.length > 0 ? rows[0].completed_at.toISOString().slice(0, 10) : null;
}

/**
 * Fetch all agents from the Hierarchy API, handling pagination.
 * @param {string|null} updatedSince  ISO date for delta sync (null = full)
 * @returns {Array} All agent objects
 */
async function fetchAllAgents(updatedSince) {
  const allAgents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`[HierarchySync] Fetching page ${page}...`);
    const result = await apiGet('/api/agents', {
      updatedSince,
      page,
      pageSize: PAGE_SIZE,
    });

    if (result.data && result.data.length > 0) {
      allAgents.push(...result.data);
    }

    hasMore = result.pagination?.hasNextPage ?? false;
    page++;
  }

  return allAgents;
}

/**
 * Run the hierarchy sync process.
 */
async function runHierarchySync() {
  const startedAt = new Date();
  let totalFetched = 0;
  let upsertedCount = 0;
  let errorMessage = null;

  try {
    // 1. Determine delta date
    const lastSync = await getLastSyncDate();
    const syncMode = lastSync ? 'DELTA' : 'FULL';
    console.log(`[HierarchySync] Starting ${syncMode} sync${lastSync ? ` (since ${lastSync})` : ''}...`);

    // 2. Fetch all agents (paginated)
    const agents = await fetchAllAgents(lastSync);
    totalFetched = agents.length;
    console.log(`[HierarchySync] Fetched ${totalFetched} agents.`);

    if (totalFetched === 0) {
      console.log('[HierarchySync] No updates — nothing to sync.');
      await logSyncResult({
        startedAt, totalFetched: 0, upsertedCount: 0,
        status: 'SUCCESS', errorMessage: null,
      });
      return;
    }

    // 3. Resolve lookup maps
    const { channelMap, regionMap } = await fetchLookupMaps();

    // 4. Build rows for upsert
    const columns = [
      'agent_code', 'agent_name', 'channel_id', 'region_id', 'branch_code',
      'license_number', 'license_expiry', 'activation_date', 'status',
      'hierarchy_level',
    ];

    const typeMap = {
      agent_code: 'text', agent_name: 'text', channel_id: 'int',
      region_id: 'int', branch_code: 'text', license_number: 'text',
      license_expiry: 'date', activation_date: 'date', status: 'text',
      hierarchy_level: 'int',
    };

    const rows = agents.map((a) => [
      a.agent_code,
      a.agent_name,
      a.channel ? channelMap.get(a.channel.toUpperCase()) || null : null,
      a.region_code ? regionMap.get(a.region_code.toUpperCase()) || null : null,
      a.branch_code || null,
      a.license_number || null,
      a.license_expiry || null,
      a.activation_date || null,
      a.status || 'ACTIVE',
      a.hierarchy_level != null ? a.hierarchy_level : 1,
    ]);

    // 5. Bulk upsert into ins_agents
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const count = await bulkInsertTyped(
          'ins_agents', columns, typeMap, batch,
          `ON CONFLICT (agent_code) DO UPDATE SET
            agent_name      = EXCLUDED.agent_name,
            channel_id      = EXCLUDED.channel_id,
            region_id       = EXCLUDED.region_id,
            branch_code     = EXCLUDED.branch_code,
            license_number  = EXCLUDED.license_number,
            license_expiry  = EXCLUDED.license_expiry,
            activation_date = EXCLUDED.activation_date,
            status          = EXCLUDED.status,
            hierarchy_level = EXCLUDED.hierarchy_level`
        );
        upsertedCount += count;
      } catch (err) {
        console.error(`[HierarchySync] Batch upsert error (rows ${i}-${i + batch.length}):`, err.message);
        // Continue with remaining batches
      }
    }

    // 6. Resolve parent_agent_id from parent_agent_code
    console.log('[HierarchySync] Resolving parent relationships...');
    const agentsWithParent = agents.filter((a) => a.parent_agent_code);
    for (let i = 0; i < agentsWithParent.length; i += BATCH_SIZE) {
      const batch = agentsWithParent.slice(i, i + BATCH_SIZE);
      const codes = batch.map((a) => a.agent_code);
      const parentCodes = batch.map((a) => a.parent_agent_code);
      await pool.query(
        `UPDATE ins_agents a
         SET parent_agent_id = p.id
         FROM UNNEST($1::text[], $2::text[]) AS t(child_code, parent_code)
         JOIN ins_agents p ON p.agent_code = t.parent_code
         WHERE a.agent_code = t.child_code`,
        [codes, parentCodes]
      );
    }

    // 7. Rebuild hierarchy paths (convert code-based to ID-based)
    console.log('[HierarchySync] Rebuilding hierarchy paths...');
    const agentsWithPath = agents.filter((a) => a.hierarchy_path);
    for (let i = 0; i < agentsWithPath.length; i += BATCH_SIZE) {
      const batch = agentsWithPath.slice(i, i + BATCH_SIZE);
      for (const agent of batch) {
        // Convert "AGT001.AGT010.AGT050" → "1.5.12" using agent_code → id lookup
        const pathCodes = agent.hierarchy_path.split('.');
        const idRows = await query(
          `SELECT agent_code, id FROM ins_agents WHERE agent_code = ANY($1::text[])`,
          [pathCodes]
        );
        const codeToId = new Map(idRows.map((r) => [r.agent_code, r.id]));
        const idPath = pathCodes
          .map((code) => codeToId.get(code))
          .filter((id) => id != null)
          .join('.');

        if (idPath) {
          await pool.query(
            `UPDATE ins_agents SET hierarchy_path = $1 WHERE agent_code = $2`,
            [idPath, agent.agent_code]
          );
        }
      }
    }

    console.log(`[HierarchySync] Sync complete: ${upsertedCount} agents upserted.`);

    // 8. Log result
    await logSyncResult({
      startedAt, totalFetched, upsertedCount,
      status: 'SUCCESS', errorMessage: null,
    });
  } catch (err) {
    errorMessage = err.message;
    console.error('[HierarchySync] Sync failed:', err.message);
    await logSyncResult({
      startedAt, totalFetched, upsertedCount,
      status: 'FAILED', errorMessage,
    });
  }
}

/**
 * Log the sync result to file_processing_log.
 */
async function logSyncResult({ startedAt, totalFetched, upsertedCount, status, errorMessage }) {
  await pool.query(
    `INSERT INTO file_processing_log
       (file_name, file_type, source_system, batch_id, total_rows, valid_rows,
        error_rows, inserted_rows, updated_rows, status, error_message, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      'hierarchy_sync_' + startedAt.toISOString().slice(0, 10),
      'HIERARCHY_SYNC',
      'HIERARCHY_API',
      'HSYNC_' + startedAt.toISOString().replace(/[^0-9]/g, '').slice(0, 14),
      totalFetched,
      upsertedCount,
      totalFetched - upsertedCount,
      upsertedCount,
      0,
      status,
      errorMessage || null,
      startedAt,
      new Date(),
    ]
  );
}

// ─────────────────────────────────────────────
// Cron Scheduler
// ─────────────────────────────────────────────

/**
 * Start the hierarchy sync cron job.
 * 2:30 AM IST = 21:00 UTC (previous day) → '0 21 * * *'
 */
export function startHierarchySync() {
  if (!API_BASE) {
    console.log('[HierarchySync] HIERARCHY_API_BASE not configured — skipping hierarchy sync startup.');
    return;
  }

  console.log('[HierarchySync] Starting hierarchy sync cron job...');

  cron.schedule('0 21 * * *', async () => {
    console.log('[HierarchySync] Running daily hierarchy sync...');
    try {
      await runHierarchySync();
    } catch (err) {
      console.error('[HierarchySync] Hierarchy sync job failed:', err.message);
    }
  });

  console.log('[HierarchySync] Cron job scheduled (21:00 UTC = 2:30 AM IST).');
}
