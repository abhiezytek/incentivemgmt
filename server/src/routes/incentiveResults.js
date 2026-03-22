import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

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
 * POST /api/incentive-results/:id/approve
 *
 * Move a result from DRAFT → APPROVED.
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_at = NOW()
       WHERE id = $1 AND status = 'DRAFT'
       RETURNING id, status`,
      [id]
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
