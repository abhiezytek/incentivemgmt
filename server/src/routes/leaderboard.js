import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/leaderboard
 *
 * Ranked agents by total incentive for a given program + period.
 * Query params: programId (required), period (required), channel, region
 *
 * Returns { agents: [...], summary: { total_pool, agent_count, avg_incentive, top_earner } }
 */
router.get('/', async (req, res) => {
  try {
    const { programId, period, channel, region } = req.query;

    if (!programId || !period) {
      return res.status(400).json({ error: 'programId and period are required' });
    }

    const agents = await query(
      `SELECT r.*,
              a.agent_name, a.agent_code, a.hierarchy_level,
              c.name AS channel, rg.region_name AS region,
              k.nb_total_premium, k.nb_achievement_pct,
              k.persistency_13m, k.persistency_25m, k.collection_pct
       FROM ins_incentive_results r
       JOIN ins_agents a ON a.agent_code = r.agent_code
       JOIN channels c ON c.id = a.channel_id
       LEFT JOIN ins_regions rg ON rg.id = a.region_id
       LEFT JOIN ins_agent_kpi_summary k
         ON k.agent_code = r.agent_code
         AND k.program_id = r.program_id
         AND k.period_start = r.period_start
       WHERE r.program_id = $1
         AND r.period_start = $2
         AND ($3::text IS NULL OR c.code = $3)
         AND ($4::text IS NULL OR rg.region_code = $4)
         AND r.status IN ('DRAFT','APPROVED','INITIATED','PAID')
       ORDER BY r.total_incentive DESC`,
      [programId, period, channel || null, region || null]
    );

    let summary = null;
    if (agents.length > 0) {
      const totalPool = agents.reduce((s, r) => s + Number(r.total_incentive || 0), 0);
      summary = {
        total_pool: totalPool,
        agent_count: agents.length,
        avg_incentive: totalPool / agents.length,
        top_earner: agents[0].agent_name || agents[0].agent_code,
      };
    }

    res.json({ agents, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
