import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';

const router = Router();
const TABLE = 'ins_policy_transactions';

const ALLOWED_CSV_COLUMNS = new Set([
  'policy_number', 'agent_code', 'product_code', 'channel_code', 'region_code',
  'transaction_type', 'policy_year', 'premium_amount', 'sum_assured',
  'annualized_premium', 'payment_mode', 'issue_date', 'due_date', 'paid_date',
  'policy_status',
]);

// GET /policy-transactions?agent_code=&program_id=&period_start=&period_end=
router.get('/', async (req, res) => {
  try {
    const { agent_code, period_start, period_end } = req.query;

    const conditions = [];
    const values = [];

    if (agent_code) {
      values.push(agent_code);
      conditions.push(`agent_code = $${values.length}`);
    }
    if (period_start) {
      values.push(period_start);
      conditions.push(`paid_date >= $${values.length}`);
    }
    if (period_end) {
      values.push(period_end);
      conditions.push(`paid_date <= $${values.length}`);
    }

    let text = `SELECT * FROM ${TABLE}`;
    if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
    text += ' ORDER BY uploaded_at DESC, id DESC LIMIT 500';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /policy-transactions/upload  — bulk insert (transactional)
// Accepts { rows: [ { policy_number, agent_code, product_code, channel_code, region_code, ... } ] }
// Resolves channel_code → channel_id, region_code → region_id
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
    const channelMap = new Map(channelRows.map((r) => [r.name.toUpperCase(), r.id]));

    const regionRows = await query(`SELECT id, region_code FROM ins_regions`);
    const regionMap = new Map(regionRows.map((r) => [r.region_code.toUpperCase(), r.id]));

    const DB_COLUMNS = [
      'policy_number', 'agent_code', 'product_code', 'channel_id', 'region_id',
      'transaction_type', 'policy_year', 'premium_amount', 'sum_assured',
      'annualized_premium', 'payment_mode', 'issue_date', 'due_date', 'paid_date',
      'policy_status', 'source_system',
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

        const values = [
          row.policy_number,
          row.agent_code,
          row.product_code,
          channelId,
          regionId,
          row.transaction_type,
          row.policy_year ? Number(row.policy_year) : null,
          Number(row.premium_amount),
          row.sum_assured ? Number(row.sum_assured) : null,
          row.annualized_premium ? Number(row.annualized_premium) : null,
          row.payment_mode || null,
          row.issue_date || null,
          row.due_date || null,
          row.paid_date || null,
          row.policy_status || 'ACTIVE',
          'CSV_UPLOAD',
        ];

        const placeholders = DB_COLUMNS.map((_, i) => `$${i + 1}`);
        const text = `INSERT INTO ${TABLE} (${DB_COLUMNS.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const result = await client.query(text, values);
        inserted.push(result.rows[0]);
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
