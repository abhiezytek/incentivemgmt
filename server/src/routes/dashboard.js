import express from 'express';
import { query } from '../db/pool.js';
const router = express.Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Dashboard summary
 *     description: >
 *       Returns a comprehensive dashboard payload with seven data sections:
 *       KPI totals, channel breakdown, product mix, top agents, active
 *       programs, pipeline status, and recent activity. All sections are
 *       optionally filtered by program ID and period.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema:
 *           type: integer
 *         description: Filter by incentive program ID
 *         example: 12
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by period start date
 *         example: "2025-01-01"
 *     responses:
 *       200:
 *         description: Dashboard summary with all data sections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kpi:
 *                   type: object
 *                   properties:
 *                     total_pool:
 *                       type: number
 *                     total_self:
 *                       type: number
 *                     total_override:
 *                       type: number
 *                     agent_count:
 *                       type: integer
 *                     paid_count:
 *                       type: integer
 *                     agents_below_gate:
 *                       type: integer
 *                     avg_achievement:
 *                       type: number
 *                     total_nb_premium:
 *                       type: number
 *                     nb_policy_count:
 *                       type: integer
 *                     total_target:
 *                       type: number
 *                     avg_persistency_13m:
 *                       type: number
 *                 channelBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       channel:
 *                         type: string
 *                       self_incentive:
 *                         type: number
 *                       override_incentive:
 *                         type: number
 *                       total_incentive:
 *                         type: number
 *                       agent_count:
 *                         type: integer
 *                 productMix:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product:
 *                         type: string
 *                       product_category:
 *                         type: string
 *                       premium:
 *                         type: number
 *                       policy_count:
 *                         type: integer
 *                 topAgents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       agent_code:
 *                         type: string
 *                       agent_name:
 *                         type: string
 *                       total_incentive:
 *                         type: number
 *                       nb_achievement_pct:
 *                         type: number
 *                 programs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                       channel:
 *                         type: string
 *                 pipelineStatus:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                       pool:
 *                         type: number
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       message:
 *                         type: string
 *                       time:
 *                         type: string
 *                       icon:
 *                         type: string
 *             example:
 *               kpi:
 *                 total_pool: 485000.00
 *                 total_self: 340000.00
 *                 total_override: 145000.00
 *                 agent_count: 80
 *                 paid_count: 52
 *                 agents_below_gate: 6
 *                 avg_achievement: 112.5
 *                 total_nb_premium: 25000000
 *                 nb_policy_count: 320
 *                 total_target: 22000000
 *                 avg_persistency_13m: 87.3
 *               channelBreakdown:
 *                 - channel: "Bancassurance"
 *                   self_incentive: 180000.00
 *                   override_incentive: 72000.00
 *                   total_incentive: 252000.00
 *                   agent_count: 42
 *                 - channel: "Agency"
 *                   self_incentive: 160000.00
 *                   override_incentive: 73000.00
 *                   total_incentive: 233000.00
 *                   agent_count: 38
 *               productMix:
 *                 - product: "Term Life Shield"
 *                   product_category: "Protection"
 *                   premium: 8500000
 *                   policy_count: 120
 *                 - product: "Savings Plus"
 *                   product_category: "Savings"
 *                   premium: 6200000
 *                   policy_count: 85
 *               topAgents:
 *                 - agent_code: "AGT-00451"
 *                   agent_name: "Priya Sharma"
 *                   total_incentive: 18500.00
 *                   nb_achievement_pct: 142.5
 *                 - agent_code: "AGT-00322"
 *                   agent_name: "Rajesh Kumar"
 *                   total_incentive: 15200.00
 *                   nb_achievement_pct: 128.0
 *               programs:
 *                 - id: 12
 *                   name: "Q1 2025 Life Sales"
 *                   start_date: "2025-01-01"
 *                   end_date: "2025-03-31"
 *                   status: "ACTIVE"
 *                   channel: "Bancassurance"
 *               pipelineStatus:
 *                 DRAFT:
 *                   count: 45
 *                   pool: 182500.00
 *                 APPROVED:
 *                   count: 30
 *                   pool: 125000.00
 *                 PAID:
 *                   count: 52
 *                   pool: 218000.00
 *               recentActivity:
 *                 - type: "calculation"
 *                   message: "Incentives calculated for 80 agents"
 *                   time: "15 Jan, 02:30 pm"
 *                   icon: "🧮"
 *                 - type: "approval"
 *                   message: "Bulk approved 30 agents"
 *                   time: "14 Jan, 11:00 am"
 *                   icon: "✅"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/summary', async (req, res) => {
  try {
    const { programId, period } = req.query;
    const pId   = programId || null;
    const pDate = period    || null;

    // ── 1. KPI Summary ──
    const kpiRes = await query(`
      SELECT
        SUM(r.total_incentive)          AS total_pool,
        SUM(r.net_self_incentive)       AS total_self,
        SUM(r.total_override)           AS total_override,
        COUNT(*)                        AS agent_count,
        COUNT(*) FILTER(WHERE r.status='PAID') AS paid_count,
        COUNT(*) FILTER(WHERE NOT r.persistency_gate_passed) AS agents_below_gate,
        AVG(k.nb_achievement_pct)       AS avg_achievement,
        SUM(k.nb_total_premium)         AS total_nb_premium,
        COUNT(k.nb_policy_count)        AS nb_policy_count,
        SUM(k.nb_target_premium)        AS total_target,
        AVG(k.persistency_13m)          AS avg_persistency_13m
      FROM ins_incentive_results r
      LEFT JOIN ins_agent_kpi_summary k
        ON k.agent_code = r.agent_code
       AND k.program_id = r.program_id
       AND k.period_start = r.period_start
      WHERE ($1::int  IS NULL OR r.program_id   = $1)
        AND ($2::date IS NULL OR r.period_start = $2)`,
    [pId, pDate]);

    // ── 2. Channel Breakdown ──
    const channelRes = await query(`
      SELECT
        c.name                          AS channel,
        SUM(r.net_self_incentive)       AS self_incentive,
        SUM(r.total_override)           AS override_incentive,
        SUM(r.total_incentive)          AS total_incentive,
        COUNT(*)                        AS agent_count
      FROM ins_incentive_results r
      JOIN ins_agents a ON a.agent_code = r.agent_code
      JOIN channels   c ON c.id = a.channel_id
      WHERE ($1::int  IS NULL OR r.program_id   = $1)
        AND ($2::date IS NULL OR r.period_start = $2)
      GROUP BY c.name
      ORDER BY total_incentive DESC`,
    [pId, pDate]);

    // ── 3. Product Mix ──
    const productRes = await query(`
      SELECT
        p.product_name    AS product,
        p.product_category,
        SUM(t.premium_amount) AS premium,
        COUNT(*)              AS policy_count
      FROM ins_policy_transactions t
      JOIN ins_products p ON p.product_code = t.product_code
      WHERE t.transaction_type = 'NEW_BUSINESS'
        AND ($1::int  IS NULL OR t.channel_id  = (
              SELECT channel_id FROM incentive_programs WHERE id=$1))
        AND ($2::date IS NULL OR t.paid_date  >= $2)
      GROUP BY p.product_name, p.product_category
      ORDER BY premium DESC`,
    [pId, pDate]);

    // ── 4. Top 5 Agents ──
    const topRes = await query(`
      SELECT r.agent_code, a.agent_name,
             r.total_incentive, r.net_self_incentive,
             k.nb_achievement_pct
      FROM ins_incentive_results r
      JOIN ins_agents a ON a.agent_code = r.agent_code
      LEFT JOIN ins_agent_kpi_summary k
        ON k.agent_code = r.agent_code
       AND k.program_id = r.program_id
       AND k.period_start = r.period_start
      WHERE ($1::int  IS NULL OR r.program_id   = $1)
        AND ($2::date IS NULL OR r.period_start = $2)
        AND r.status IN ('APPROVED','PAID','DRAFT')
      ORDER BY r.total_incentive DESC
      LIMIT 5`,
    [pId, pDate]);

    // ── 5. Active Programs ──
    const programsRes = await query(`
      SELECT ip.id, ip.name, ip.start_date, ip.end_date,
             ip.status, c.name AS channel
      FROM incentive_programs ip
      JOIN channels c ON c.id = ip.channel_id
      WHERE ip.status IN ('ACTIVE','DRAFT')
      ORDER BY ip.start_date DESC
      LIMIT 5`);

    // ── 6. Pipeline Status ──
    const pipelineRes = await query(`
      SELECT status,
             COUNT(*)              AS count,
             SUM(total_incentive)  AS pool
      FROM ins_incentive_results
      WHERE ($1::int  IS NULL OR program_id   = $1)
        AND ($2::date IS NULL OR period_start = $2)
      GROUP BY status`,
    [pId, pDate]);

    const pipelineStatus = {};
    pipelineRes.forEach(r => {
      pipelineStatus[r.status] = { count: Number(r.count), pool: Number(r.pool) };
    });

    // ── 7. Recent Activity (from audit log) ──
    const activityRes = await query(`
      SELECT 'calculation' AS type,
             'Incentives calculated for ' || COUNT(*) || ' agents' AS message,
             MAX(calculated_at) AS time,
             '🧮' AS icon
      FROM ins_incentive_results
      WHERE ($1::int IS NULL OR program_id=$1)
      GROUP BY DATE(calculated_at)
      UNION ALL
      SELECT 'approval', 'Bulk approved ' || COUNT(*) || ' agents',
             MAX(approved_at), '✅'
      FROM ins_incentive_results
      WHERE status IN ('APPROVED','PAID','INITIATED')
        AND ($1::int IS NULL OR program_id=$1)
      GROUP BY DATE(approved_at)
      UNION ALL
      SELECT 'payment', 'Payments processed for ' || COUNT(*) || ' agents',
             MAX(paid_at), '💸'
      FROM payout_disbursement_log
      GROUP BY DATE(paid_at)
      ORDER BY time DESC
      LIMIT 8`,
    [pId]);

    res.json({
      kpi:              kpiRes[0],
      channelBreakdown: channelRes,
      productMix:       productRes,
      topAgents:        topRes,
      programs:         programsRes,
      pipelineStatus,
      recentActivity:   activityRes.map(r => ({
        ...r,
        time: new Date(r.time).toLocaleString('en-IN', {
          day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
        })
      })),
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
