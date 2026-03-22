import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';

const router = Router();
const TABLE = 'ins_persistency_data';

const ALLOWED_CSV_COLUMNS = new Set([
  'agent_code', 'persistency_month', 'period_start', 'period_end',
  'policies_due', 'policies_renewed',
]);

// GET /persistency-data?agent_code=&period_start=&period_end=
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
      conditions.push(`period_start >= $${values.length}`);
    }
    if (period_end) {
      values.push(period_end);
      conditions.push(`period_end <= $${values.length}`);
    }

    let text = `SELECT * FROM ${TABLE}`;
    if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
    text += ' ORDER BY calculated_at DESC, id DESC LIMIT 500';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /persistency-data/upload  — bulk insert (transactional)
// Accepts { rows: [ { agent_code, persistency_month, period_start, period_end, policies_due, policies_renewed } ] }
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

    const DB_COLUMNS = [
      'agent_code', 'persistency_month', 'period_start', 'period_end',
      'policies_due', 'policies_renewed',
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const row of dataRows) {
        const values = [
          row.agent_code,
          row.persistency_month ? Number(row.persistency_month) : null,
          row.period_start || null,
          row.period_end || null,
          row.policies_due ? Number(row.policies_due) : 0,
          row.policies_renewed ? Number(row.policies_renewed) : 0,
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
