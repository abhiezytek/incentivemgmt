import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';
import { query } from '../db/pool.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();
const TABLE = 'incentive_programs';
const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'];
const PROTECTED_FIELDS = ['id', 'created_at', 'created_by'];

/**
 * @swagger
 * /api/programs:
 *   get:
 *     tags:
 *       - Programs
 *     summary: List all incentive programs
 *     description: Returns every incentive program in the system.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of incentive programs
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
 *                   name:
 *                     type: string
 *                     example: Q3 Auto Policy Growth Bonus
 *                   description:
 *                     type: string
 *                     example: Rewards agents who exceed quarterly auto policy sales targets
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     example: "2025-07-01"
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     example: "2025-09-30"
 *                   is_active:
 *                     type: boolean
 *                     example: true
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
    const rows = await findAll(TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   get:
 *     tags:
 *       - Programs
 *     summary: Get a single incentive program
 *     description: Returns one incentive program by its unique ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     responses:
 *       200:
 *         description: The requested program
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
 *                   example: Q3 Auto Policy Growth Bonus
 *                 description:
 *                   type: string
 *                   example: Rewards agents who exceed quarterly auto policy sales targets
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-07-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-09-30"
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
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
    const row = await findById(TABLE, req.params.id);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs:
 *   post:
 *     tags:
 *       - Programs
 *     summary: Create a new incentive program
 *     description: Inserts a new incentive program record and returns it.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Q3 Auto Policy Growth Bonus
 *               description:
 *                 type: string
 *                 example: Rewards agents who exceed quarterly auto policy sales targets
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-30"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Program created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 5
 *                 name:
 *                   type: string
 *                   example: Q3 Auto Policy Growth Bonus
 *                 description:
 *                   type: string
 *                   example: Rewards agents who exceed quarterly auto policy sales targets
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-07-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-09-30"
 *                 is_active:
 *                   type: boolean
 *                   example: true
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
    const row = await insertRow(TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     tags:
 *       - Programs
 *     summary: Update an incentive program
 *     description: Updates the specified incentive program and returns the updated record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
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
 *                 example: Q4 Homeowners Retention Incentive
 *               description:
 *                 type: string
 *                 example: Encourages policy renewals for homeowners coverage
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Program updated successfully
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
 *                   example: Q4 Homeowners Retention Incentive
 *                 description:
 *                   type: string
 *                   example: Encourages policy renewals for homeowners coverage
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-10-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-12-31"
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
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
    // Filter out protected fields — only update provided fields
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (!PROTECTED_FIELDS.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json(apiError('VAL_001', { fields: 'At least one updatable field is required' }));
    }

    const row = await updateRow(TABLE, req.params.id, updates);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}/status:
 *   patch:
 *     tags:
 *       - Programs
 *     summary: Update program status
 *     description: >
 *       Changes the status of an incentive program with validation rules.
 *       Cannot transition from CLOSED to ACTIVE. Cannot set ACTIVE if
 *       overlapping active programs exist, or if KPI/payout rules are missing.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, CLOSED]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Program not found
 *       409:
 *         description: Overlapping active program
 *       422:
 *         description: Business rule violation
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status: newStatus } = req.body;

    // 1. Validate status value
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return res.status(ERRORS.VAL_003.status).json(
        apiError('VAL_003', { field: 'status', allowed: VALID_STATUSES })
      );
    }

    // 2. Fetch current program
    const program = await findById(TABLE, req.params.id);
    if (!program) {
      return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    }

    // 3. Cannot transition from CLOSED back to ACTIVE
    if (program.status === 'CLOSED' && newStatus === 'ACTIVE') {
      return res.status(ERRORS.BUS_001.status).json(
        apiError('BUS_001', { current: program.status, requested: newStatus })
      );
    }

    // 4. Extra checks when activating
    if (newStatus === 'ACTIVE') {
      // Check overlapping active programs for same channel
      const overlapping = await query(
        `SELECT id FROM incentive_programs
         WHERE channel_id = $1 AND status = 'ACTIVE'
           AND id != $2
           AND (start_date, end_date) OVERLAPS ($3, $4)`,
        [program.channel_id, program.id, program.start_date, program.end_date]
      );
      if (overlapping.length > 0) {
        return res.status(ERRORS.BUS_002.status).json(
          apiError('BUS_002', { conflicting_program_ids: overlapping.map(r => r.id) })
        );
      }

      // Check KPI rules exist
      const kpis = await query(
        'SELECT COUNT(*)::int AS count FROM kpi_definitions WHERE program_id = $1',
        [program.id]
      );
      if (kpis[0].count === 0) {
        return res.status(ERRORS.BUS_007.status).json(apiError('BUS_007'));
      }

      // Check payout rules exist
      const payouts = await query(
        'SELECT COUNT(*)::int AS count FROM payout_rules WHERE program_id = $1',
        [program.id]
      );
      if (payouts[0].count === 0) {
        return res.status(ERRORS.BUS_006.status).json(apiError('BUS_006'));
      }
    }

    // 5. Update status
    const updated = await updateRow(TABLE, req.params.id, {
      status: newStatus,
    });

    // 6. Return updated program
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}/summary:
 *   get:
 *     tags:
 *       - Programs
 *     summary: Get program summary
 *     description: >
 *       Returns the program details along with KPI count, payout rule count,
 *       agent count in the target channel, and whether calculation results exist.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Program summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 program:
 *                   type: object
 *                 kpi_count:
 *                   type: integer
 *                 payout_rule_count:
 *                   type: integer
 *                 agent_count:
 *                   type: integer
 *                 has_results:
 *                   type: boolean
 *       404:
 *         description: Program not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const program = await findById(TABLE, req.params.id);
    if (!program) {
      return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    }

    // KPI count
    const kpis = await query(
      'SELECT COUNT(*)::int AS count FROM kpi_definitions WHERE program_id = $1',
      [program.id]
    );

    // Payout rule count
    const payouts = await query(
      'SELECT COUNT(*)::int AS count FROM payout_rules WHERE program_id = $1',
      [program.id]
    );

    // Agent count in channel
    const agents = await query(
      'SELECT COUNT(*)::int AS count FROM users WHERE channel_id = $1 AND is_active = TRUE',
      [program.channel_id]
    );

    // Has calculation results
    const results = await query(
      'SELECT COUNT(*)::int AS count FROM incentive_results WHERE program_id = $1',
      [program.id]
    );

    res.json({
      program,
      kpi_count: kpis[0].count,
      payout_rule_count: payouts[0].count,
      agent_count: agents[0].count,
      has_results: results[0].count > 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     tags:
 *       - Programs
 *     summary: Delete an incentive program
 *     description: Removes the specified incentive program and returns the deleted record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Program deleted successfully
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
 *                   example: Q3 Auto Policy Growth Bonus
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
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
    const row = await deleteRow(TABLE, req.params.id);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}/preview:
 *   get:
 *     tags: [Programs]
 *     summary: Scheme preview (read-only composite view)
 *     description: >
 *       Returns a complete preview of a program/scheme including its KPI
 *       definitions, payout rules with slabs, qualifying rules, agent counts,
 *       and incentive result statistics. Used by the Scheme Management wizard
 *       Live Preview step and the scheme detail drawer.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Complete scheme preview
 *       404:
 *         description: Program not found
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const program = await findById(TABLE, req.params.id);
    if (!program) return res.status(404).json(apiError('VAL_006', { field: 'program' }));

    // Channel info
    const channelRows = await query(
      `SELECT name, code FROM channels WHERE id = $1`,
      [program.channel_id]
    );

    // KPIs
    const kpis = await query(
      `SELECT kd.*, json_agg(km.* ORDER BY km.sort_order) AS milestones
       FROM kpi_definitions kd
       LEFT JOIN kpi_milestones km ON km.kpi_id = kd.id
       WHERE kd.program_id = $1
       GROUP BY kd.id
       ORDER BY kd.sort_order`,
      [program.id]
    );

    // Payout rules
    const payoutRules = await query(
      `SELECT pr.*, json_agg(ps.* ORDER BY ps.sort_order) AS slabs
       FROM payout_rules pr
       LEFT JOIN payout_slabs ps ON ps.payout_rule_id = pr.id
       WHERE pr.program_id = $1
       GROUP BY pr.id`,
      [program.id]
    );

    // Qualifying rules
    const qualifyingRules = await query(
      `SELECT pqr.*, pr.rule_name, kd.kpi_name
       FROM payout_qualifying_rules pqr
       JOIN payout_rules pr ON pr.id = pqr.payout_rule_id
       LEFT JOIN kpi_definitions kd ON kd.id = pqr.kpi_id
       WHERE pr.program_id = $1`,
      [program.id]
    );

    // Agent count
    const agentCount = await query(
      `SELECT COUNT(*)::int AS cnt FROM ins_agents
       WHERE channel_id = $1 AND status = 'ACTIVE'`,
      [program.channel_id]
    );

    // Result stats (if calculations have run)
    const resultStats = await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
       FROM ins_incentive_results WHERE program_id = $1
       GROUP BY status`,
      [program.id]
    );
    const stats = {};
    for (const r of resultStats) {
      stats[r.status] = { count: r.count, total: Number(r.total) };
    }

    res.json({
      ...program,
      channel: channelRows[0] || null,
      kpis,
      payoutRules,
      qualifyingRules,
      agentCount: agentCount[0]?.cnt || 0,
      resultStats: stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
