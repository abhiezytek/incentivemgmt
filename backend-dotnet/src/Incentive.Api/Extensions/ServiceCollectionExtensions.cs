using Incentive.Api.Middleware;
using Incentive.Application.Extensions;
using Incentive.Infrastructure.Extensions;

namespace Incentive.Api.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers all application services across all layers.
    /// </summary>
    public static IServiceCollection AddAllServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Infrastructure layer (DB, utilities, jobs)
        services.AddInfrastructure(configuration);

        // Application layer (business logic)
        services.AddApplication();

        return services;
    }
}

public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Configures the middleware pipeline.
    /// </summary>
    public static WebApplication UseCustomMiddleware(this WebApplication app)
    {
        // Global exception handler (first in pipeline)
        app.UseMiddleware<ExceptionHandlerMiddleware>();

        // TODO: Add MaskResponseMiddleware when implemented
        // app.UseMiddleware<MaskResponseMiddleware>();

        return app;
    }
}
