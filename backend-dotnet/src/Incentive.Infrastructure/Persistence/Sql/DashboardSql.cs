namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the dashboard/executive-summary endpoint.
/// Ported from server/src/routes/executiveSummary.js.
/// </summary>
public static class DashboardSql
{
    public const string ActiveSchemes = """
        SELECT COUNT(*)::int AS active_schemes
        FROM incentive_programs WHERE status = 'ACTIVE'
        """;

    public const string PipelineSummary = """
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
        FROM ins_incentive_results
        WHERE (@programId::int IS NULL OR program_id = @programId)
          AND (@period::date IS NULL OR period_start = @period)
        GROUP BY status
        """;

    public const string TotalCalculated = """
        SELECT COALESCE(SUM(total_incentive), 0) AS total_calculated,
               COUNT(*)::int AS total_records
        FROM ins_incentive_results
        WHERE (@programId::int IS NULL OR program_id = @programId)
          AND (@period::date IS NULL OR period_start = @period)
        """;

    public const string PendingApprovals = """
        SELECT COUNT(*)::int AS pending
        FROM ins_incentive_results
        WHERE status = 'DRAFT'
          AND (@programId::int IS NULL OR program_id = @programId)
          AND (@period::date IS NULL OR period_start = @period)
        """;

    public const string OpenExceptions = """
        SELECT COUNT(*)::int AS cnt FROM operational_exceptions WHERE status = 'OPEN'
        """;

    public const string UnreadNotifications = """
        SELECT COUNT(*)::int AS cnt FROM notification_events WHERE is_read = FALSE
        """;

    public const string ChannelPerformance = """
        SELECT c.name AS channel,
               SUM(r.net_self_incentive) AS self_incentive,
               SUM(r.total_override) AS override_incentive,
               SUM(r.total_incentive) AS total_incentive,
               COUNT(*)::int AS agent_count
        FROM ins_incentive_results r
        JOIN ins_agents a ON a.agent_code = r.agent_code
        JOIN channels c ON c.id = a.channel_id
        WHERE (@programId::int IS NULL OR r.program_id = @programId)
          AND (@period::date IS NULL OR r.period_start = @period)
        GROUP BY c.name
        ORDER BY total_incentive DESC
        """;

    public const string RecentActivity = """
        SELECT 'calculation' AS type,
               'Incentives calculated for ' || COUNT(*) || ' agents' AS message,
               MAX(calculated_at) AS time, '🧮' AS icon
        FROM ins_incentive_results
        WHERE (@programId::int IS NULL OR program_id = @programId)
        GROUP BY DATE(calculated_at)
        UNION ALL
        SELECT 'approval', 'Bulk approved ' || COUNT(*) || ' agents',
               MAX(approved_at), '✅'
        FROM ins_incentive_results
        WHERE status IN ('APPROVED','PAID','INITIATED')
          AND (@programId::int IS NULL OR program_id = @programId)
        GROUP BY DATE(approved_at)
        ORDER BY time DESC NULLS LAST
        LIMIT 8
        """;
}
