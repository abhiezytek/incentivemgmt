import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';

const router = Router();
const TABLE = 'ins_agents';

const ALLOWED_CSV_COLUMNS = new Set([
  'agent_code', 'agent_name', 'channel_code', 'region_code', 'branch_code',
  'license_number', 'license_expiry', 'activation_date', 'parent_agent_code',
  'hierarchy_level', 'status',
]);

// GET /agents?channel_id=&region_id=&status=
router.get('/', async (req, res) => {
  try {
    const { channel_id, region_id, status } = req.query;

    const conditions = [];
    const values = [];

    if (channel_id) {
      values.push(channel_id);
      conditions.push(`channel_id = $${values.length}`);
    }
    if (region_id) {
      values.push(region_id);
      conditions.push(`region_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    let text = `SELECT * FROM ${TABLE}`;
    if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
    text += ' ORDER BY created_at DESC, id DESC LIMIT 500';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /agents/upload  — bulk insert (transactional)
// Accepts { rows: [ { agent_code, agent_name, channel_code, region_code, ... } ] }
// Resolves channel_code → channel_id, region_code → region_id, parent_agent_code → parent_agent_id
router.post('/upload', async (req, res) => {
  try {
    const { rows: dataRows } = req.body;
    if (!Array.isArray(dataRows) || dataRows.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "rows" array' });
    }

    const csvColumns = Object.keys(dataRows[0]);
    const invalid = csvColumns.filter((c) => !ALLOWED_CSV_COLUMNS.has(c));
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid columns: ${invalid.join(', ')}` });
    }

    // Pre-fetch lookup maps for channel_code → id and region_code → id
    const channelRows = await query(`SELECT id, name FROM channels`);
    const channelMap = new Map(channelRows.filter((r) => r.name).map((r) => [r.name.toUpperCase(), r.id]));

    const regionRows = await query(`SELECT id, region_code FROM ins_regions`);
    const regionMap = new Map(regionRows.filter((r) => r.region_code).map((r) => [r.region_code.toUpperCase(), r.id]));

    // Pre-fetch existing agents for parent_agent_code → parent_agent_id resolution
    const existingAgents = await query(`SELECT id, agent_code FROM ${TABLE}`);
    const agentMap = new Map(existingAgents.map((r) => [r.agent_code.toUpperCase(), r.id]));

    const DB_COLUMNS = [
      'agent_code', 'agent_name', 'channel_id', 'region_id', 'branch_code',
      'license_number', 'license_expiry', 'activation_date', 'parent_agent_id',
      'hierarchy_level', 'status',
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const row of dataRows) {
        const channelId = row.channel_code
          ? channelMap.get(row.channel_code.toUpperCase()) ?? null
          : null;
        const regionId = row.region_code
          ? regionMap.get(row.region_code.toUpperCase()) ?? null
          : null;

        // Resolve parent_agent_code: check both existing DB agents and previously inserted rows in this batch
        let parentAgentId = null;
        if (row.parent_agent_code) {
          parentAgentId = agentMap.get(row.parent_agent_code.toUpperCase()) ?? null;
        }

        const values = [
          row.agent_code,
          row.agent_name || null,
          channelId,
          regionId,
          row.branch_code || null,
          row.license_number || null,
          row.license_expiry || null,
          row.activation_date || null,
          parentAgentId,
          row.hierarchy_level ? Number(row.hierarchy_level) : 1,
          row.status || 'ACTIVE',
        ];

        const placeholders = DB_COLUMNS.map((_, i) => `$${i + 1}`);
        const text = `INSERT INTO ${TABLE} (${DB_COLUMNS.join(', ')}) VALUES (${placeholders.join(', ')})
          ON CONFLICT (agent_code) DO UPDATE SET
            agent_name      = EXCLUDED.agent_name,
            channel_id      = EXCLUDED.channel_id,
            region_id       = EXCLUDED.region_id,
            branch_code     = EXCLUDED.branch_code,
            license_number  = EXCLUDED.license_number,
            license_expiry  = EXCLUDED.license_expiry,
            activation_date = EXCLUDED.activation_date,
            parent_agent_id = EXCLUDED.parent_agent_id,
            hierarchy_level = EXCLUDED.hierarchy_level,
            status          = EXCLUDED.status
          RETURNING *`;
        const result = await client.query(text, values);
        const insertedRow = result.rows[0];
        inserted.push(insertedRow);

        // Update agentMap so subsequent rows in this batch can reference this agent as parent
        agentMap.set(insertedRow.agent_code.toUpperCase(), insertedRow.id);
      }

      await client.query('COMMIT');
      res.status(201).json({ inserted: inserted.length, rows: inserted });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
