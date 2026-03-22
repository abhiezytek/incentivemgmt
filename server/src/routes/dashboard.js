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

    /* ── KPI summary ── */
    const kpiRows = await query(
      `SELECT
         COALESCE(SUM(r.final_incentive), 0)                       AS total_pool,
         COUNT(*) FILTER (WHERE r.status = 'PAID')                 AS paid_count,
         COALESCE(SUM(r.nb_premium), 0)                            AS total_nb_premium,
         COUNT(DISTINCT r.policy_number)                            AS nb_policy_count,
         CASE WHEN SUM(r.target_premium) > 0
              THEN ROUND(SUM(r.nb_premium) / SUM(r.target_premium) * 100, 1)
              ELSE 0 END                                            AS avg_achievement,
         COALESCE(SUM(r.target_premium), 0)                        AS total_target,
         ROUND(AVG(r.persistency_13m)::numeric, 1)                 AS avg_persistency_13m,
         COUNT(*) FILTER (WHERE r.persistency_gate_passed = FALSE) AS agents_below_gate
       FROM ins_incentive_results r
       ${where}`,
      params,
    );

    const kpi = kpiRows[0] || {};

    /* ── Channel breakdown ── */
    const channelBreakdown = await query(
      `SELECT
         COALESCE(c.name, 'Unknown')          AS channel,
         COALESCE(SUM(r.self_incentive), 0)   AS self_incentive,
         COALESCE(SUM(r.override_incentive), 0) AS override_incentive
       FROM ins_incentive_results r
       LEFT JOIN channels c ON c.id = r.channel_id
       ${where}
       GROUP BY c.name
       ORDER BY SUM(r.final_incentive) DESC
       LIMIT 5`,
      params,
    );

    /* ── Product mix ── */
    const productMix = await query(
      `SELECT
         COALESCE(p.product_name, r.product_code, 'Other') AS product,
         COALESCE(SUM(r.nb_premium), 0)                    AS premium
       FROM ins_incentive_results r
       LEFT JOIN ins_products p ON p.product_code = r.product_code
       ${where}
       GROUP BY COALESCE(p.product_name, r.product_code, 'Other')
       ORDER BY premium DESC
       LIMIT 5`,
      params,
    );

    /* ── Top 5 agents ── */
    const topAgents = await query(
      `SELECT
         r.agent_code,
         COALESCE(a.agent_name, r.agent_code) AS agent_name,
         SUM(r.final_incentive)                AS total_incentive
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
       FROM ins_programs pg
       LEFT JOIN channels c ON c.id = pg.channel_id
       ORDER BY pg.created_at DESC
       LIMIT 5`,
    );

    /* ── Pipeline status ── */
    const pipelineRows = await query(
      `SELECT
         r.status,
         COUNT(*)                      AS count,
         COALESCE(SUM(r.final_incentive), 0) AS amount
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

    /* ── Recent activity (last 10 status changes) ── */
    const activityRows = await query(
      `SELECT
         r.agent_code,
         r.status,
         r.updated_at
       FROM ins_incentive_results r
       ${where}
       ORDER BY r.updated_at DESC
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
      time:    a.updated_at
        ? new Date(a.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '',
    }));

    res.json({
      kpi: {
        total_pool:          Number(kpi.total_pool          || 0),
        paid_count:          Number(kpi.paid_count          || 0),
        total_nb_premium:    Number(kpi.total_nb_premium    || 0),
        nb_policy_count:     Number(kpi.nb_policy_count     || 0),
        avg_achievement:     Number(kpi.avg_achievement     || 0),
        total_target:        Number(kpi.total_target        || 0),
        avg_persistency_13m: Number(kpi.avg_persistency_13m || 0),
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
