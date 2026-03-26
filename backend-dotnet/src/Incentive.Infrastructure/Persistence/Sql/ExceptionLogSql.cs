namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for exception log endpoints.
/// Ported from server/src/routes/exceptionLog.js.
/// All queries target the additive operational_exceptions table only.
/// </summary>
public static class ExceptionLogSql
{
    // ── Summary cards (unfiltered) ────────────────────

    public const string SummaryCards = """
        SELECT
          COUNT(*) FILTER(WHERE status = 'OPEN')::int          AS open_count,
          COUNT(*) FILTER(WHERE status = 'RESOLVED' AND DATE(resolved_at) = CURRENT_DATE)::int AS resolved_today,
          COUNT(*) FILTER(WHERE severity = 'CRITICAL' AND status = 'OPEN')::int AS critical_count,
          COUNT(DISTINCT source_system)::int                   AS sources_affected,
          COUNT(*)::int                                         AS total_count
        FROM operational_exceptions
        """;

    // ── Detail (GET /:id) ─────────────────────────────

    public const string ExceptionById = """
        SELECT * FROM operational_exceptions WHERE id = @id
        """;

    // ── Resolve (POST /:id/resolve) ───────────────────

    public const string ResolveException = """
        UPDATE operational_exceptions
        SET status = @status, resolved_by = @resolvedBy, resolved_at = NOW(), resolution_note = @note
        WHERE id = @id AND status NOT IN ('RESOLVED', 'DISMISSED')
        RETURNING *
        """;
}
