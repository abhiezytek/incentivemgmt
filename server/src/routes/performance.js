import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';
import { insertRow } from '../db/queryHelper.js';

const router = Router();
const TABLE = 'performance_data';

const ALLOWED_COLUMNS = new Set([
  'user_id', 'program_id', 'kpi_id',
  'period_start', 'period_end',
  'target_value', 'achieved_value', 'source',
]);

// GET /performance?program_id=&period_start=&period_end=
router.get('/', async (req, res) => {
  try {
    const { program_id, period_start, period_end } = req.query;

    const conditions = [];
    const values = [];

    if (program_id) {
      values.push(program_id);
      conditions.push(`program_id = $${values.length}`);
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
    text += ' ORDER BY id';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /performance  — single row insert
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /performance/upload  — bulk insert (transactional)
router.post('/upload', async (req, res) => {
  try {
    const { rows: dataRows } = req.body;          // expect { rows: [ {…}, {…} ] }
    if (!Array.isArray(dataRows) || dataRows.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "rows" array' });
    }

    const columns = Object.keys(dataRows[0]);
    const invalid = columns.filter((c) => !ALLOWED_COLUMNS.has(c));
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid columns: ${invalid.join(', ')}` });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const row of dataRows) {
        const values = columns.map((c) => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const text = `INSERT INTO ${TABLE} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
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
