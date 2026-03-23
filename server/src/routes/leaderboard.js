import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     tags:
 *       - Leaderboard
 *     summary: Ranked agents by incentive
 *     description: >
 *       Returns agents ranked by total incentive for a given program and
 *       period, along with a summary object containing aggregate stats.
 *       Optionally filter by distribution channel and region.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Incentive program ID
 *         example: 12
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Incentive period start date
 *         example: "2025-01-01"
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filter by channel code
 *         example: "BANCA"
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region code
 *         example: "WEST"
 *     responses:
 *       200:
 *         description: Ranked agent list with summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       agent_code:
 *                         type: string
 *                       agent_name:
 *                         type: string
 *                       channel:
 *                         type: string
 *                       region:
 *                         type: string
 *                       total_incentive:
 *                         type: number
 *                       nb_achievement_pct:
 *                         type: number
 *                       persistency_13m:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_pool:
 *                       type: number
 *                     agent_count:
 *                       type: integer
 *                     avg_incentive:
 *                       type: number
 *                     top_earner:
 *                       type: string
 *             example:
 *               agents:
 *                 - agent_code: "AGT-00451"
 *                   agent_name: "Priya Sharma"
 *                   channel: "Bancassurance"
 *                   region: "West"
 *                   total_incentive: 18500.00
 *                   nb_achievement_pct: 142.5
 *                   persistency_13m: 88.2
 *                 - agent_code: "AGT-00322"
 *                   agent_name: "Rajesh Kumar"
 *                   channel: "Agency"
 *                   region: "North"
 *                   total_incentive: 15200.00
 *                   nb_achievement_pct: 128.0
 *                   persistency_13m: 91.5
 *               summary:
 *                 total_pool: 485000.00
 *                 agent_count: 80
 *                 avg_incentive: 6062.50
 *                 top_earner: "Priya Sharma"
 *       400:
 *         description: Missing required query parameters
 *         content:
 *           application/json:
 *             example:
 *               error: "programId and period are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
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
