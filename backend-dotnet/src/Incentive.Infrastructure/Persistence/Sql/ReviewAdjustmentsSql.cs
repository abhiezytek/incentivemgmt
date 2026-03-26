namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for review adjustment endpoints.
/// Ported from server/src/routes/reviewAdjustments.js.
/// Additive design: adjustments and audit trail are stored in separate tables,
/// never modifying original calculated values in ins_incentive_results.
/// </summary>
public static class ReviewAdjustmentsSql
{
    // ── List (GET /) ──────────────────────────────────

    /// <summary>
    /// Paginated list of incentive results enriched with aggregated adjustments.
    /// Uses LATERAL JOIN for per-row adjustment aggregation (matches Node.js exactly).
    /// Dynamic WHERE appended before ORDER BY via string interpolation.
    /// </summary>
    public const string ListResults = """
        SELECT r.id, r.agent_code, r.program_id, r.period_start, r.period_end,
               r.total_incentive AS calculated,
               r.net_self_incentive, r.total_override,
               r.status, r.persistency_gate_passed,
               a.agent_name, c.name AS channel_name, rg.region_code AS region_name,
               p.name AS program_name,
               COALESCE(adj.total_adjustment, 0) AS adjustment,
               COALESCE(adj.hold_count, 0) AS hold_count,
               r.total_incentive + COALESCE(adj.total_adjustment, 0) AS total_payout
        FROM ins_incentive_results r
        LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
        LEFT JOIN channels c ON c.id = a.channel_id
        LEFT JOIN ins_regions rg ON rg.id = a.region_id
        LEFT JOIN incentive_programs p ON p.id = r.program_id
        LEFT JOIN LATERAL (
          SELECT SUM(CASE WHEN adjustment_type NOT IN ('HOLD','RELEASE') THEN adjustment_amount ELSE 0 END) AS total_adjustment,
                 COUNT(*) FILTER(WHERE adjustment_type = 'HOLD') -
                 COUNT(*) FILTER(WHERE adjustment_type = 'RELEASE') AS hold_count
          FROM incentive_adjustments WHERE result_id = r.id
        ) adj ON true
        """;

    /// <summary>
    /// Summary cards query (unfiltered for cards, but uses same WHERE for filtered results).
    /// Dynamic WHERE appended via string interpolation.
    /// </summary>
    public const string SummaryCards = """
        SELECT
          SUM(r.total_incentive) AS total_calculated,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM incentive_adjustments h
            WHERE h.result_id = r.id AND h.adjustment_type = 'HOLD'
              AND NOT EXISTS (
                SELECT 1 FROM incentive_adjustments rel
                WHERE rel.result_id = r.id AND rel.adjustment_type = 'RELEASE'
                  AND rel.created_at > h.created_at
              )
          ) THEN r.total_incentive ELSE 0 END) AS total_held,
          COALESCE((SELECT SUM(adjustment_amount) FROM incentive_adjustments
            WHERE adjustment_type NOT IN ('HOLD','RELEASE')), 0) AS total_adjustments,
          SUM(r.total_incentive) +
            COALESCE((SELECT SUM(adjustment_amount) FROM incentive_adjustments
              WHERE adjustment_type NOT IN ('HOLD','RELEASE')), 0) AS net_payout,
          COUNT(*)::int AS total_count
        FROM ins_incentive_results r
        LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
        """;

    // ── Detail (GET /:id) ─────────────────────────────

    public const string ResultDetail = """
        SELECT r.*,
               a.agent_name, a.branch_code, a.hierarchy_level,
               c.name AS channel_name, rg.region_code AS region_name,
               p.name AS program_name,
               k.nb_achievement_pct, k.nb_total_premium, k.persistency_13m,
               k.nb_policy_count, k.nb_target_premium
        FROM ins_incentive_results r
        LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
        LEFT JOIN channels c ON c.id = a.channel_id
        LEFT JOIN ins_regions rg ON rg.id = a.region_id
        LEFT JOIN incentive_programs p ON p.id = r.program_id
        LEFT JOIN ins_agent_kpi_summary k
          ON k.agent_code = r.agent_code AND k.program_id = r.program_id AND k.period_start = r.period_start
        WHERE r.id = @id
        """;

    public const string AdjustmentsByResultId = """
        SELECT * FROM incentive_adjustments WHERE result_id = @resultId ORDER BY created_at DESC
        """;

    public const string AuditTrailByResultId = """
        SELECT * FROM incentive_review_actions WHERE result_id = @resultId ORDER BY created_at DESC
        """;

    // ── Result existence check ────────────────────────

    public const string ResultStatusById = """
        SELECT id, status FROM ins_incentive_results WHERE id = @id
        """;

    public const string ResultExistsById = """
        SELECT id FROM ins_incentive_results WHERE id = @id
        """;

    // ── Adjust (POST /:id/adjust) ─────────────────────

    public const string InsertAdjustment = """
        INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by, notes)
        VALUES (@resultId, @amount, 'MANUAL', @reason, @createdBy, @notes)
        RETURNING *
        """;

    // ── Hold (POST /:id/hold) ─────────────────────────

    public const string InsertHold = """
        INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
        VALUES (@resultId, 0, 'HOLD', @reason, @createdBy)
        """;

    // ── Release (POST /:id/release) ───────────────────

    public const string InsertRelease = """
        INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
        VALUES (@resultId, 0, 'RELEASE', 'Hold released', @createdBy)
        """;

    // ── Audit Trail Insert ────────────────────────────

    public const string InsertAuditAction = """
        INSERT INTO incentive_review_actions (result_id, action, actor, details)
        VALUES (@resultId, @action, @actor, @details::jsonb)
        """;

    // ── Batch Approve (POST /batch-approve) ───────────

    public const string HeldResultIds = """
        SELECT DISTINCT result_id FROM incentive_adjustments
        WHERE result_id = ANY(@ids) AND adjustment_type = 'HOLD'
          AND NOT EXISTS (
            SELECT 1 FROM incentive_adjustments rel
            WHERE rel.result_id = incentive_adjustments.result_id
              AND rel.adjustment_type = 'RELEASE'
              AND rel.created_at > incentive_adjustments.created_at
          )
        """;

    public const string BatchApprove = """
        UPDATE ins_incentive_results
        SET status = 'APPROVED', approved_by = @approvedBy, approved_at = NOW()
        WHERE id = ANY(@ids)
          AND status = 'DRAFT' AND persistency_gate_passed = TRUE
        RETURNING id
        """;

    public const string SkippedGateFailedCount = """
        SELECT COUNT(*)::int AS cnt FROM ins_incentive_results
        WHERE id = ANY(@ids) AND status = 'DRAFT' AND persistency_gate_passed = FALSE
        """;

    // ── HOLD virtual status filter ────────────────────

    public const string HoldExistsFilter = """
        EXISTS (
          SELECT 1 FROM incentive_adjustments adj
          WHERE adj.result_id = r.id AND adj.adjustment_type = 'HOLD'
            AND NOT EXISTS (
              SELECT 1 FROM incentive_adjustments rel
              WHERE rel.result_id = r.id AND rel.adjustment_type = 'RELEASE'
                AND rel.created_at > adj.created_at
            )
        )
        """;
}
