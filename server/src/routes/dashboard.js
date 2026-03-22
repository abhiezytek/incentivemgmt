import express from 'express';
import { query } from '../db/pool.js';
const router = express.Router();

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
