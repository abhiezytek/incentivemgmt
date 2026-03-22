import { Router } from 'express';
import { findAll, insertRow } from '../db/queryHelper.js';

const router = Router();
const TABLE = 'derived_variables';

// GET /derived-variables
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /derived-variables
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
