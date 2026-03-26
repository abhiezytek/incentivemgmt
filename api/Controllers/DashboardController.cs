namespace IncentiveApi.Controllers;

using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public DashboardController(DbConnectionFactory db)
    {
        _db = db;
    }

    /// <summary>
    /// Dashboard summary with 7 data sections.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? programId,
        [FromQuery] string? period)
    {
        using var conn = await _db.CreateConnectionAsync();

        // 1. KPI Summary
        var kpi = await conn.QueryFirstOrDefaultAsync(
            @"SELECT
                SUM(r.total_incentive)          AS total_pool,
                SUM(r.net_self_incentive)       AS total_self,
                SUM(r.total_override)           AS total_override,
                COUNT(*)                        AS agent_count,
                COUNT(*) FILTER(WHERE r.status='PAID') AS paid_count,
                COUNT(*) FILTER(WHERE NOT r.persistency_gate_passed) AS agents_below_gate,
                AVG(k.nb_achievement_pct)       AS avg_achievement,
                SUM(k.nb_total_premium)         AS total_nb_premium,
                COUNT(k.nb_policy_count)        AS nb_policy_count,
                SUM(k.nb_target_premium)        AS total_target,
                AVG(k.persistency_13m)          AS avg_persistency_13m
              FROM ins_incentive_results r
              LEFT JOIN ins_agent_kpi_summary k
                ON k.agent_code = r.agent_code
               AND k.program_id = r.program_id
               AND k.period_start = r.period_start
              WHERE (@programId::int  IS NULL OR r.program_id   = @programId)
                AND (@period::date IS NULL OR r.period_start = @period::date)",
            new { programId, period });

        // 2. Channel Breakdown
        var channelBreakdown = await conn.QueryAsync(
            @"SELECT
                c.name                          AS channel,
                SUM(r.net_self_incentive)       AS self_incentive,
                SUM(r.total_override)           AS override_incentive,
                SUM(r.total_incentive)          AS total_incentive,
                COUNT(*)                        AS agent_count
              FROM ins_incentive_results r
              JOIN ins_agents a ON a.agent_code = r.agent_code
              JOIN channels   c ON c.id = a.channel_id
              WHERE (@programId::int  IS NULL OR r.program_id   = @programId)
                AND (@period::date IS NULL OR r.period_start = @period::date)
              GROUP BY c.name
              ORDER BY total_incentive DESC",
            new { programId, period });

        // 3. Product Mix
        var productMix = await conn.QueryAsync(
            @"SELECT
                p.product_name    AS product,
                p.product_category,
                SUM(t.premium_amount) AS premium,
                COUNT(*)              AS policy_count
              FROM ins_policy_transactions t
              JOIN ins_products p ON p.product_code = t.product_code
              WHERE t.transaction_type = 'NEW_BUSINESS'
                AND (@programId::int  IS NULL OR t.channel_id = (
                      SELECT channel_id FROM incentive_programs WHERE id = @programId))
                AND (@period::date IS NULL OR t.paid_date >= @period::date)
              GROUP BY p.product_name, p.product_category
              ORDER BY premium DESC",
            new { programId, period });

        // 4. Top 5 Agents
        var topAgents = await conn.QueryAsync(
            @"SELECT r.agent_code, a.agent_name,
                     r.total_incentive, r.net_self_incentive,
                     k.nb_achievement_pct
              FROM ins_incentive_results r
              JOIN ins_agents a ON a.agent_code = r.agent_code
              LEFT JOIN ins_agent_kpi_summary k
                ON k.agent_code = r.agent_code
               AND k.program_id = r.program_id
               AND k.period_start = r.period_start
              WHERE (@programId::int  IS NULL OR r.program_id   = @programId)
                AND (@period::date IS NULL OR r.period_start = @period::date)
                AND r.status IN ('APPROVED','PAID','DRAFT')
              ORDER BY r.total_incentive DESC
              LIMIT 5",
            new { programId, period });

        // 5. Active Programs
        var programs = await conn.QueryAsync(
            @"SELECT ip.id, ip.name, ip.start_date, ip.end_date,
                     ip.status, c.name AS channel
              FROM incentive_programs ip
              JOIN channels c ON c.id = ip.channel_id
              WHERE ip.status IN ('ACTIVE','DRAFT')
              ORDER BY ip.start_date DESC
              LIMIT 5");

        // 6. Pipeline Status
        var pipelineRows = await conn.QueryAsync(
            @"SELECT status,
                     COUNT(*)              AS count,
                     SUM(total_incentive)  AS pool
              FROM ins_incentive_results
              WHERE (@programId::int  IS NULL OR program_id   = @programId)
                AND (@period::date IS NULL OR period_start = @period::date)
              GROUP BY status",
            new { programId, period });

        var pipelineStatus = new Dictionary<string, object>();
        foreach (var r in pipelineRows)
        {
            pipelineStatus[(string)r.status] = new
            {
                count = Convert.ToInt32(r.count),
                pool = Convert.ToDecimal(r.pool),
            };
        }

        // 7. Recent Activity
        var activityRows = (await conn.QueryAsync(
            @"SELECT 'calculation' AS type,
                     'Incentives calculated for ' || COUNT(*) || ' agents' AS message,
                     MAX(calculated_at) AS time,
                     '🧮' AS icon
              FROM ins_incentive_results
              WHERE (@programId::int IS NULL OR program_id = @programId)
              GROUP BY DATE(calculated_at)
              UNION ALL
              SELECT 'approval', 'Bulk approved ' || COUNT(*) || ' agents',
                     MAX(approved_at), '✅'
              FROM ins_incentive_results
              WHERE status IN ('APPROVED','PAID','INITIATED')
                AND (@programId::int IS NULL OR program_id = @programId)
              GROUP BY DATE(approved_at)
              UNION ALL
              SELECT 'payment', 'Payments processed for ' || COUNT(*) || ' agents',
                     MAX(paid_at), '💸'
              FROM payout_disbursement_log
              GROUP BY DATE(paid_at)
              ORDER BY time DESC
              LIMIT 8",
            new { programId })).AsList();

        var recentActivity = activityRows.Select(r =>
        {
            DateTime? time = r.time as DateTime?;
            string formattedTime = time?.ToString("dd MMM, hh:mm tt") ?? "";
            return new
            {
                type = (string)r.type,
                message = (string)r.message,
                time = formattedTime,
                icon = (string)r.icon,
            };
        });

        return Ok(ApiResponse<object>.Ok(new
        {
            kpi,
            channelBreakdown,
            productMix,
            topAgents,
            programs,
            pipelineStatus,
            recentActivity,
        }));
    }
}
