using Incentive.Application.Features.Notifications;

namespace Incentive.Application.Abstractions.Repositories;

public interface INotificationsRepository
{
    Task<NotificationListResponse> GetNotificationsAsync(bool? unreadOnly, string? type, int limit, int offset);
    Task MarkAsReadAsync(int id);
    Task<int> MarkAllAsReadAsync();
}
