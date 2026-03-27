namespace Incentive.Application.Features.Notifications;

/// <summary>
/// Response DTO for GET /api/notifications.
/// Matches the Node.js response shape exactly.
/// </summary>
public class NotificationListResponse
{
    public IEnumerable<dynamic> Rows { get; set; } = [];
    public int Total { get; set; }
    public int Unread { get; set; }
}
