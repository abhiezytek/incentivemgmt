namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the system-status/summary endpoint.
/// Ported from server/src/routes/systemStatus.js.
/// </summary>
public static class SystemStatusSql
{
    public const string SyncTimestamps = """
        SELECT config_key, config_value, updated_at
        FROM system_config
        WHERE config_key IN ('HIERARCHY_LAST_SYNC','LIFEASIA_LAST_FILE','PENTA_LAST_SYNC')
        """;

    public const string IntegrationAuditCounts = """
        SELECT source_system, status, COUNT(*)::int AS cnt
        FROM integration_audit_log
        WHERE called_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source_system, status
        """;

    public const string FileProcessingStatus = """
        SELECT status, COUNT(*)::int AS cnt
        FROM file_processing_log
        WHERE downloaded_at >= NOW() - INTERVAL '7 days'
        GROUP BY status
        """;

    public const string DbConnectivity = "SELECT 1 AS ok";
}
