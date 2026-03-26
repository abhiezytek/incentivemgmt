using Incentive.Application.Features.SystemStatus;

namespace Incentive.Application.Abstractions.Repositories;

public interface ISystemStatusRepository
{
    Task<SystemStatusSummaryResponse> GetSummaryAsync();
}
