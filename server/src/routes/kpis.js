import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const router = Router();
const KPI_TABLE = 'kpi_definitions';
const MILESTONE_TABLE = 'kpi_milestones';

// ── KPI Definitions ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/kpis:
 *   get:
 *     tags:
 *       - KPI Rules
 *     summary: List all KPI definitions
 *     description: Returns every KPI definition configured in the system.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of KPI definitions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   program_id:
 *                     type: integer
 *                     example: 3
 *                   name:
 *                     type: string
 *                     example: New Auto Policies Written
 *                   metric_type:
 *                     type: string
 *                     example: COUNT
 *                   target_value:
 *                     type: number
 *                     example: 50
 *                   weight:
 *                     type: number
 *                     format: float
 *                     example: 0.4
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(KPI_TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   get:
 *     tags:
 *       - KPI Rules
 *     summary: Get a KPI definition with milestones
 *     description: Returns a single KPI definition by ID, including its nested milestones array.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: KPI definition ID
 *         example: 1
 *     responses:
 *       200:
 *         description: KPI definition with milestones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 program_id:
 *                   type: integer
 *                   example: 3
 *                 name:
 *                   type: string
 *                   example: New Auto Policies Written
 *                 metric_type:
 *                   type: string
 *                   example: COUNT
 *                 target_value:
 *                   type: number
 *                   example: 50
 *                 weight:
 *                   type: number
 *                   format: float
 *                   example: 0.4
 *                 milestones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 10
 *                       kpi_id:
 *                         type: integer
 *                         example: 1
 *                       label:
 *                         type: string
 *                         example: Bronze Tier
 *                       threshold_value:
 *                         type: number
 *                         example: 20
 *                       payout_amount:
 *                         type: number
 *                         example: 500
 *                       sort_order:
 *                         type: integer
 *                         example: 1
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: KPI not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: KPI not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
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

/**
 * @swagger
 * /api/kpis:
 *   post:
 *     tags:
 *       - KPI Rules
 *     summary: Create a KPI definition
 *     description: Inserts a new KPI definition and returns the created record.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - program_id
 *               - name
 *               - metric_type
 *             properties:
 *               program_id:
 *                 type: integer
 *                 example: 3
 *               name:
 *                 type: string
 *                 example: New Auto Policies Written
 *               metric_type:
 *                 type: string
 *                 example: COUNT
 *               target_value:
 *                 type: number
 *                 example: 50
 *               weight:
 *                 type: number
 *                 format: float
 *                 example: 0.4
 *     responses:
 *       201:
 *         description: KPI definition created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 7
 *                 program_id:
 *                   type: integer
 *                   example: 3
 *                 name:
 *                   type: string
 *                   example: New Auto Policies Written
 *                 metric_type:
 *                   type: string
 *                   example: COUNT
 *                 target_value:
 *                   type: number
 *                   example: 50
 *                 weight:
 *                   type: number
 *                   format: float
 *                   example: 0.4
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(KPI_TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   put:
 *     tags:
 *       - KPI Rules
 *     summary: Update a KPI definition
 *     description: Updates the specified KPI definition and returns the updated record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: KPI definition ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Homeowners Policy Renewals
 *               metric_type:
 *                 type: string
 *                 example: PERCENTAGE
 *               target_value:
 *                 type: number
 *                 example: 85
 *               weight:
 *                 type: number
 *                 format: float
 *                 example: 0.3
 *     responses:
 *       200:
 *         description: KPI definition updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 program_id:
 *                   type: integer
 *                   example: 3
 *                 name:
 *                   type: string
 *                   example: Homeowners Policy Renewals
 *                 metric_type:
 *                   type: string
 *                   example: PERCENTAGE
 *                 target_value:
 *                   type: number
 *                   example: 85
 *                 weight:
 *                   type: number
 *                   format: float
 *                   example: 0.3
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: KPI not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: KPI not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(KPI_TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'KPI not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{id}:
 *   delete:
 *     tags:
 *       - KPI Rules
 *     summary: Delete a KPI definition
 *     description: Removes the specified KPI definition and returns the deleted record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: KPI definition ID
 *         example: 1
 *     responses:
 *       200:
 *         description: KPI definition deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: New Auto Policies Written
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: KPI not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: KPI not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
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

/**
 * @swagger
 * /api/kpis/{kpiId}/milestones:
 *   get:
 *     tags:
 *       - KPI Rules
 *     summary: List milestones for a KPI
 *     description: Returns all milestones belonging to the specified KPI, ordered by sort_order.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent KPI definition ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Array of milestones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 10
 *                   kpi_id:
 *                     type: integer
 *                     example: 1
 *                   label:
 *                     type: string
 *                     example: Bronze Tier
 *                   threshold_value:
 *                     type: number
 *                     example: 20
 *                   payout_amount:
 *                     type: number
 *                     example: 500
 *                   sort_order:
 *                     type: integer
 *                     example: 1
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.get('/:kpiId/milestones', async (req, res) => {
  try {
    const rows = await findAll(MILESTONE_TABLE, { kpi_id: req.params.kpiId }, 'sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{kpiId}/milestones:
 *   post:
 *     tags:
 *       - KPI Rules
 *     summary: Create a milestone for a KPI
 *     description: Adds a new milestone to the specified KPI and returns the created record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent KPI definition ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - threshold_value
 *               - payout_amount
 *             properties:
 *               label:
 *                 type: string
 *                 example: Silver Tier
 *               threshold_value:
 *                 type: number
 *                 example: 35
 *               payout_amount:
 *                 type: number
 *                 example: 1000
 *               sort_order:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Milestone created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 11
 *                 kpi_id:
 *                   type: integer
 *                   example: 1
 *                 label:
 *                   type: string
 *                   example: Silver Tier
 *                 threshold_value:
 *                   type: number
 *                   example: 35
 *                 payout_amount:
 *                   type: number
 *                   example: 1000
 *                 sort_order:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.post('/:kpiId/milestones', async (req, res) => {
  try {
    const row = await insertRow(MILESTONE_TABLE, { kpi_id: req.params.kpiId, ...req.body });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{kpiId}/milestones/{milestoneId}:
 *   put:
 *     tags:
 *       - KPI Rules
 *     summary: Update a milestone
 *     description: Updates the specified milestone under a KPI and returns the updated record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent KPI definition ID
 *         example: 1
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Milestone ID
 *         example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 example: Gold Tier
 *               threshold_value:
 *                 type: number
 *                 example: 50
 *               payout_amount:
 *                 type: number
 *                 example: 2000
 *               sort_order:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Milestone updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 10
 *                 kpi_id:
 *                   type: integer
 *                   example: 1
 *                 label:
 *                   type: string
 *                   example: Gold Tier
 *                 threshold_value:
 *                   type: number
 *                   example: 50
 *                 payout_amount:
 *                   type: number
 *                   example: 2000
 *                 sort_order:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Milestone not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Milestone not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.put('/:kpiId/milestones/:milestoneId', async (req, res) => {
  try {
    const row = await updateRow(MILESTONE_TABLE, req.params.milestoneId, req.body);
    if (!row) return res.status(404).json({ error: 'Milestone not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpis/{kpiId}/milestones/{milestoneId}:
 *   delete:
 *     tags:
 *       - KPI Rules
 *     summary: Delete a milestone
 *     description: Removes the specified milestone and returns the deleted record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kpiId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent KPI definition ID
 *         example: 1
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Milestone ID
 *         example: 10
 *     responses:
 *       200:
 *         description: Milestone deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 10
 *                 label:
 *                   type: string
 *                   example: Bronze Tier
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Milestone not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Milestone not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
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
