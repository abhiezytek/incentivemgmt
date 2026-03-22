import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const router = Router();
const GROUP_TABLE = 'user_groups';
const MEMBER_TABLE = 'group_members';

// ── User Groups ─────────────────────────────────────────────────────

// GET /groups
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(GROUP_TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /groups/:id  (includes nested members)
router.get('/:id', async (req, res) => {
  try {
    const group = await findById(GROUP_TABLE, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.members = await findAll(MEMBER_TABLE, { group_id: req.params.id });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(GROUP_TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /groups/:id
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(GROUP_TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'Group not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /groups/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(GROUP_TABLE, req.params.id);
    if (!row) return res.status(404).json({ error: 'Group not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nested Group Members ────────────────────────────────────────────

// GET /groups/:groupId/members
router.get('/:groupId/members', async (req, res) => {
  try {
    const rows = await findAll(MEMBER_TABLE, { group_id: req.params.groupId });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/members
router.post('/:groupId/members', async (req, res) => {
  try {
    const row = await insertRow(MEMBER_TABLE, { group_id: req.params.groupId, ...req.body });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /groups/:groupId/members/:memberId
router.put('/:groupId/members/:memberId', async (req, res) => {
  try {
    const row = await updateRow(MEMBER_TABLE, req.params.memberId, req.body);
    if (!row) return res.status(404).json({ error: 'Member not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /groups/:groupId/members/:memberId
router.delete('/:groupId/members/:memberId', async (req, res) => {
  try {
    const row = await deleteRow(MEMBER_TABLE, req.params.memberId);
    if (!row) return res.status(404).json({ error: 'Member not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
