import { Router } from 'express';
import { query } from '../db/pool.js';
import { calculateIncentive } from '../engine/calculateIncentive.js';
import { calculateAgentIncentive } from '../engine/insuranceCalcEngine.js';

const router = Router();

/**
 * POST /calculate/run
 *
 * Accepts { programId, periodStart, periodEnd }.
 * Fetches all active agents in the program's channel, runs
 * calculateAgentIncentive() for each agent sequentially, and returns
 * summary counts and total incentive pool.
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
 * GET /calculate/results?program_id=&period=YYYY-MM
 *
 * Returns incentive_results rows joined with users for the given program and
 * period, ordered by total_incentive descending (for leaderboard ranking).
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
 * POST /calculate/:programId/:userId/:period
 *
 * period format: YYYY-MM  (uses first and last day of the month)
 *
 * Delegates to the calculateIncentive engine which:
 *  1. Loads KPI definitions + milestones for the program
 *  2. Loads performance data and computes achievement percentages
 *  3. Determines milestone hits, evaluates qualifying gates
 *  4. Computes payout slabs (MULTIPLY / FLAT / PERCENTAGE_OF) with weight_pct & max_cap
 *  5. Computes team rollup from direct reportees' incentive_results
 *  6. Persists into incentive_results and returns full breakdown
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
