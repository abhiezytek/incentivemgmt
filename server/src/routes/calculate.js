import { Router } from 'express';
import { query } from '../db/pool.js';
import { calculateIncentive } from '../engine/calculateIncentive.js';
import { calculateAgentIncentive } from '../engine/insuranceCalcEngine.js';

const router = Router();

/**
 * @swagger
 * /api/calculate/run:
 *   post:
 *     tags: [Calculations]
 *     summary: Run bulk incentive calculation
 *     description: |
 *       Triggers a full incentive calculation for every active agent in the specified
 *       program's channel. Each agent is processed sequentially via the insurance
 *       calculation engine. The response includes summary counts and the aggregate
 *       incentive pool. Any per-agent errors are returned in the `errors` array.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [programId, periodStart, periodEnd]
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: Incentive program ID
 *               periodStart:
 *                 type: string
 *                 format: date
 *                 description: Period start date (YYYY-MM-DD)
 *               periodEnd:
 *                 type: string
 *                 format: date
 *                 description: Period end date (YYYY-MM-DD)
 *           example:
 *             programId: 10
 *             periodStart: "2025-01-01"
 *             periodEnd: "2025-03-31"
 *     responses:
 *       200:
 *         description: Calculation summary
 *         content:
 *           application/json:
 *             example:
 *               programId: 10
 *               periodStart: "2025-01-01"
 *               periodEnd: "2025-03-31"
 *               totalAgents: 150
 *               successCount: 148
 *               errorCount: 2
 *               totalIncentivePool: 1245800.50
 *               errors:
 *                 - agentCode: "AGT-0042"
 *                   error: "No active rates found for product TERM-LIFE"
 *                 - agentCode: "AGT-0099"
 *                   error: "Missing persistency data for month 13"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             example:
 *               error: "programId, periodStart, and periodEnd are required"
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Program not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/run', async (req, res) => {
  try {
    const { programId, periodStart, periodEnd } = req.body;
    if (!programId || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'programId, periodStart, and periodEnd are required' });
    }

    // Look up the program's channel
    const [program] = await query(
      `SELECT channel_id FROM incentive_programs WHERE id = $1`,
      [programId]
    );
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Fetch all active agents in that channel
    const agents = await query(
      `SELECT agent_code FROM ins_agents
       WHERE channel_id = $1 AND status = 'ACTIVE'
       ORDER BY hierarchy_level, agent_code`,
      [program.channel_id]
    );

    let successCount = 0;
    let errorCount = 0;
    let totalIncentivePool = 0;
    const errors = [];

    // Run calculation sequentially to avoid DB overload
    for (const agent of agents) {
      try {
        const result = await calculateAgentIncentive(
          agent.agent_code, programId, periodStart, periodEnd
        );
        totalIncentivePool += result.totalIncentive || 0;
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({ agentCode: agent.agent_code, error: err.message });
      }
    }

    res.json({
      programId,
      periodStart,
      periodEnd,
      totalAgents: agents.length,
      successCount,
      errorCount,
      totalIncentivePool,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/calculate/results:
 *   get:
 *     tags: [Calculations]
 *     summary: Get calculation results
 *     description: |
 *       Returns incentive result rows for the given program and calendar month,
 *       joined with user and channel details. Results are sorted by total_incentive
 *       descending to support leaderboard ranking.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: program_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Incentive program ID
 *         example: 10
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-\d{2}$
 *         description: Calendar month in YYYY-MM format
 *         example: "2025-01"
 *     responses:
 *       200:
 *         description: Array of incentive result rows
 *         content:
 *           application/json:
 *             example:
 *               - id: 501
 *                 user_id: 12
 *                 user_name: "Priya Sharma"
 *                 email: "priya.sharma@example.com"
 *                 channel_name: "Bancassurance"
 *                 program_id: 10
 *                 period_start: "2025-01-01"
 *                 total_incentive: 42500.00
 *                 base_incentive: 35000.00
 *                 team_rollup: 7500.00
 *               - id: 502
 *                 user_id: 7
 *                 user_name: "Ravi Patel"
 *                 email: "ravi.patel@example.com"
 *                 channel_name: "Agency"
 *                 program_id: 10
 *                 period_start: "2025-01-01"
 *                 total_incentive: 38200.00
 *                 base_incentive: 38200.00
 *                 team_rollup: 0
 *       400:
 *         description: Missing or invalid query parameters
 *         content:
 *           application/json:
 *             example:
 *               error: "program_id and period (YYYY-MM) are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/results', async (req, res) => {
  try {
    const { program_id, period } = req.query;
    if (!program_id || !period) {
      return res.status(400).json({ error: 'program_id and period (YYYY-MM) are required' });
    }

    const [year, month] = period.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'period must be YYYY-MM' });
    }
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;

    const rows = await query(
      `SELECT ir.*, u.name AS user_name, u.email, c.name AS channel_name
       FROM incentive_results ir
       LEFT JOIN users u ON u.id = ir.user_id
       LEFT JOIN channels c ON c.id = u.channel_id
       WHERE ir.program_id = $1 AND ir.period_start = $2
       ORDER BY ir.total_incentive DESC`,
      [program_id, periodStart]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/calculate/{programId}/{userId}/{period}:
 *   post:
 *     tags: [Calculations]
 *     summary: Calculate incentive for a single user
 *     description: |
 *       Runs the full incentive calculation engine for one user in a specific program
 *       and calendar month. The engine:
 *       1. Loads KPI definitions and milestones for the program
 *       2. Computes achievement percentages from performance data
 *       3. Determines milestone hits and evaluates qualifying gates
 *       4. Applies payout slabs (MULTIPLY / FLAT / PERCENTAGE_OF) with weight_pct and max_cap
 *       5. Computes team rollup from direct reportees' incentive_results
 *       6. Persists the result into incentive_results and returns the full breakdown
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Incentive program ID
 *         example: 10
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User / agent ID
 *         example: 12
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-\d{2}$
 *         description: Calendar month in YYYY-MM format
 *         example: "2025-01"
 *     responses:
 *       201:
 *         description: Full incentive breakdown
 *         content:
 *           application/json:
 *             example:
 *               userId: 12
 *               programId: 10
 *               periodStart: "2025-01-01"
 *               periodEnd: "2025-01-31"
 *               kpiResults:
 *                 - kpiId: 1
 *                   kpiName: "New Business Premium"
 *                   target: 500000
 *                   actual: 620000
 *                   achievement: 124.0
 *                   milestoneHit: "GOLD"
 *                 - kpiId: 2
 *                   kpiName: "Persistency Ratio"
 *                   target: 85
 *                   actual: 91.2
 *                   achievement: 107.3
 *                   milestoneHit: "SILVER"
 *               gatesCleared: true
 *               baseIncentive: 35000.00
 *               teamRollup: 7500.00
 *               totalIncentive: 42500.00
 *       400:
 *         description: Invalid period format
 *         content:
 *           application/json:
 *             example:
 *               error: "period must be YYYY-MM"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/:programId/:userId/:period', async (req, res) => {
  try {
    const { programId, userId, period } = req.params;

    // Derive period window from YYYY-MM
    const [year, month] = period.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'period must be YYYY-MM' });
    }
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10); // last day

    const result = await calculateIncentive(userId, programId, periodStart, periodEnd);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
