namespace Incentive.Application.Features.SystemStatus;

/// <summary>
/// Response DTO for GET /api/system-status/summary.
/// Matches the Node.js response shape exactly.
/// </summary>
public class SystemStatusSummaryResponse
{
    public DatabaseStatusDto Database { get; set; } = new();
    public Dictionary<string, SyncStatusEntryDto> SyncStatus { get; set; } = new();
    public Dictionary<string, Dictionary<string, int>> IntegrationCounts { get; set; } = new();
    public Dictionary<string, int> FileProcessing { get; set; } = new();
    public string ServerTime { get; set; } = DateTime.UtcNow.ToString("o");
}

public class DatabaseStatusDto
{
    public string Status { get; set; } = "ERROR";
}

public class SyncStatusEntryDto
{
    public string? Value { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
