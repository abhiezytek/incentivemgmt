using System.Globalization;
using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.Dashboard;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IDashboardRepository.
/// Ported from server/src/routes/executiveSummary.js.
/// </summary>
public class DashboardRepository : IDashboardRepository
{
    private readonly DbConnectionFactory _db;

    public DashboardRepository(DbConnectionFactory db) => _db = db;

    public async Task<ExecutiveSummaryResponse> GetExecutiveSummaryAsync(int? programId, DateOnly? period)
    {
        using var conn = await _db.CreateConnectionAsync();

        var param = new { programId = programId, period = period?.ToString("yyyy-MM-dd") };

        // Active schemes count
        var activeSchemes = await conn.QueryFirstOrDefaultAsync<int>(DashboardSql.ActiveSchemes);

        // Pipeline summary
        var pipelineRows = await conn.QueryAsync(DashboardSql.PipelineSummary, param);
        var pipeline = new Dictionary<string, PipelineStatusDto>();
        foreach (var r in pipelineRows)
        {
            pipeline[(string)r.status] = new PipelineStatusDto
            {
                Count = (int)r.count,
                Total = (decimal)r.total
            };
        }

        // Total calculated
        var totals = await conn.QueryFirstOrDefaultAsync(DashboardSql.TotalCalculated, param);

        // Pending approvals
        var pending = await conn.QueryFirstOrDefaultAsync<int>(DashboardSql.PendingApprovals, param);

        // Open exceptions (table may not exist)
        int openExceptions = 0;
        try
        {
            openExceptions = await conn.QueryFirstOrDefaultAsync<int>(DashboardSql.OpenExceptions);
        }
        catch { /* Table may not exist yet */ }

        // Unread notifications (table may not exist)
        int unreadNotifications = 0;
        try
        {
            unreadNotifications = await conn.QueryFirstOrDefaultAsync<int>(DashboardSql.UnreadNotifications);
        }
        catch { /* Table may not exist yet */ }

        // Channel performance
        var channelRows = await conn.QueryAsync(DashboardSql.ChannelPerformance, param);
        var channelPerformance = channelRows.Select(r => new ChannelPerformanceDto
        {
            Channel = (string)r.channel,
            SelfIncentive = (decimal)r.self_incentive,
            OverrideIncentive = (decimal)r.override_incentive,
            TotalIncentive = (decimal)r.total_incentive,
            AgentCount = (int)r.agent_count,
        }).ToList();

        // Recent activity
        var activityRows = await conn.QueryAsync(DashboardSql.RecentActivity, new { programId });
        var recentActivity = activityRows.Select(r =>
        {
            string? formattedTime = null;
            if (r.time != null)
            {
                var dt = (DateTime)r.time;
                // Match Node.js: toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                formattedTime = dt.ToString("dd MMM, hh:mm tt", CultureInfo.InvariantCulture);
            }
            return new RecentActivityDto
            {
                Type = (string)r.type,
                Message = (string)r.message,
                Time = formattedTime,
                Icon = (string)r.icon,
            };
        }).ToList();

        return new ExecutiveSummaryResponse
        {
            KpiCards = new KpiCardsDto
            {
                ActiveSchemes = activeSchemes,
                ProcessingPayouts = pipeline.GetValueOrDefault("INITIATED")?.Count ?? 0,
                PendingApprovals = pending,
                NetPayout = totals?.total_calculated != null ? (decimal)totals.total_calculated : 0m,
                TotalRecords = totals?.total_records != null ? (int)totals.total_records : 0,
            },
            Alerts = new AlertsDto
            {
                OpenExceptions = openExceptions,
                UnreadNotifications = unreadNotifications,
            },
            Pipeline = pipeline,
            ChannelPerformance = channelPerformance,
            RecentActivity = recentActivity,
            LastSync = DateTime.UtcNow.ToString("o"),
        };
    }
}
