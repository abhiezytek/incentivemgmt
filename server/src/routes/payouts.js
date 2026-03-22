import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const router = Router();
const RULE_TABLE = 'payout_rules';
const SLAB_TABLE = 'payout_slabs';

// ── Payout Rules ────────────────────────────────────────────────────

// GET /payouts
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(RULE_TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payouts/:id  (includes nested slabs)
router.get('/:id', async (req, res) => {
  try {
    const rule = await findById(RULE_TABLE, req.params.id);
    if (!rule) return res.status(404).json({ error: 'Payout rule not found' });
    rule.slabs = await findAll(SLAB_TABLE, { payout_rule_id: req.params.id }, 'sort_order');
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payouts
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(RULE_TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /payouts/:id
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(RULE_TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'Payout rule not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /payouts/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(RULE_TABLE, req.params.id);
    if (!row) return res.status(404).json({ error: 'Payout rule not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nested Slabs ────────────────────────────────────────────────────

// GET /payouts/:ruleId/slabs
router.get('/:ruleId/slabs', async (req, res) => {
  try {
    const rows = await findAll(SLAB_TABLE, { payout_rule_id: req.params.ruleId }, 'sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payouts/:ruleId/slabs
router.post('/:ruleId/slabs', async (req, res) => {
  try {
    const row = await insertRow(SLAB_TABLE, { payout_rule_id: req.params.ruleId, ...req.body });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /payouts/:ruleId/slabs/:slabId
router.put('/:ruleId/slabs/:slabId', async (req, res) => {
  try {
    const row = await updateRow(SLAB_TABLE, req.params.slabId, req.body);
    if (!row) return res.status(404).json({ error: 'Slab not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /payouts/:ruleId/slabs/:slabId
router.delete('/:ruleId/slabs/:slabId', async (req, res) => {
  try {
    const row = await deleteRow(SLAB_TABLE, req.params.slabId);
    if (!row) return res.status(404).json({ error: 'Slab not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
