using Incentive.Application.Features.Dashboard;

namespace Incentive.Application.Abstractions.Repositories;

public interface IDashboardRepository
{
    Task<ExecutiveSummaryResponse> GetExecutiveSummaryAsync(int? programId, DateOnly? period);
}
