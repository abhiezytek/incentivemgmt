import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';

const router = Router();
const TABLE = 'ins_incentive_rates';

const ALLOWED_CSV_COLUMNS = new Set([
  'product_code', 'channel_code', 'policy_year', 'transaction_type',
  'rate_type', 'incentive_rate', 'min_premium_slab', 'max_premium_slab',
  'min_policy_term', 'max_policy_term', 'effective_from', 'effective_to',
]);

// GET /incentive-rates?product_code=&channel_code=&transaction_type=
router.get('/', async (req, res) => {
  try {
    const { product_code, transaction_type, is_active } = req.query;

    const conditions = [];
    const values = [];

    if (product_code) {
      values.push(product_code);
      conditions.push(`r.product_code = $${values.length}`);
    }
    if (transaction_type) {
      values.push(transaction_type);
      conditions.push(`r.transaction_type = $${values.length}`);
    }
    if (is_active !== undefined) {
      values.push(is_active === 'true');
      conditions.push(`r.is_active = $${values.length}`);
    }

    let text = `SELECT r.*, c.name AS channel_name FROM ${TABLE} r LEFT JOIN channels c ON c.id = r.channel_id`;
    if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
    text += ' ORDER BY r.id DESC LIMIT 500';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /incentive-rates/upload  — bulk insert (transactional)
// Accepts { rows: [ { product_code, channel_code, policy_year, transaction_type, rate_type, incentive_rate, ... } ] }
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

    // Pre-fetch lookup map for channel_code → channel_id
    const channelRows = await query(`SELECT id, name FROM channels`);
    const channelMap = new Map(channelRows.filter((r) => r.name).map((r) => [r.name.toUpperCase(), r.id]));

    const DB_COLUMNS = [
      'product_code', 'channel_id', 'policy_year', 'transaction_type',
      'rate_type', 'incentive_rate', 'min_premium_slab', 'max_premium_slab',
      'min_policy_term', 'max_policy_term', 'effective_from', 'effective_to',
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const row of dataRows) {
        const channelId = row.channel_code
          ? channelMap.get(row.channel_code.toUpperCase()) ?? null
          : null;

        const values = [
          row.product_code,
          channelId,
          row.policy_year ? Number(row.policy_year) : 1,
          row.transaction_type || null,
          row.rate_type || null,
          row.incentive_rate ? Number(row.incentive_rate) : 0,
          row.min_premium_slab ? Number(row.min_premium_slab) : 0,
          row.max_premium_slab ? Number(row.max_premium_slab) : 999999999,
          row.min_policy_term ? Number(row.min_policy_term) : 0,
          row.max_policy_term ? Number(row.max_policy_term) : 99,
          row.effective_from || null,
          row.effective_to || null,
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
