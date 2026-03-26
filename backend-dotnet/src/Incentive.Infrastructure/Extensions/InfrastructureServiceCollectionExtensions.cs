using Incentive.Infrastructure.Data;
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

        // TODO: Register BulkInsertUtil, CsvParserUtil, DataMaskUtil when implemented
        // TODO: Register Quartz background jobs when implemented
        // TODO: Register external service clients (SFTP, Hierarchy API, Penta) when implemented

        return services;
    }
}
