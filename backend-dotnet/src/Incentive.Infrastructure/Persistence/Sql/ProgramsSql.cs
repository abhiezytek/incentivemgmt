namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the programs endpoints.
/// Ported from server/src/routes/programs.js.
/// </summary>
public static class ProgramsSql
{
    // ── Preview (Wave 1) ──────────────────────────────

    public const string ChannelById = """
        SELECT name, code FROM channels WHERE id = @channelId
        """;

    public const string KpisWithMilestones = """
        SELECT kd.*, json_agg(km.* ORDER BY km.sort_order) AS milestones
        FROM kpi_definitions kd
        LEFT JOIN kpi_milestones km ON km.kpi_id = kd.id
        WHERE kd.program_id = @programId
        GROUP BY kd.id
        ORDER BY kd.sort_order
        """;

    public const string PayoutRulesWithSlabs = """
        SELECT pr.*, json_agg(ps.* ORDER BY ps.sort_order) AS slabs
        FROM payout_rules pr
        LEFT JOIN payout_slabs ps ON ps.payout_rule_id = pr.id
        WHERE pr.program_id = @programId
        GROUP BY pr.id
        """;

    public const string QualifyingRules = """
        SELECT pqr.*, pr.rule_name, kd.kpi_name
        FROM payout_qualifying_rules pqr
        JOIN payout_rules pr ON pr.id = pqr.payout_rule_id
        LEFT JOIN kpi_definitions kd ON kd.id = pqr.kpi_id
        WHERE pr.program_id = @programId
        """;

    public const string ActiveAgentCount = """
        SELECT COUNT(*)::int AS cnt FROM ins_agents
        WHERE channel_id = @channelId AND status = 'ACTIVE'
        """;

    public const string ResultStatsByProgram = """
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
        FROM ins_incentive_results WHERE program_id = @programId
        GROUP BY status
        """;

    // ── Summary (Wave 2) ──────────────────────────────

    public const string KpiCountByProgram = """
        SELECT COUNT(*)::int AS count FROM kpi_definitions WHERE program_id = @programId
        """;

    public const string PayoutRuleCountByProgram = """
        SELECT COUNT(*)::int AS count FROM payout_rules WHERE program_id = @programId
        """;

    /// <summary>
    /// Node.js uses 'users' table for agent count in summary. Preview uses ins_agents.
    /// Preserving the Node behavior exactly.
    /// </summary>
    public const string AgentCountByChannel = """
        SELECT COUNT(*)::int AS count FROM users WHERE channel_id = @channelId AND is_active = TRUE
        """;

    public const string ResultCountByProgram = """
        SELECT COUNT(*)::int AS count FROM incentive_results WHERE program_id = @programId
        """;

    // ── Status validation (Wave 2) ────────────────────

    public const string OverlappingActivePrograms = """
        SELECT id FROM incentive_programs
        WHERE channel_id = @channelId AND status = 'ACTIVE'
          AND id != @programId
          AND (start_date, end_date) OVERLAPS (@startDate, @endDate)
        """;
}
