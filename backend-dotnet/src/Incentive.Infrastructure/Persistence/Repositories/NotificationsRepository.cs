using System.Text;
using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.Notifications;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of INotificationsRepository.
/// Ported from server/src/routes/notifications.js.
/// </summary>
public class NotificationsRepository : INotificationsRepository
{
    private readonly DbConnectionFactory _db;

    public NotificationsRepository(DbConnectionFactory db) => _db = db;

    public async Task<NotificationListResponse> GetNotificationsAsync(
        bool? unreadOnly, string? type, int limit, int offset)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Build dynamic WHERE clause matching Node.js behavior
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (unreadOnly == true)
        {
            conditions.Add("is_read = FALSE");
        }
        if (!string.IsNullOrEmpty(type))
        {
            conditions.Add("event_type = @type");
            parameters.Add("type", type);
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        // Fetch rows
        var sql = $"""
            SELECT * FROM notification_events {where}
            ORDER BY created_at DESC
            LIMIT @limit OFFSET @offset
            """;
        parameters.Add("limit", limit);
        parameters.Add("offset", offset);

        var rows = await conn.QueryAsync(sql, parameters);

        // Count totals (without limit/offset)
        var countParams = new DynamicParameters();
        if (!string.IsNullOrEmpty(type))
            countParams.Add("type", type);

        var countSql = $"""
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER(WHERE is_read = FALSE)::int AS unread
            FROM notification_events {where}
            """;
        var countRow = await conn.QueryFirstOrDefaultAsync(countSql, countParams);

        return new NotificationListResponse
        {
            Rows = rows,
            Total = countRow?.total != null ? (int)countRow.total : 0,
            Unread = countRow?.unread != null ? (int)countRow.unread : 0,
        };
    }

    public async Task MarkAsReadAsync(int id)
    {
        using var conn = await _db.CreateConnectionAsync();
        await conn.ExecuteAsync(NotificationsSql.MarkAsRead, new { id });
    }

    public async Task<int> MarkAllAsReadAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.ExecuteAsync(NotificationsSql.MarkAllAsRead);
    }
}
