import cron from 'node-cron';
import SftpClient from 'ssh2-sftp-client';
import { parse } from 'csv-parse';
import pool from '../db/pool.js';
import { bulkInsertTyped } from '../utils/bulkInsert.js';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,
  port: parseInt(process.env.SFTP_PORT || '22', 10),
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD || undefined,
  privateKey: process.env.SFTP_PRIVATE_KEY_PATH || undefined,
};

const BASE_PATH = process.env.SFTP_BASE_PATH || '/inbound/lifeasia';

// AS400 transaction type mapping
const TXN_TYPE_MAP = {
  NB: 'NEW_BUSINESS',
  RN: 'RENEWAL',
  LP: 'LAPSE',
  RV: 'REVIVAL',
  SR: 'SURRENDER',
};

const MAX_RETRIES = 3;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Convert AS400 date format DDMMYYYY to YYYY-MM-DD.
 * Returns null for empty/invalid input.
 */
function convertAS400Date(ddmmyyyy) {
  if (!ddmmyyyy || ddmmyyyy.trim() === '') return null;
  const s = ddmmyyyy.trim();
  if (s.length !== 8) return null;
  const dd = s.substring(0, 2);
  const mm = s.substring(2, 4);
  const yyyy = s.substring(4, 8);
  if (isNaN(Date.parse(`${yyyy}-${mm}-${dd}`))) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a CSV buffer into an array of row objects.
 * Column headers are upper-cased and trimmed.
 */
function parseCSVBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const parser = parse(buffer, {
      columns: (headers) => headers.map((h) => h.trim().toUpperCase()),
      skip_empty_lines: true,
      trim: true,
      skip_records_with_empty_values: false,
      relax_column_count: true,
      bom: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        const values = Object.values(record);
        if (values.every((v) => v === '' || v == null)) continue;
        rows.push(record);
      }
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve(rows));
  });
}

/**
 * Generate a unique batch ID for a processing run.
 */
function generateBatchId(fileType) {
  const ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  return `${fileType}_${ts}`;
}

/**
 * Connect to SFTP with retry logic (exponential backoff).
 */
async function connectSftp() {
  const sftp = new SftpClient();
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sftp.connect(SFTP_CONFIG);
      return sftp;
    } catch (err) {
      console.error(`[SFTP] Connection attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt === MAX_RETRIES) throw err;
      const delay = Math.pow(4, attempt - 1) * 1000; // 1s, 4s
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Pre-fetch lookup maps for channel and region resolution.
 */
async function fetchLookupMaps() {
  const { rows: channels } = await pool.query('SELECT id, name FROM channels');
  const channelMap = new Map(channels.map((r) => [r.name.toUpperCase(), r.id]));

  const { rows: regions } = await pool.query('SELECT id, region_code FROM ins_regions');
  const regionMap = new Map(regions.map((r) => [r.region_code.toUpperCase(), r.id]));

  return { channelMap, regionMap };
}

/**
 * Log a file processing result to file_processing_log.
 */
async function logProcessing(entry) {
  await pool.query(
    `INSERT INTO file_processing_log
       (file_name, file_type, source_system, batch_id, total_rows, valid_rows,
        error_rows, inserted_rows, updated_rows, status, error_message, started_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      entry.fileName,
      entry.fileType,
      'LIFEASIA',
      entry.batchId,
      entry.totalRows,
      entry.validRows,
      entry.errorRows,
      entry.insertedRows,
      entry.updatedRows,
      entry.status,
      entry.errorMessage || null,
      entry.startedAt,
      new Date(),
    ]
  );
}

/**
 * Check if a file has already been successfully processed.
 */
async function isAlreadyProcessed(fileName) {
  const { rows } = await pool.query(
    `SELECT 1 FROM file_processing_log WHERE file_name = $1 AND status = 'SUCCESS' LIMIT 1`,
    [fileName]
  );
  return rows.length > 0;
}

// ─────────────────────────────────────────────
// Policy Transaction Processing
// ─────────────────────────────────────────────

async function processPolicyTransactions() {
  const folderPath = `${BASE_PATH}/policy`;
  const processedPath = `${BASE_PATH}/processed`;
  const errorsPath = `${BASE_PATH}/errors`;
  const pattern = /^LIFEASIA_POLICY_TXN_\d{8}\.csv$/;

  let sftp;
  try {
    sftp = await connectSftp();
  } catch (err) {
    console.error('[PolicyTxn] SFTP connection failed after retries:', err.message);
    return;
  }

  try {
    const files = await sftp.list(folderPath);
    const matching = files.filter((f) => pattern.test(f.name)).map((f) => f.name);

    if (matching.length === 0) {
      console.log('[PolicyTxn] No new files found.');
      return;
    }

    const { channelMap, regionMap } = await fetchLookupMaps();

    for (const fileName of matching) {
      if (await isAlreadyProcessed(fileName)) {
        console.log(`[PolicyTxn] Skipping already processed file: ${fileName}`);
        continue;
      }

      const batchId = generateBatchId('POLICY_TXN');
      const startedAt = new Date();
      const filePath = `${folderPath}/${fileName}`;

      try {
        // Download file to buffer
        const buffer = await sftp.get(filePath);
        const rows = await parseCSVBuffer(buffer);

        if (rows.length === 0) {
          await logProcessing({
            fileName, fileType: 'POLICY_TXN', batchId, totalRows: 0,
            validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
            status: 'SUCCESS', startedAt,
          });
          await moveFile(sftp, filePath, processedPath, fileName);
          continue;
        }

        // Build staging rows
        const stgColumns = [
          'policy_number', 'agent_code', 'product_code', 'channel_id', 'region_id',
          'transaction_type', 'policy_year', 'premium_amount', 'sum_assured',
          'annualized_premium', 'issue_date', 'due_date', 'paid_date', 'payment_mode',
          'policy_status', 'source_system', 'branch_code', 'batch_id', 'row_number',
          'stg_status', 'stg_error',
        ];

        const stgTypeMap = {
          policy_number: 'text', agent_code: 'text', product_code: 'text',
          channel_id: 'int', region_id: 'int', transaction_type: 'text',
          policy_year: 'int', premium_amount: 'numeric', sum_assured: 'numeric',
          annualized_premium: 'numeric', issue_date: 'date', due_date: 'date',
          paid_date: 'date', payment_mode: 'text', policy_status: 'text',
          source_system: 'text', branch_code: 'text', batch_id: 'text',
          row_number: 'int', stg_status: 'text', stg_error: 'text',
        };

        const stgRows = rows.map((r, idx) => {
          const errors = [];

          // Required field checks
          if (!r.POLICY_NO) errors.push('Missing POLICY_NO');
          if (!r.AGENT_CD) errors.push('Missing AGENT_CD');
          if (!r.PROD_CD) errors.push('Missing PROD_CD');
          if (!r.TXN_TYPE) errors.push('Missing TXN_TYPE');
          if (!r.PREM_AMT) errors.push('Missing PREM_AMT');
          if (!r.APE) errors.push('Missing APE');
          if (!r.PAY_DT) errors.push('Missing PAY_DT');

          // Validate transaction type
          const txnCode = (r.TXN_TYPE || '').toUpperCase();
          if (r.TXN_TYPE && !TXN_TYPE_MAP[txnCode]) {
            errors.push(`Invalid TXN_TYPE: ${r.TXN_TYPE}`);
          }

          // Validate premium amount
          const premAmt = parseFloat(r.PREM_AMT);
          if (r.PREM_AMT && (isNaN(premAmt) || premAmt < 0)) {
            errors.push('Invalid PREM_AMT');
          }

          const channelId = r.CHANNEL ? channelMap.get(r.CHANNEL.toUpperCase()) || null : null;
          if (r.CHANNEL && !channelId) errors.push(`Unknown channel: ${r.CHANNEL}`);

          const regionId = r.REGION ? regionMap.get(r.REGION.toUpperCase()) || null : null;
          if (r.REGION && !regionId) errors.push(`Unknown region: ${r.REGION}`);

          const status = errors.length > 0 ? 'ERROR' : 'PENDING';

          return [
            r.POLICY_NO || null,
            r.AGENT_CD || null,
            r.PROD_CD || null,
            channelId,
            regionId,
            TXN_TYPE_MAP[txnCode] || r.TXN_TYPE || null,
            r.POL_YR != null && r.POL_YR !== '' ? parseInt(r.POL_YR, 10) : 1,
            r.PREM_AMT ? parseFloat(r.PREM_AMT) : null,
            r.SA_AMT ? parseFloat(r.SA_AMT) : null,
            r.APE ? parseFloat(r.APE) : null,
            convertAS400Date(r.ISS_DT),
            convertAS400Date(r.DUE_DT),
            convertAS400Date(r.PAY_DT),
            r.PAY_MODE || null,
            r.POL_STATUS || 'ACTIVE',
            'LIFEASIA',
            r.BRANCH_CD || null,
            batchId,
            idx + 1,
            status,
            errors.length > 0 ? errors.join('; ') : null,
          ];
        });

        // Bulk insert into staging
        await bulkInsertTyped('stg_policy_transactions', stgColumns, stgTypeMap, stgRows);

        // Run FK validation checks on PENDING rows
        await pool.query(`
          UPDATE stg_policy_transactions SET stg_status = 'ERROR',
            stg_error = COALESCE(stg_error || '; ', '') || 'Unknown agent code'
          WHERE batch_id = $1 AND stg_status = 'PENDING'
            AND agent_code IS NOT NULL
            AND agent_code NOT IN (SELECT agent_code FROM ins_agents)
        `, [batchId]);

        await pool.query(`
          UPDATE stg_policy_transactions SET stg_status = 'ERROR',
            stg_error = COALESCE(stg_error || '; ', '') || 'Unknown product code'
          WHERE batch_id = $1 AND stg_status = 'PENDING'
            AND product_code IS NOT NULL
            AND product_code NOT IN (SELECT product_code FROM ins_products)
        `, [batchId]);

        // Mark remaining PENDING rows as VALID
        await pool.query(`
          UPDATE stg_policy_transactions SET stg_status = 'VALID'
          WHERE batch_id = $1 AND stg_status = 'PENDING'
        `, [batchId]);

        // Move valid rows to main table
        const insertResult = await pool.query(`
          INSERT INTO ins_policy_transactions
            (policy_number, agent_code, product_code, channel_id, region_id,
             transaction_type, policy_year, premium_amount, sum_assured,
             annualized_premium, issue_date, due_date, paid_date, payment_mode,
             policy_status, source_system)
          SELECT
            policy_number, agent_code, product_code, channel_id, region_id,
            transaction_type, policy_year, premium_amount, sum_assured,
            annualized_premium, issue_date, due_date, paid_date, payment_mode,
            policy_status, source_system
          FROM stg_policy_transactions
          WHERE batch_id = $1 AND stg_status = 'VALID'
          ON CONFLICT (policy_number, transaction_type, due_date) DO UPDATE SET
            premium_amount     = EXCLUDED.premium_amount,
            sum_assured        = EXCLUDED.sum_assured,
            annualized_premium = EXCLUDED.annualized_premium,
            paid_date          = EXCLUDED.paid_date,
            policy_status      = EXCLUDED.policy_status,
            source_system      = EXCLUDED.source_system,
            uploaded_at        = NOW()
        `, [batchId]);

        // Gather counts
        const { rows: counts } = await pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE stg_status = 'VALID') AS valid,
            COUNT(*) FILTER (WHERE stg_status = 'ERROR') AS errors
          FROM stg_policy_transactions WHERE batch_id = $1
        `, [batchId]);

        const validRows = parseInt(counts[0].valid, 10);
        const errorRows = parseInt(counts[0].errors, 10);
        const insertedRows = insertResult.rowCount || 0;
        const logStatus = errorRows === 0 ? 'SUCCESS' : (validRows > 0 ? 'PARTIAL' : 'FAILED');

        await logProcessing({
          fileName, fileType: 'POLICY_TXN', batchId, totalRows: rows.length,
          validRows, errorRows, insertedRows, updatedRows: 0,
          status: logStatus, startedAt,
        });

        // Move file to processed or errors based on outcome
        if (logStatus === 'FAILED') {
          await moveFile(sftp, filePath, errorsPath, fileName);
        } else {
          await moveFile(sftp, filePath, processedPath, fileName);
        }

        console.log(`[PolicyTxn] ${fileName}: ${validRows} valid, ${errorRows} errors, ${insertedRows} inserted`);
      } catch (err) {
        console.error(`[PolicyTxn] Error processing ${fileName}:`, err.message);
        await logProcessing({
          fileName, fileType: 'POLICY_TXN', batchId, totalRows: 0,
          validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
          status: 'FAILED', errorMessage: err.message, startedAt,
        });
        try { await moveFile(sftp, filePath, errorsPath, fileName); } catch { /* ignore move error */ }
      }
    }
  } finally {
    await sftp.end();
  }
}

// ─────────────────────────────────────────────
// Agent Master Processing
// ─────────────────────────────────────────────

async function processAgentMaster() {
  const folderPath = `${BASE_PATH}/agents`;
  const processedPath = `${BASE_PATH}/processed`;
  const errorsPath = `${BASE_PATH}/errors`;
  const pattern = /^LIFEASIA_AGENT_\d{8}\.csv$/;

  let sftp;
  try {
    sftp = await connectSftp();
  } catch (err) {
    console.error('[AgentMaster] SFTP connection failed after retries:', err.message);
    return;
  }

  try {
    const files = await sftp.list(folderPath);
    const matching = files.filter((f) => pattern.test(f.name)).map((f) => f.name);

    if (matching.length === 0) {
      console.log('[AgentMaster] No new files found.');
      return;
    }

    const { channelMap, regionMap } = await fetchLookupMaps();

    for (const fileName of matching) {
      if (await isAlreadyProcessed(fileName)) {
        console.log(`[AgentMaster] Skipping already processed file: ${fileName}`);
        continue;
      }

      const batchId = generateBatchId('AGENT_MASTER');
      const startedAt = new Date();
      const filePath = `${folderPath}/${fileName}`;

      try {
        const buffer = await sftp.get(filePath);
        const rows = await parseCSVBuffer(buffer);

        if (rows.length === 0) {
          await logProcessing({
            fileName, fileType: 'AGENT_MASTER', batchId, totalRows: 0,
            validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
            status: 'SUCCESS', startedAt,
          });
          await moveFile(sftp, filePath, processedPath, fileName);
          continue;
        }

        const stgColumns = [
          'agent_code', 'agent_name', 'channel_id', 'region_id', 'branch_code',
          'license_number', 'license_expiry', 'activation_date', 'parent_agent_code',
          'hierarchy_level', 'status', 'batch_id', 'row_number', 'stg_status', 'stg_error',
        ];

        const stgTypeMap = {
          agent_code: 'text', agent_name: 'text', channel_id: 'int', region_id: 'int',
          branch_code: 'text', license_number: 'text', license_expiry: 'date',
          activation_date: 'date', parent_agent_code: 'text', hierarchy_level: 'int',
          status: 'text', batch_id: 'text', row_number: 'int', stg_status: 'text',
          stg_error: 'text',
        };

        const stgRows = rows.map((r, idx) => {
          const errors = [];

          if (!r.AGENT_CD) errors.push('Missing AGENT_CD');
          if (!r.AGENT_NAME) errors.push('Missing AGENT_NAME');
          if (!r.CHANNEL) errors.push('Missing CHANNEL');
          if (!r.REGION) errors.push('Missing REGION');

          const channelId = r.CHANNEL ? channelMap.get(r.CHANNEL.toUpperCase()) || null : null;
          if (r.CHANNEL && !channelId) errors.push(`Unknown channel: ${r.CHANNEL}`);

          const regionId = r.REGION ? regionMap.get(r.REGION.toUpperCase()) || null : null;
          if (r.REGION && !regionId) errors.push(`Unknown region: ${r.REGION}`);

          const status = errors.length > 0 ? 'ERROR' : 'PENDING';

          return [
            r.AGENT_CD || null,
            r.AGENT_NAME || null,
            channelId,
            regionId,
            r.BRANCH_CD || null,
            r.LICENSE_NO || null,
            convertAS400Date(r.LICENSE_EXPIRY),
            convertAS400Date(r.ACTIVATION_DT),
            r.PARENT_AGENT_CD || null,
            r.HIERARCHY_LEVEL != null && r.HIERARCHY_LEVEL !== '' ? parseInt(r.HIERARCHY_LEVEL, 10) : 1,
            r.STATUS || 'ACTIVE',
            batchId,
            idx + 1,
            status,
            errors.length > 0 ? errors.join('; ') : null,
          ];
        });

        // Bulk insert into staging
        await bulkInsertTyped('stg_agent_master', stgColumns, stgTypeMap, stgRows);

        // Mark remaining PENDING rows as VALID
        await pool.query(`
          UPDATE stg_agent_master SET stg_status = 'VALID'
          WHERE batch_id = $1 AND stg_status = 'PENDING'
        `, [batchId]);

        // Upsert valid rows into ins_agents
        const insertResult = await pool.query(`
          INSERT INTO ins_agents
            (agent_code, agent_name, channel_id, region_id, branch_code,
             license_number, license_expiry, activation_date, hierarchy_level, status)
          SELECT
            agent_code, agent_name, channel_id, region_id, branch_code,
            license_number, license_expiry, activation_date, hierarchy_level, status
          FROM stg_agent_master
          WHERE batch_id = $1 AND stg_status = 'VALID'
          ON CONFLICT (agent_code) DO UPDATE SET
            agent_name      = EXCLUDED.agent_name,
            channel_id      = EXCLUDED.channel_id,
            region_id       = EXCLUDED.region_id,
            branch_code     = EXCLUDED.branch_code,
            license_number  = EXCLUDED.license_number,
            license_expiry  = EXCLUDED.license_expiry,
            activation_date = EXCLUDED.activation_date,
            hierarchy_level = EXCLUDED.hierarchy_level,
            status          = EXCLUDED.status
        `, [batchId]);

        // Resolve parent_agent_id from parent_agent_code
        await pool.query(`
          UPDATE ins_agents a
          SET parent_agent_id = p.id
          FROM stg_agent_master s
          JOIN ins_agents p ON p.agent_code = s.parent_agent_code
          WHERE a.agent_code = s.agent_code
            AND s.batch_id = $1
            AND s.stg_status = 'VALID'
            AND s.parent_agent_code IS NOT NULL
            AND s.parent_agent_code != ''
        `, [batchId]);

        const { rows: counts } = await pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE stg_status = 'VALID') AS valid,
            COUNT(*) FILTER (WHERE stg_status = 'ERROR') AS errors
          FROM stg_agent_master WHERE batch_id = $1
        `, [batchId]);

        const validRows = parseInt(counts[0].valid, 10);
        const errorRows = parseInt(counts[0].errors, 10);
        const insertedRows = insertResult.rowCount || 0;
        const logStatus = errorRows === 0 ? 'SUCCESS' : (validRows > 0 ? 'PARTIAL' : 'FAILED');

        await logProcessing({
          fileName, fileType: 'AGENT_MASTER', batchId, totalRows: rows.length,
          validRows, errorRows, insertedRows, updatedRows: 0,
          status: logStatus, startedAt,
        });

        if (logStatus === 'FAILED') {
          await moveFile(sftp, filePath, errorsPath, fileName);
        } else {
          await moveFile(sftp, filePath, processedPath, fileName);
        }

        console.log(`[AgentMaster] ${fileName}: ${validRows} valid, ${errorRows} errors, ${insertedRows} inserted`);
      } catch (err) {
        console.error(`[AgentMaster] Error processing ${fileName}:`, err.message);
        await logProcessing({
          fileName, fileType: 'AGENT_MASTER', batchId, totalRows: 0,
          validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
          status: 'FAILED', errorMessage: err.message, startedAt,
        });
        try { await moveFile(sftp, filePath, errorsPath, fileName); } catch { /* ignore move error */ }
      }
    }
  } finally {
    await sftp.end();
  }
}

// ─────────────────────────────────────────────
// Persistency Data Processing
// ─────────────────────────────────────────────

async function processPersistencyData() {
  const folderPath = `${BASE_PATH}/persistency`;
  const processedPath = `${BASE_PATH}/processed`;
  const errorsPath = `${BASE_PATH}/errors`;
  const pattern = /^LIFEASIA_PERSIST_\d{6}\.csv$/;

  let sftp;
  try {
    sftp = await connectSftp();
  } catch (err) {
    console.error('[Persistency] SFTP connection failed after retries:', err.message);
    return;
  }

  try {
    const files = await sftp.list(folderPath);
    const matching = files.filter((f) => pattern.test(f.name)).map((f) => f.name);

    if (matching.length === 0) {
      console.log('[Persistency] No new files found.');
      return;
    }

    for (const fileName of matching) {
      if (await isAlreadyProcessed(fileName)) {
        console.log(`[Persistency] Skipping already processed file: ${fileName}`);
        continue;
      }

      const batchId = generateBatchId('PERSISTENCY');
      const startedAt = new Date();
      const filePath = `${folderPath}/${fileName}`;

      try {
        const buffer = await sftp.get(filePath);
        const rows = await parseCSVBuffer(buffer);

        if (rows.length === 0) {
          await logProcessing({
            fileName, fileType: 'PERSISTENCY', batchId, totalRows: 0,
            validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
            status: 'SUCCESS', startedAt,
          });
          await moveFile(sftp, filePath, processedPath, fileName);
          continue;
        }

        // Build rows for direct insert into ins_persistency_data
        const columns = [
          'agent_code', 'persistency_month', 'period_start', 'period_end',
          'policies_due', 'policies_renewed',
        ];

        const typeMap = {
          agent_code: 'text', persistency_month: 'int',
          period_start: 'date', period_end: 'date',
          policies_due: 'int', policies_renewed: 'int',
        };

        let errorCount = 0;
        const validRows = [];

        for (const r of rows) {
          if (!r.AGENT_CD || !r.PERSIST_MONTH || !r.PERIOD_START || !r.PERIOD_END ||
              !r.POLICIES_DUE || !r.POLICIES_RENEWED) {
            errorCount++;
            continue;
          }
          validRows.push([
            r.AGENT_CD,
            parseInt(r.PERSIST_MONTH, 10),
            convertAS400Date(r.PERIOD_START),
            convertAS400Date(r.PERIOD_END),
            parseInt(r.POLICIES_DUE, 10),
            parseInt(r.POLICIES_RENEWED, 10),
          ]);
        }

        let insertedRows = 0;
        if (validRows.length > 0) {
          insertedRows = await bulkInsertTyped(
            'ins_persistency_data', columns, typeMap, validRows,
            'ON CONFLICT (agent_code, persistency_month, period_start) DO UPDATE SET policies_due = EXCLUDED.policies_due, policies_renewed = EXCLUDED.policies_renewed'
          );
        }

        const logStatus = errorCount === 0 ? 'SUCCESS' : (validRows.length > 0 ? 'PARTIAL' : 'FAILED');

        await logProcessing({
          fileName, fileType: 'PERSISTENCY', batchId, totalRows: rows.length,
          validRows: validRows.length, errorRows: errorCount, insertedRows,
          updatedRows: 0, status: logStatus, startedAt,
        });

        if (logStatus === 'FAILED') {
          await moveFile(sftp, filePath, errorsPath, fileName);
        } else {
          await moveFile(sftp, filePath, processedPath, fileName);
        }

        console.log(`[Persistency] ${fileName}: ${validRows.length} valid, ${errorCount} errors, ${insertedRows} inserted`);
      } catch (err) {
        console.error(`[Persistency] Error processing ${fileName}:`, err.message);
        await logProcessing({
          fileName, fileType: 'PERSISTENCY', batchId, totalRows: 0,
          validRows: 0, errorRows: 0, insertedRows: 0, updatedRows: 0,
          status: 'FAILED', errorMessage: err.message, startedAt,
        });
        try { await moveFile(sftp, filePath, errorsPath, fileName); } catch { /* ignore move error */ }
      }
    }
  } finally {
    await sftp.end();
  }
}

// ─────────────────────────────────────────────
// File Management
// ─────────────────────────────────────────────

/**
 * Move a file to the target directory, creating a date-based subfolder for processed files.
 */
async function moveFile(sftp, srcPath, destDir, fileName) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let targetDir = destDir;

  // For processed files, use date-based subfolder
  if (destDir.includes('processed')) {
    targetDir = `${destDir}/${today}`;
    try {
      await sftp.mkdir(targetDir, true);
    } catch { /* directory may already exist */ }
  }

  await sftp.rename(srcPath, `${targetDir}/${fileName}`);
}

// ─────────────────────────────────────────────
// Cron Scheduler
// ─────────────────────────────────────────────

/**
 * Start all SFTP polling cron jobs.
 * Cron expressions are in UTC:
 *   - Policy Txns:   2:00 AM IST = 20:30 UTC (prev day) → '30 20 * * *'
 *   - Agent Master:  2:30 AM IST = 21:00 UTC (prev day) → '0 21 * * *'
 *   - Persistency:   3:00 AM IST = 21:30 UTC (prev day) → '30 21 * * *'
 */
export function startSftpPollers() {
  if (!process.env.SFTP_HOST) {
    console.log('[SFTP Poller] SFTP_HOST not configured — skipping SFTP poller startup.');
    return;
  }

  console.log('[SFTP Poller] Starting Life Asia SFTP polling jobs...');

  // Daily at 2:00 AM IST — Policy Transactions
  cron.schedule('30 20 * * *', async () => {
    console.log('[SFTP Poller] Running policy transactions job...');
    try {
      await processPolicyTransactions();
    } catch (err) {
      console.error('[SFTP Poller] Policy transactions job failed:', err.message);
    }
  });

  // Daily at 2:30 AM IST — Agent Master
  cron.schedule('0 21 * * *', async () => {
    console.log('[SFTP Poller] Running agent master job...');
    try {
      await processAgentMaster();
    } catch (err) {
      console.error('[SFTP Poller] Agent master job failed:', err.message);
    }
  });

  // Daily at 3:00 AM IST — Persistency Data
  cron.schedule('30 21 * * *', async () => {
    console.log('[SFTP Poller] Running persistency data job...');
    try {
      await processPersistencyData();
    } catch (err) {
      console.error('[SFTP Poller] Persistency data job failed:', err.message);
    }
  });

  console.log('[SFTP Poller] Cron jobs scheduled (UTC times: 20:30, 21:00, 21:30).');
}
