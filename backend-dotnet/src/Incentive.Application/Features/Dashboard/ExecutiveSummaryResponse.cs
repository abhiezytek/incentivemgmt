namespace Incentive.Application.Features.Dashboard;

/// <summary>
/// Response DTO for GET /api/dashboard/executive-summary.
/// Matches the Node.js response shape exactly for React frontend parity.
/// </summary>
public class ExecutiveSummaryResponse
{
    public KpiCardsDto KpiCards { get; set; } = new();
    public AlertsDto Alerts { get; set; } = new();
    public Dictionary<string, PipelineStatusDto> Pipeline { get; set; } = new();
    public List<ChannelPerformanceDto> ChannelPerformance { get; set; } = [];
    public List<RecentActivityDto> RecentActivity { get; set; } = [];
    public string LastSync { get; set; } = DateTime.UtcNow.ToString("o");
}

public class KpiCardsDto
{
    public int ActiveSchemes { get; set; }
    public int ProcessingPayouts { get; set; }
    public int PendingApprovals { get; set; }
    public decimal NetPayout { get; set; }
    public int TotalRecords { get; set; }
}

public class AlertsDto
{
    public int OpenExceptions { get; set; }
    public int UnreadNotifications { get; set; }
}

public class PipelineStatusDto
{
    public int Count { get; set; }
    public decimal Total { get; set; }
}

public class ChannelPerformanceDto
{
    public string Channel { get; set; } = string.Empty;
    public decimal SelfIncentive { get; set; }
    public decimal OverrideIncentive { get; set; }
    public decimal TotalIncentive { get; set; }
    public int AgentCount { get; set; }
}

public class RecentActivityDto
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Time { get; set; }
    public string Icon { get; set; } = string.Empty;
}
