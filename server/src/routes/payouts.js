import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();
const RULE_TABLE = 'payout_rules';
const SLAB_TABLE = 'payout_slabs';

/**
 * @swagger
 * /api/payouts:
 *   get:
 *     tags: [Payout Rules]
 *     summary: List all payout rules
 *     description: Retrieves every payout rule configured in the system, including commission and bonus rule definitions used across insurance incentive programs.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of payout rules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             example:
 *               - id: 1
 *                 name: "Q1 Commission Rule"
 *                 payout_type: "COMMISSION"
 *                 calc_method: "PERCENTAGE_OF"
 *                 base_field: "annualized_premium"
 *                 program_id: 10
 *               - id: 2
 *                 name: "Annual Bonus Rule"
 *                 payout_type: "BONUS"
 *                 calc_method: "FLAT"
 *                 base_field: null
 *                 program_id: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(RULE_TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{id}:
 *   get:
 *     tags: [Payout Rules]
 *     summary: Get a payout rule with nested slabs
 *     description: Returns a single payout rule by ID together with its ordered payout slabs, which define tiered commission or bonus brackets.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payout rule ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Payout rule with nested slabs array
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               name: "Q1 Commission Rule"
 *               payout_type: "COMMISSION"
 *               calc_method: "PERCENTAGE_OF"
 *               base_field: "annualized_premium"
 *               program_id: 10
 *               slabs:
 *                 - id: 1
 *                   payout_rule_id: 1
 *                   min_value: 0
 *                   max_value: 50000
 *                   rate: 5.0
 *                   sort_order: 1
 *                 - id: 2
 *                   payout_rule_id: 1
 *                   min_value: 50001
 *                   max_value: 150000
 *                   rate: 7.5
 *                   sort_order: 2
 *       404:
 *         description: Payout rule not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Payout rule not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/:id', async (req, res) => {
  try {
    const rule = await findById(RULE_TABLE, req.params.id);
    if (!rule) return res.status(404).json(apiError('VAL_006', { field: 'payout_rule' }));
    rule.slabs = await findAll(SLAB_TABLE, { payout_rule_id: req.params.id }, 'sort_order');
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts:
 *   post:
 *     tags: [Payout Rules]
 *     summary: Create a payout rule
 *     description: Creates a new payout rule that defines how agent commissions or bonuses are calculated for an incentive program.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, payout_type, calc_method, program_id]
 *             properties:
 *               name:
 *                 type: string
 *               payout_type:
 *                 type: string
 *                 enum: [COMMISSION, BONUS, OVERRIDE]
 *               calc_method:
 *                 type: string
 *                 enum: [FLAT, MULTIPLY, PERCENTAGE_OF]
 *               base_field:
 *                 type: string
 *               program_id:
 *                 type: integer
 *           example:
 *             name: "H2 Override Rule"
 *             payout_type: "OVERRIDE"
 *             calc_method: "MULTIPLY"
 *             base_field: "premium_amount"
 *             program_id: 10
 *     responses:
 *       201:
 *         description: Created payout rule
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               name: "H2 Override Rule"
 *               payout_type: "OVERRIDE"
 *               calc_method: "MULTIPLY"
 *               base_field: "premium_amount"
 *               program_id: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(RULE_TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{id}:
 *   put:
 *     tags: [Payout Rules]
 *     summary: Update a payout rule
 *     description: Updates an existing payout rule by ID. Only the provided fields are changed; omitted fields remain unchanged.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payout rule ID
 *         example: 3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               payout_type:
 *                 type: string
 *               calc_method:
 *                 type: string
 *               base_field:
 *                 type: string
 *           example:
 *             name: "H2 Override Rule – Updated"
 *             calc_method: "PERCENTAGE_OF"
 *     responses:
 *       200:
 *         description: Updated payout rule
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               name: "H2 Override Rule – Updated"
 *               payout_type: "OVERRIDE"
 *               calc_method: "PERCENTAGE_OF"
 *               base_field: "premium_amount"
 *               program_id: 10
 *       404:
 *         description: Payout rule not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Payout rule not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(RULE_TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'payout_rule' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{id}:
 *   delete:
 *     tags: [Payout Rules]
 *     summary: Delete a payout rule
 *     description: Permanently removes a payout rule and its associated slabs. Use with caution — this cannot be undone.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payout rule ID
 *         example: 3
 *     responses:
 *       200:
 *         description: Deleted payout rule
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               name: "H2 Override Rule – Updated"
 *               payout_type: "OVERRIDE"
 *               calc_method: "PERCENTAGE_OF"
 *               base_field: "premium_amount"
 *               program_id: 10
 *       404:
 *         description: Payout rule not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Payout rule not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(RULE_TABLE, req.params.id);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'payout_rule' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{ruleId}/slabs:
 *   get:
 *     tags: [Payout Rules]
 *     summary: List slabs for a payout rule
 *     description: Returns all payout slabs belonging to the specified rule, ordered by sort_order. Slabs define tiered commission or bonus brackets (e.g., 0–50 000 premium → 5 %).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent payout rule ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Array of payout slabs
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 payout_rule_id: 1
 *                 min_value: 0
 *                 max_value: 50000
 *                 rate: 5.0
 *                 sort_order: 1
 *               - id: 2
 *                 payout_rule_id: 1
 *                 min_value: 50001
 *                 max_value: 150000
 *                 rate: 7.5
 *                 sort_order: 2
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/:ruleId/slabs', async (req, res) => {
  try {
    const rows = await findAll(SLAB_TABLE, { payout_rule_id: req.params.ruleId }, 'sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{ruleId}/slabs:
 *   post:
 *     tags: [Payout Rules]
 *     summary: Create a payout slab
 *     description: Adds a new tiered slab to an existing payout rule. The slab defines a value range and the corresponding incentive rate applied within that range.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent payout rule ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [min_value, max_value, rate, sort_order]
 *             properties:
 *               min_value:
 *                 type: number
 *               max_value:
 *                 type: number
 *               rate:
 *                 type: number
 *               sort_order:
 *                 type: integer
 *           example:
 *             min_value: 150001
 *             max_value: 500000
 *             rate: 10.0
 *             sort_order: 3
 *     responses:
 *       201:
 *         description: Created payout slab
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               payout_rule_id: 1
 *               min_value: 150001
 *               max_value: 500000
 *               rate: 10.0
 *               sort_order: 3
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/:ruleId/slabs', async (req, res) => {
  try {
    const row = await insertRow(SLAB_TABLE, { payout_rule_id: req.params.ruleId, ...req.body });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{ruleId}/slabs/{slabId}:
 *   put:
 *     tags: [Payout Rules]
 *     summary: Update a payout slab
 *     description: Updates an existing payout slab by ID. Only the supplied fields are modified; omitted fields remain unchanged.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent payout rule ID
 *         example: 1
 *       - in: path
 *         name: slabId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payout slab ID
 *         example: 3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               min_value:
 *                 type: number
 *               max_value:
 *                 type: number
 *               rate:
 *                 type: number
 *               sort_order:
 *                 type: integer
 *           example:
 *             rate: 12.5
 *     responses:
 *       200:
 *         description: Updated payout slab
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               payout_rule_id: 1
 *               min_value: 150001
 *               max_value: 500000
 *               rate: 12.5
 *               sort_order: 3
 *       404:
 *         description: Slab not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Slab not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.put('/:ruleId/slabs/:slabId', async (req, res) => {
  try {
    const row = await updateRow(SLAB_TABLE, req.params.slabId, req.body);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'slab' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/payouts/{ruleId}/slabs/{slabId}:
 *   delete:
 *     tags: [Payout Rules]
 *     summary: Delete a payout slab
 *     description: Permanently removes a payout slab from its parent rule. Remaining slabs keep their current sort_order values.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent payout rule ID
 *         example: 1
 *       - in: path
 *         name: slabId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payout slab ID
 *         example: 3
 *     responses:
 *       200:
 *         description: Deleted payout slab
 *         content:
 *           application/json:
 *             example:
 *               id: 3
 *               payout_rule_id: 1
 *               min_value: 150001
 *               max_value: 500000
 *               rate: 12.5
 *               sort_order: 3
 *       404:
 *         description: Slab not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Slab not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.delete('/:ruleId/slabs/:slabId', async (req, res) => {
  try {
    const row = await deleteRow(SLAB_TABLE, req.params.slabId);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'slab' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
