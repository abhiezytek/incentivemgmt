using Microsoft.Extensions.DependencyInjection;

namespace Incentive.Application.Extensions;

public static class ApplicationServiceCollectionExtensions
{
    /// <summary>
    /// Registers all Application layer services (business logic, validators).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // TODO: Register calculation services when implemented (Wave 4)
        // services.AddScoped<ICalculateIncentiveService, CalculateIncentiveService>();
        // services.AddScoped<IInsuranceCalcEngineService, InsuranceCalcEngineService>();

        // TODO: Register workflow services when implemented (Wave 3)
        // services.AddScoped<IIncentiveResultService, IncentiveResultService>();
        // services.AddScoped<IReviewAdjustmentService, ReviewAdjustmentService>();

        return services;
    }
}
