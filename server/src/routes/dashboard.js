import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/dashboard/summary?programId=&period=
 *
 * Returns aggregated dashboard data:
 *  kpi, channelBreakdown, productMix, topAgents, programs, recentActivity, pipelineStatus
 */
router.get('/summary', async (req, res) => {
  try {
    const { programId, period } = req.query;

    /* ── WHERE fragments (parameterised) ── */
    const conditions = [];
    const params     = [];
    let idx = 1;

    if (programId) {
      conditions.push(`r.program_id = $${idx++}`);
      params.push(Number(programId));
    }
    if (period) {
      conditions.push(`r.period_start = $${idx++}`);
      params.push(period);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    /* matching conditions scoped to kpi summary table */
    const kConditions = [];
    const kParams     = [];
    let kIdx = 1;
    if (programId) {
      kConditions.push(`k.program_id = $${kIdx++}`);
      kParams.push(Number(programId));
    }
    if (period) {
      kConditions.push(`k.period_start = $${kIdx++}`);
      kParams.push(period);
    }
    const kWhere = kConditions.length
      ? `WHERE ${kConditions.join(' AND ')}`
      : '';

    /* ── KPI summary ── */
    const kpiRows = await query(
      `SELECT
         COALESCE(SUM(r.total_incentive), 0)                       AS total_pool,
         COUNT(*) FILTER (WHERE r.status = 'PAID')                 AS paid_count,
         COUNT(*) FILTER (WHERE r.persistency_gate_passed = FALSE) AS agents_below_gate
       FROM ins_incentive_results r
       ${where}`,
      params,
    );

    /* NB premium & achievement from the KPI summary table */
    const kpiNbRows = await query(
      `SELECT
         COALESCE(SUM(k.nb_total_premium), 0) AS total_nb_premium,
         COALESCE(SUM(k.nb_policy_count), 0)  AS nb_policy_count,
         COALESCE(SUM(k.nb_target_premium), 0) AS total_target,
         CASE WHEN SUM(k.nb_target_premium) > 0
              THEN ROUND(SUM(k.nb_total_premium) / SUM(k.nb_target_premium) * 100, 1)
              ELSE 0 END                        AS avg_achievement,
         ROUND(AVG(k.persistency_13m)::numeric, 1) AS avg_persistency_13m
       FROM ins_agent_kpi_summary k
       ${kWhere}`,
      kParams,
    );

    const kpi   = kpiRows[0] || {};
    const kpiNb = kpiNbRows[0] || {};

    /* ── Channel breakdown (join through ins_agents to get channel_id) ── */
    const channelBreakdown = await query(
      `SELECT
         COALESCE(c.name, 'Unknown')               AS channel,
         COALESCE(SUM(r.net_self_incentive), 0)    AS self_incentive,
         COALESCE(SUM(r.total_override), 0)        AS override_incentive
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       LEFT JOIN channels c  ON c.id = a.channel_id
       ${where}
       GROUP BY c.name
       ORDER BY SUM(r.total_incentive) DESC
       LIMIT 5`,
      params,
    );

    /* ── Product mix (from policy transactions) ── */
    const ptConditions = [];
    const ptParams     = [];
    let ptIdx = 1;
    if (period) {
      ptConditions.push(`pt.issue_date >= $${ptIdx++}`);
      ptParams.push(period);
    }
    const ptWhere = ptConditions.length
      ? `WHERE pt.transaction_type = 'NEW_BUSINESS' AND ${ptConditions.join(' AND ')}`
      : `WHERE pt.transaction_type = 'NEW_BUSINESS'`;

    const productMix = await query(
      `SELECT
         COALESCE(p.product_name, pt.product_code, 'Other') AS product,
         COALESCE(SUM(pt.premium_amount), 0)                AS premium
       FROM ins_policy_transactions pt
       LEFT JOIN ins_products p ON p.product_code = pt.product_code
       ${ptWhere}
       GROUP BY COALESCE(p.product_name, pt.product_code, 'Other')
       ORDER BY premium DESC
       LIMIT 5`,
      ptParams,
    );

    /* ── Top 5 agents ── */
    const topAgents = await query(
      `SELECT
         r.agent_code,
         COALESCE(a.agent_name, r.agent_code) AS agent_name,
         SUM(r.total_incentive)                AS total_incentive
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       ${where}
       GROUP BY r.agent_code, a.agent_name
       ORDER BY total_incentive DESC
       LIMIT 5`,
      params,
    );

    /* ── Programs list ── */
    const programs = await query(
      `SELECT
         pg.id,
         pg.name,
         pg.status,
         TO_CHAR(pg.start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(pg.end_date,   'YYYY-MM-DD') AS end_date,
         COALESCE(c.name, '')                  AS channel
       FROM incentive_programs pg
       LEFT JOIN channels c ON c.id = pg.channel_id
       ORDER BY pg.created_at DESC
       LIMIT 5`,
    );

    /* ── Pipeline status ── */
    const pipelineRows = await query(
      `SELECT
         r.status,
         COUNT(*)                             AS count,
         COALESCE(SUM(r.total_incentive), 0) AS amount
       FROM ins_incentive_results r
       ${where}
       GROUP BY r.status`,
      params,
    );

    const pipelineStatus = {};
    for (const row of pipelineRows) {
      pipelineStatus[row.status] = {
        count:  Number(row.count),
        amount: Number(row.amount),
      };
    }

    /* ── Recent activity (last 10 results by calculated/approved time) ── */
    const activityRows = await query(
      `SELECT
         r.agent_code,
         r.status,
         COALESCE(r.approved_at, r.calculated_at) AS activity_at
       FROM ins_incentive_results r
       ${where}
       ORDER BY COALESCE(r.approved_at, r.calculated_at) DESC
       LIMIT 10`,
      params,
    );

    const ACTIVITY_ICONS = {
      DRAFT:     '📊',
      APPROVED:  '✅',
      INITIATED: '💳',
      PAID:      '🎉',
    };

    const recentActivity = activityRows.map((a) => ({
      icon:    ACTIVITY_ICONS[a.status] || '📌',
      message: `${a.agent_code} → ${a.status}`,
      time:    a.activity_at
        ? new Date(a.activity_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '',
    }));

    res.json({
      kpi: {
        total_pool:          Number(kpi.total_pool          || 0),
        paid_count:          Number(kpi.paid_count          || 0),
        total_nb_premium:    Number(kpiNb.total_nb_premium  || 0),
        nb_policy_count:     Number(kpiNb.nb_policy_count   || 0),
        avg_achievement:     Number(kpiNb.avg_achievement   || 0),
        total_target:        Number(kpiNb.total_target      || 0),
        avg_persistency_13m: Number(kpiNb.avg_persistency_13m || 0),
        agents_below_gate:   Number(kpi.agents_below_gate   || 0),
        pool_growth:         null,
        nb_growth:           null,
        achievement_trend:   null,
        persistency_trend:   null,
      },
      channelBreakdown,
      productMix,
      topAgents,
      programs,
      recentActivity,
      pipelineStatus,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
