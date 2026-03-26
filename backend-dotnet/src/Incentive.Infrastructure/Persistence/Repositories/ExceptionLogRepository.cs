using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.ExceptionLog;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IExceptionLogRepository.
/// Ported from server/src/routes/exceptionLog.js.
/// All operations target the additive operational_exceptions table only.
/// </summary>
public class ExceptionLogRepository : IExceptionLogRepository
{
    private readonly DbConnectionFactory _db;

    public ExceptionLogRepository(DbConnectionFactory db) => _db = db;

    public async Task<ExceptionListResponse> GetExceptionListAsync(
        string? type, string? status, string? severity,
        string? source, string? search, int limit, int offset)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Summary cards are always unfiltered (matches Node.js behavior)
        var summary = await conn.QueryFirstOrDefaultAsync(ExceptionLogSql.SummaryCards);

        // Build dynamic WHERE clause
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrEmpty(type))
        {
            conditions.Add("exception_type = @type");
            parameters.Add("type", type);
        }
        if (!string.IsNullOrEmpty(status))
        {
            conditions.Add("status = @status");
            parameters.Add("status", status);
        }
        if (!string.IsNullOrEmpty(severity))
        {
            conditions.Add("severity = @severity");
            parameters.Add("severity", severity);
        }
        if (!string.IsNullOrEmpty(source))
        {
            conditions.Add("source_system = @source");
            parameters.Add("source", source);
        }
        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(entity_id ILIKE @search OR description ILIKE @search OR exception_type ILIKE @search)");
            parameters.Add("search", $"%{search}%");
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        // Paginated list
        var listSql = $"""
            SELECT * FROM operational_exceptions
            {where}
            ORDER BY created_at DESC
            LIMIT @limit OFFSET @offset
            """;
        parameters.Add("limit", limit);
        parameters.Add("offset", offset);

        var rows = await conn.QueryAsync(listSql, parameters);

        // Filtered count for pagination (exclude limit/offset)
        var countParams = new DynamicParameters();
        if (!string.IsNullOrEmpty(type)) countParams.Add("type", type);
        if (!string.IsNullOrEmpty(status)) countParams.Add("status", status);
        if (!string.IsNullOrEmpty(severity)) countParams.Add("severity", severity);
        if (!string.IsNullOrEmpty(source)) countParams.Add("source", source);
        if (!string.IsNullOrEmpty(search)) countParams.Add("search", $"%{search}%");

        var countSql = $"SELECT COUNT(*)::int AS cnt FROM operational_exceptions {where}";
        var countRow = await conn.QueryFirstOrDefaultAsync(countSql, countParams);

        return new ExceptionListResponse
        {
            Summary = summary ?? new { },
            Rows = rows,
            Pagination = new ExceptionPaginationInfo
            {
                Limit = limit,
                Offset = offset,
                Total = (int?)countRow?.cnt ?? 0,
            },
        };
    }

    public async Task<dynamic?> GetExceptionByIdAsync(int id)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(ExceptionLogSql.ExceptionById, new { id });
    }

    public async Task<dynamic?> ResolveExceptionAsync(int id, string status, string? resolvedBy, string? note)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(
            ExceptionLogSql.ResolveException,
            new { id, status, resolvedBy, note });
    }
}
