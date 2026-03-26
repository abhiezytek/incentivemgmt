namespace IncentiveApi.Controllers;

using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public LeaderboardController(DbConnectionFactory db)
    {
        _db = db;
    }

    /// <summary>
    /// Ranked agents by total incentive with optional channel/region filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] int? programId,
        [FromQuery] string? period,
        [FromQuery] string? channel,
        [FromQuery] string? region)
    {
        if (!programId.HasValue || string.IsNullOrEmpty(period))
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "programId, period" });

        using var conn = await _db.CreateConnectionAsync();

        var agents = (await conn.QueryAsync(
            @"SELECT r.*,
                     a.agent_name, a.agent_code, a.hierarchy_level,
                     c.name AS channel, rg.region_name AS region,
                     k.nb_total_premium, k.nb_achievement_pct,
                     k.persistency_13m, k.persistency_25m, k.collection_pct
              FROM ins_incentive_results r
              JOIN ins_agents a ON a.agent_code = r.agent_code
              JOIN channels c ON c.id = a.channel_id
              LEFT JOIN ins_regions rg ON rg.id = a.region_id
              LEFT JOIN ins_agent_kpi_summary k
                ON k.agent_code = r.agent_code
                AND k.program_id = r.program_id
                AND k.period_start = r.period_start
              WHERE r.program_id = @programId
                AND r.period_start = @period::date
                AND (@channel::text IS NULL OR c.code = @channel)
                AND (@region::text IS NULL OR rg.region_code = @region)
                AND r.status IN ('DRAFT','APPROVED','INITIATED','PAID')
              ORDER BY r.total_incentive DESC",
            new
            {
                programId = programId.Value,
                period,
                channel = string.IsNullOrEmpty(channel) ? null : channel,
                region = string.IsNullOrEmpty(region) ? null : region,
            })).AsList();

        object? summary = null;
        if (agents.Count > 0)
        {
            decimal totalPool = agents.Sum(r => Convert.ToDecimal(((IDictionary<string, object>)r)["total_incentive"] ?? 0));
            summary = new
            {
                total_pool = totalPool,
                agent_count = agents.Count,
                avg_incentive = totalPool / agents.Count,
                top_earner = (string?)(((IDictionary<string, object>)agents[0])["agent_name"]
                              ?? ((IDictionary<string, object>)agents[0])["agent_code"]),
            };
        }

        return Ok(ApiResponse<object>.Ok(new { agents, summary }));
    }
}
