using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.SystemStatus;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of ISystemStatusRepository.
/// Ported from server/src/routes/systemStatus.js.
/// </summary>
public class SystemStatusRepository : ISystemStatusRepository
{
    private readonly DbConnectionFactory _db;

    public SystemStatusRepository(DbConnectionFactory db) => _db = db;

    public async Task<SystemStatusSummaryResponse> GetSummaryAsync()
    {
        using var conn = await _db.CreateConnectionAsync();

        // Sync timestamps from system_config
        var syncStatus = new Dictionary<string, SyncStatusEntryDto>();
        try
        {
            var configRows = await conn.QueryAsync(SystemStatusSql.SyncTimestamps);
            foreach (var row in configRows)
            {
                syncStatus[(string)row.config_key] = new SyncStatusEntryDto
                {
                    Value = (string?)row.config_value,
                    UpdatedAt = row.updated_at as DateTime?,
                };
            }
        }
        catch { /* Table may not exist in dev */ }

        // Recent integration audit counts
        var integrationCounts = new Dictionary<string, Dictionary<string, int>>();
        try
        {
            var auditRows = await conn.QueryAsync(SystemStatusSql.IntegrationAuditCounts);
            foreach (var row in auditRows)
            {
                var system = (string)row.source_system;
                if (!integrationCounts.ContainsKey(system))
                    integrationCounts[system] = new Dictionary<string, int>();
                integrationCounts[system][(string)row.status] = (int)row.cnt;
            }
        }
        catch { /* Table may not exist */ }

        // File processing status
        var fileProcessing = new Dictionary<string, int>();
        try
        {
            var fileRows = await conn.QueryAsync(SystemStatusSql.FileProcessingStatus);
            foreach (var row in fileRows)
            {
                fileProcessing[(string)row.status] = (int)row.cnt;
            }
        }
        catch { /* Table may not exist */ }

        // Database connectivity
        string dbStatus;
        try
        {
            var dbCheck = await conn.QueryAsync(SystemStatusSql.DbConnectivity);
            dbStatus = dbCheck.Any() ? "CONNECTED" : "ERROR";
        }
        catch
        {
            dbStatus = "ERROR";
        }

        return new SystemStatusSummaryResponse
        {
            Database = new DatabaseStatusDto { Status = dbStatus },
            SyncStatus = syncStatus,
            IntegrationCounts = integrationCounts,
            FileProcessing = fileProcessing,
            ServerTime = DateTime.UtcNow.ToString("o"),
        };
    }
}
