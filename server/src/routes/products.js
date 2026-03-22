import { Router } from 'express';
import pool from '../db/pool.js';
import { query } from '../db/pool.js';

const router = Router();
const TABLE = 'ins_products';

const ALLOWED_CSV_COLUMNS = new Set([
  'product_code', 'product_name', 'product_category', 'product_type',
  'min_premium', 'min_sum_assured', 'min_policy_term',
]);

// GET /products?product_category=&product_type=&is_active=
router.get('/', async (req, res) => {
  try {
    const { product_category, product_type, is_active } = req.query;

    const conditions = [];
    const values = [];

    if (product_category) {
      values.push(product_category);
      conditions.push(`product_category = $${values.length}`);
    }
    if (product_type) {
      values.push(product_type);
      conditions.push(`product_type = $${values.length}`);
    }
    if (is_active !== undefined) {
      values.push(is_active === 'true');
      conditions.push(`is_active = $${values.length}`);
    }

    let text = `SELECT * FROM ${TABLE}`;
    if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
    text += ' ORDER BY id DESC LIMIT 500';

    const rows = await query(text, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /products/upload  — bulk upsert (transactional)
// Accepts { rows: [ { product_code, product_name, product_category, product_type, min_premium, min_sum_assured, min_policy_term } ] }
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
      'product_code', 'product_name', 'product_category', 'product_type',
      'min_premium', 'min_sum_assured', 'min_policy_term',
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const row of dataRows) {
        const values = [
          row.product_code,
          row.product_name || null,
          row.product_category || null,
          row.product_type || null,
          row.min_premium ? Number(row.min_premium) : 0,
          row.min_sum_assured ? Number(row.min_sum_assured) : 0,
          row.min_policy_term ? Number(row.min_policy_term) : 1,
        ];

        const placeholders = DB_COLUMNS.map((_, i) => `$${i + 1}`);
        const text = `INSERT INTO ${TABLE} (${DB_COLUMNS.join(', ')}) VALUES (${placeholders.join(', ')})
          ON CONFLICT (product_code) DO UPDATE SET
            product_name     = EXCLUDED.product_name,
            product_category = EXCLUDED.product_category,
            product_type     = EXCLUDED.product_type,
            min_premium      = EXCLUDED.min_premium,
            min_sum_assured  = EXCLUDED.min_sum_assured,
            min_policy_term  = EXCLUDED.min_policy_term
          RETURNING *`;
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
