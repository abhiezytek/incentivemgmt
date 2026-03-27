using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Interfaces;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Repositories;
using Incentive.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Incentive.Infrastructure.Extensions;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>
    /// Registers all Infrastructure layer services (DB, utilities, background jobs).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Data access
        services.AddSingleton<DbConnectionFactory>();
        services.AddSingleton<QueryHelper>();

        // Wave 1 repositories
        services.AddScoped<IDashboardRepository, DashboardRepository>();
        services.AddScoped<ISystemStatusRepository, SystemStatusRepository>();
        services.AddScoped<INotificationsRepository, NotificationsRepository>();
        services.AddScoped<IOrgDomainMappingRepository, OrgDomainMappingRepository>();
        services.AddScoped<IProgramsRepository, ProgramsRepository>();

        // Wave 2 repositories
        services.AddScoped<IKpiConfigRepository, KpiConfigRepository>();

        // Wave 3 repositories
        services.AddScoped<IReviewAdjustmentsRepository, ReviewAdjustmentsRepository>();
        services.AddScoped<IExceptionLogRepository, ExceptionLogRepository>();

        // Auth / Security
        services.AddScoped<IUserAuthRepository, UserAuthRepository>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // TODO: Register BulkInsertUtil, CsvParserUtil, DataMaskUtil when implemented
        // TODO: Register Quartz background jobs when implemented
        // TODO: Register external service clients (SFTP, Hierarchy API, Penta) when implemented

        return services;
    }
}
