import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/incentive-results/stage-summary
 *
 * Returns counts of results grouped by status for the pipeline view.
 * Query: programId, periodStart (both optional)
 */
router.get('/stage-summary', async (req, res) => {
  try {
    const { programId, periodStart } = req.query;
    const conditions = [];
    const params = [];
    if (programId) { params.push(programId); conditions.push(`program_id = $${params.length}`); }
    if (periodStart) { params.push(periodStart); conditions.push(`period_start = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
       FROM ins_incentive_results ${where}
       GROUP BY status`,
      params
    );

    const summary = {};
    for (const r of rows) {
      summary[r.status] = { count: r.count, total: Number(r.total) };
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/incentive-results/summary
 *
 * Aggregate totals by channel for a given program + period.
 * Query: programId (required), periodStart (required)
 */
router.get('/summary', async (req, res) => {
  try {
    const { programId, periodStart } = req.query;
    if (!programId || !periodStart) {
      return res.status(400).json({ error: 'programId and periodStart are required' });
    }

    const rows = await query(
      `SELECT c.name AS channel,
              COUNT(*)::int AS agent_count,
              SUM(r.total_incentive) AS total_pool,
              AVG(r.total_incentive) AS avg_incentive,
              SUM(CASE WHEN r.status = 'PAID' THEN 1 ELSE 0 END)::int AS paid_count
       FROM ins_incentive_results r
       JOIN ins_agents a ON a.agent_code = r.agent_code
       JOIN channels c ON c.id = a.channel_id
       WHERE r.program_id = $1 AND r.period_start = $2
       GROUP BY c.name
       ORDER BY total_pool DESC`,
      [programId, periodStart]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/incentive-results
 *
 * List incentive results with optional filters:
 *   programId, periodStart, channel, region, status
 */
router.get('/', async (req, res) => {
  try {
    const { programId, periodStart, channel, region, status } = req.query;

    const conditions = [];
    const params = [];

    if (programId) {
      params.push(programId);
      conditions.push(`r.program_id = $${params.length}`);
    }
    if (periodStart) {
      params.push(periodStart);
      conditions.push(`r.period_start = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (channel) {
      params.push(channel);
      conditions.push(`a.channel_id = $${params.length}`);
    }
    if (region) {
      params.push(region);
      conditions.push(`a.region_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT r.*,
              a.agent_name, c.name AS channel_name, rg.region_code AS region_name,
              p.name AS program_name
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       LEFT JOIN channels c ON c.id = a.channel_id
       LEFT JOIN ins_regions rg ON rg.id = a.region_id
       LEFT JOIN incentive_programs p ON p.id = r.program_id
       ${where}
       ORDER BY r.total_incentive DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incentive-results/bulk-approve
 *
 * Approve all DRAFT results for a given program + period
 * that have passed the persistency gate.
 * Body: { programId, periodStart, approvedBy }
 */
router.post('/bulk-approve', async (req, res) => {
  try {
    const { programId, periodStart, approvedBy } = req.body;
    if (!programId || !periodStart) {
      return res.status(400).json({ error: 'programId and periodStart are required' });
    }

    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE program_id = $2 AND period_start = $3
         AND status = 'DRAFT' AND persistency_gate_passed = TRUE
       RETURNING id`,
      [approvedBy || null, programId, periodStart]
    );

    res.json({ success: true, approvedCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incentive-results/mark-paid
 *
 * Move all APPROVED results to PAID for a given program + period.
 * Body: { programId, periodStart }
 */
router.post('/mark-paid', async (req, res) => {
  try {
    const { programId, periodStart } = req.body;
    if (!programId || !periodStart) {
      return res.status(400).json({ error: 'programId and periodStart are required' });
    }

    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'PAID'
       WHERE program_id = $1 AND period_start = $2 AND status = 'APPROVED'
       RETURNING id`,
      [programId, periodStart]
    );

    res.json({ success: true, paidCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incentive-results/:id/approve
 *
 * Move a single result from DRAFT → APPROVED.
 * Body (optional): { approvedBy }
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body || {};
    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_by = $2, approved_at = NOW()
       WHERE id = $1 AND status = 'DRAFT'
       RETURNING id, status`,
      [id, approvedBy || null]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Result not found or already approved' });
    }

    res.json({ success: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
