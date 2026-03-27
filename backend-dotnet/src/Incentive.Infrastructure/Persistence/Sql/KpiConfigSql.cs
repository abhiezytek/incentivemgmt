namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the KPI Config endpoints.
/// Ported from server/src/routes/kpiConfig.js.
/// </summary>
public static class KpiConfigSql
{
    // ── Registry ──────────────────────────────────────

    public const string AllKpisWithProgramInfo = """
        SELECT kd.*,
               ip.name AS program_name, ip.status AS program_status,
               c.name AS channel_name
        FROM kpi_definitions kd
        LEFT JOIN incentive_programs ip ON ip.id = kd.program_id
        LEFT JOIN channels c ON c.id = ip.channel_id
        ORDER BY kd.program_id, kd.sort_order
        """;

    public const string AllMilestones = """
        SELECT km.* FROM kpi_milestones km
        ORDER BY km.kpi_id, km.sort_order
        """;

    public const string AllDerivedVariables = """
        SELECT * FROM derived_variables ORDER BY var_name
        """;

    // ── Validate ──────────────────────────────────────

    public const string KpiById = """
        SELECT * FROM kpi_definitions WHERE id = @id
        """;

    public const string ProgramStatusById = """
        SELECT id, status FROM incentive_programs WHERE id = @id
        """;

    public const string MilestonesByKpiId = """
        SELECT * FROM kpi_milestones WHERE kpi_id = @kpiId ORDER BY sort_order
        """;

    public const string PayoutSlabCountByKpiId = """
        SELECT COUNT(*)::int AS cnt FROM payout_slabs WHERE kpi_id = @kpiId
        """;

    // ── Summary ──────────────────────────────────────

    public const string KpiWithProgramInfo = """
        SELECT kd.*, ip.name AS program_name, ip.status AS program_status,
               c.name AS channel_name
        FROM kpi_definitions kd
        LEFT JOIN incentive_programs ip ON ip.id = kd.program_id
        LEFT JOIN channels c ON c.id = ip.channel_id
        WHERE kd.id = @id
        """;

    public const string PayoutSlabsByKpiId = """
        SELECT ps.*, pr.rule_name
        FROM payout_slabs ps
        JOIN payout_rules pr ON pr.id = ps.payout_rule_id
        WHERE ps.kpi_id = @kpiId
        ORDER BY ps.sort_order
        """;

    public const string QualifyingRulesByKpiId = """
        SELECT pqr.*, pr.rule_name
        FROM payout_qualifying_rules pqr
        JOIN payout_rules pr ON pr.id = pqr.payout_rule_id
        WHERE pqr.kpi_id = @kpiId
        """;
}
