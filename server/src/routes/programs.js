import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const router = Router();
const TABLE = 'incentive_programs';

// GET /programs
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /programs/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await findById(TABLE, req.params.id);
    if (!row) return res.status(404).json({ error: 'Program not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /programs
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /programs/:id
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'Program not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /programs/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(TABLE, req.params.id);
    if (!row) return res.status(404).json({ error: 'Program not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
