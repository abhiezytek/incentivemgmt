using Incentive.Application.Abstractions.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Notification endpoints.
/// Ported from server/src/routes/notifications.js.
/// Auth: userAuth (placeholder — currently passes through in Node.js).
/// NOTE: Node.js userAuth middleware is a placeholder that passes all requests through.
///       We match that behavior here — no actual auth enforcement.
///       Includes both read (GET) and write (POST) endpoints per the Node.js source.
/// </summary>
[ApiController]
public class NotificationsController : ControllerBase
{
    private readonly INotificationsRepository _notificationsRepo;

    public NotificationsController(INotificationsRepository notificationsRepo) =>
        _notificationsRepo = notificationsRepo;

    /// <summary>
    /// List notification events with optional filtering and pagination.
    /// </summary>
    [HttpGet("api/v1/notifications")]
    [HttpGet("api/notifications")]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] string? type = null,
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        var result = await _notificationsRepo.GetNotificationsAsync(unreadOnly, type, limit, offset);
        return Ok(result);
    }

    /// <summary>
    /// Mark a single notification as read.
    /// NOTE: This is a write endpoint included because the Node.js notifications route
    /// contains it and the frontend uses GET + mark-read together.
    /// </summary>
    [HttpPost("api/v1/notifications/{id:int}/read")]
    [HttpPost("api/notifications/{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        await _notificationsRepo.MarkAsReadAsync(id);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Mark all unread notifications as read.
    /// NOTE: This is a write endpoint included because the Node.js notifications route
    /// contains it and the frontend uses GET + mark-all-read together.
    /// </summary>
    [HttpPost("api/v1/notifications/mark-all-read")]
    [HttpPost("api/notifications/mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var updated = await _notificationsRepo.MarkAllAsReadAsync();
        return Ok(new { success = true, updated });
    }
}
