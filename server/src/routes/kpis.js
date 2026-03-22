import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const router = Router();
const KPI_TABLE = 'kpi_definitions';
const MILESTONE_TABLE = 'kpi_milestones';

// ── KPI Definitions ─────────────────────────────────────────────────

// GET /kpis
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(KPI_TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kpis/:id  (includes nested milestones)
router.get('/:id', async (req, res) => {
  try {
    const kpi = await findById(KPI_TABLE, req.params.id);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });
    kpi.milestones = await findAll(MILESTONE_TABLE, { kpi_id: req.params.id }, 'sort_order');
    res.json(kpi);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /kpis
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(KPI_TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /kpis/:id
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(KPI_TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'KPI not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /kpis/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(KPI_TABLE, req.params.id);
    if (!row) return res.status(404).json({ error: 'KPI not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nested Milestones ───────────────────────────────────────────────

// GET /kpis/:kpiId/milestones
router.get('/:kpiId/milestones', async (req, res) => {
  try {
    const rows = await findAll(MILESTONE_TABLE, { kpi_id: req.params.kpiId }, 'sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /kpis/:kpiId/milestones
router.post('/:kpiId/milestones', async (req, res) => {
  try {
    const row = await insertRow(MILESTONE_TABLE, { kpi_id: req.params.kpiId, ...req.body });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /kpis/:kpiId/milestones/:milestoneId
router.put('/:kpiId/milestones/:milestoneId', async (req, res) => {
  try {
    const row = await updateRow(MILESTONE_TABLE, req.params.milestoneId, req.body);
    if (!row) return res.status(404).json({ error: 'Milestone not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /kpis/:kpiId/milestones/:milestoneId
router.delete('/:kpiId/milestones/:milestoneId', async (req, res) => {
  try {
    const row = await deleteRow(MILESTONE_TABLE, req.params.milestoneId);
    if (!row) return res.status(404).json({ error: 'Milestone not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
