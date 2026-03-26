import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/dashboard/executive-summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Executive summary for the redesigned dashboard
 *     description: >
 *       Returns KPI cards, alerts, channel performance, and recent activity
 *       in a single payload optimised for the new dashboard layout. Reuses
 *       existing queries from the dashboard/summary endpoint with additional
 *       exception and notification counts.
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema: { type: integer }
 *       - in: query
 *         name: period
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Executive summary payload
 */
router.get('/executive-summary', async (req, res) => {
  try {
    const { programId, period } = req.query;
    const pId   = programId || null;
    const pDate = period    || null;

    // Active schemes count
    const schemesRes = await query(
      `SELECT COUNT(*)::int AS active_schemes
       FROM incentive_programs WHERE status = 'ACTIVE'`
    );

    // Pipeline summary
    const pipelineRes = await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
       FROM ins_incentive_results
       WHERE ($1::int IS NULL OR program_id = $1)
         AND ($2::date IS NULL OR period_start = $2)
       GROUP BY status`,
      [pId, pDate]
    );
    const pipeline = {};
    for (const r of pipelineRes) {
      pipeline[r.status] = { count: r.count, total: Number(r.total) };
    }

    // Total calculated
    const totalsRes = await query(
      `SELECT COALESCE(SUM(total_incentive), 0) AS total_calculated,
              COUNT(*)::int AS total_records
       FROM ins_incentive_results
       WHERE ($1::int IS NULL OR program_id = $1)
         AND ($2::date IS NULL OR period_start = $2)`,
      [pId, pDate]
    );

    // Pending approvals
    const pendingRes = await query(
      `SELECT COUNT(*)::int AS pending
       FROM ins_incentive_results
       WHERE status = 'DRAFT'
         AND ($1::int IS NULL OR program_id = $1)
         AND ($2::date IS NULL OR period_start = $2)`,
      [pId, pDate]
    );

    // Open exceptions count
    let openExceptions = 0;
    try {
      const excRes = await query(
        `SELECT COUNT(*)::int AS cnt FROM operational_exceptions WHERE status = 'OPEN'`
      );
      openExceptions = excRes[0]?.cnt || 0;
    } catch {
      // Table may not exist yet
    }

    // Unread notifications count
    let unreadNotifications = 0;
    try {
      const notifRes = await query(
        `SELECT COUNT(*)::int AS cnt FROM notification_events WHERE is_read = FALSE`
      );
      unreadNotifications = notifRes[0]?.cnt || 0;
    } catch {
      // Table may not exist yet
    }

    // Channel performance
    const channelRes = await query(
      `SELECT c.name AS channel,
              SUM(r.net_self_incentive) AS self_incentive,
              SUM(r.total_override) AS override_incentive,
              SUM(r.total_incentive) AS total_incentive,
              COUNT(*)::int AS agent_count
       FROM ins_incentive_results r
       JOIN ins_agents a ON a.agent_code = r.agent_code
       JOIN channels c ON c.id = a.channel_id
       WHERE ($1::int IS NULL OR r.program_id = $1)
         AND ($2::date IS NULL OR r.period_start = $2)
       GROUP BY c.name
       ORDER BY total_incentive DESC`,
      [pId, pDate]
    );

    // Recent activity (from audit + calculation events)
    const activityRes = await query(
      `SELECT 'calculation' AS type,
              'Incentives calculated for ' || COUNT(*) || ' agents' AS message,
              MAX(calculated_at) AS time, '🧮' AS icon
       FROM ins_incentive_results
       WHERE ($1::int IS NULL OR program_id = $1)
       GROUP BY DATE(calculated_at)
       UNION ALL
       SELECT 'approval', 'Bulk approved ' || COUNT(*) || ' agents',
              MAX(approved_at), '✅'
       FROM ins_incentive_results
       WHERE status IN ('APPROVED','PAID','INITIATED')
         AND ($1::int IS NULL OR program_id = $1)
       GROUP BY DATE(approved_at)
       ORDER BY time DESC NULLS LAST
       LIMIT 8`,
      [pId]
    );

    res.json({
      kpiCards: {
        activeSchemes:     schemesRes[0]?.active_schemes || 0,
        processingPayouts: pipeline.INITIATED?.count || 0,
        pendingApprovals:  pendingRes[0]?.pending || 0,
        netPayout:         Number(totalsRes[0]?.total_calculated || 0),
        totalRecords:      totalsRes[0]?.total_records || 0,
      },
      alerts: {
        openExceptions,
        unreadNotifications,
      },
      pipeline,
      channelPerformance: channelRes,
      recentActivity: activityRes.map(r => ({
        ...r,
        time: r.time ? new Date(r.time).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        }) : null,
      })),
      lastSync: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
