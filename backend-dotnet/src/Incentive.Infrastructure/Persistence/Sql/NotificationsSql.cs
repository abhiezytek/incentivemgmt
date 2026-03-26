namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the notifications endpoints.
/// Ported from server/src/routes/notifications.js.
/// </summary>
public static class NotificationsSql
{
    public const string MarkAsRead = """
        UPDATE notification_events SET is_read = TRUE WHERE id = @id
        """;

    public const string MarkAllAsRead = """
        UPDATE notification_events SET is_read = TRUE WHERE is_read = FALSE
        """;
}
