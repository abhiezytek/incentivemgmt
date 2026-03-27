namespace IncentiveApi.Controllers;

using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Services.Engine;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class CalculateController : ControllerBase
{
    private readonly QueryHelper _qh;
    private readonly DbConnectionFactory _db;
    private readonly CalculateIncentiveService _calcService;
    private readonly InsuranceCalcEngineService _insCalcService;

    public CalculateController(
        QueryHelper qh,
        DbConnectionFactory db,
        CalculateIncentiveService calcService,
        InsuranceCalcEngineService insCalcService)
    {
        _qh = qh;
        _db = db;
        _calcService = calcService;
        _insCalcService = insCalcService;
    }

    /// <summary>
    /// Run bulk incentive calculation for all active agents in a program's channel.
    /// </summary>
    [HttpPost("run")]
    public async Task<IActionResult> Run([FromBody] BulkRunRequest request)
    {
        if (request.ProgramId <= 0 || string.IsNullOrEmpty(request.PeriodStart) || string.IsNullOrEmpty(request.PeriodEnd))
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "programId, periodStart, periodEnd" });

        // Look up the program's channel
        var program = await _qh.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT channel_id FROM incentive_programs WHERE id = @programId",
            new { programId = request.ProgramId });

        if (program is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "programId" });

        // Fetch all active agents in that channel
        using var conn = await _db.CreateConnectionAsync();
        var agents = (await conn.QueryAsync(
            @"SELECT agent_code FROM ins_agents
              WHERE channel_id = @channelId AND status = 'ACTIVE'
              ORDER BY hierarchy_level, agent_code",
            new { channelId = (int)program.channel_id })).AsList();

        int successCount = 0;
        int errorCount = 0;
        decimal totalIncentivePool = 0;
        var errors = new List<object>();

        foreach (var agent in agents)
        {
            try
            {
                var result = await _insCalcService.CalculateAgentIncentiveAsync(
                    (string)agent.agent_code,
                    request.ProgramId,
                    request.PeriodStart,
                    request.PeriodEnd);

                totalIncentivePool += result.TotalIncentive;
                successCount++;
            }
            catch (Exception ex)
            {
                errorCount++;
                errors.Add(new { agentCode = (string)agent.agent_code, error = ex.Message });
            }
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            programId = request.ProgramId,
            periodStart = request.PeriodStart,
            periodEnd = request.PeriodEnd,
            totalAgents = agents.Count,
            successCount,
            errorCount,
            totalIncentivePool,
            errors = errors.Count > 0 ? errors : null,
        }));
    }

    /// <summary>
    /// Get calculation results for a program and period.
    /// </summary>
    [HttpGet("results")]
    public async Task<IActionResult> GetResults(
        [FromQuery] int? program_id,
        [FromQuery] string? period)
    {
        if (!program_id.HasValue || string.IsNullOrEmpty(period))
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "program_id, period" });

        var parts = period.Split('-');
        if (parts.Length != 2 ||
            !int.TryParse(parts[0], out int year) ||
            !int.TryParse(parts[1], out int month) ||
            month < 1 || month > 12)
        {
            throw new ApiException(ErrorCodes.VAL_002, new { field = "period", expected = "YYYY-MM" });
        }

        string periodStart = $"{year}-{month:D2}-01";

        var rows = await _qh.QueryAsync<dynamic>(
            @"SELECT ir.*, u.name AS user_name, u.email, c.name AS channel_name
              FROM incentive_results ir
              LEFT JOIN users u ON u.id = ir.user_id
              LEFT JOIN channels c ON c.id = u.channel_id
              WHERE ir.program_id = @program_id AND ir.period_start = @periodStart::date
              ORDER BY ir.total_incentive DESC",
            new { program_id = program_id.Value, periodStart });

        return Ok(ApiResponse<object>.Ok(rows));
    }

    /// <summary>
    /// Calculate incentive for a single user in a program and period.
    /// </summary>
    [HttpPost("{programId:int}/{userId:int}/{period}")]
    public async Task<IActionResult> CalculateSingle(int programId, int userId, string period)
    {
        var parts = period.Split('-');
        if (parts.Length != 2 ||
            !int.TryParse(parts[0], out int year) ||
            !int.TryParse(parts[1], out int month) ||
            month < 1 || month > 12)
        {
            throw new ApiException(ErrorCodes.VAL_002, new { field = "period", expected = "YYYY-MM" });
        }

        string periodStart = $"{year}-{month:D2}-01";
        // Last day of the month
        string periodEnd = new DateTime(year, month, DateTime.DaysInMonth(year, month)).ToString("yyyy-MM-dd");

        var result = await _calcService.CalculateAsync(userId, programId, periodStart, periodEnd);
        return StatusCode(201, ApiResponse<object>.Ok(result));
    }

    /// <summary>
    /// Get calculation run history.
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int? program_id,
        [FromQuery] int? limit)
    {
        int take = limit ?? 20;

        var rows = await _qh.QueryAsync<dynamic>(
            @"SELECT program_id, period_start, period_end,
                     COUNT(*)::int AS agent_count,
                     SUM(total_incentive) AS total_pool,
                     MIN(calculated_at) AS started_at,
                     MAX(calculated_at) AS completed_at
              FROM ins_incentive_results
              WHERE (@program_id::int IS NULL OR program_id = @program_id)
              GROUP BY program_id, period_start, period_end
              ORDER BY MAX(calculated_at) DESC
              LIMIT @take",
            new { program_id, take });

        return Ok(ApiResponse<object>.Ok(rows));
    }

    public class BulkRunRequest
    {
        public int ProgramId { get; set; }
        public string PeriodStart { get; set; } = string.Empty;
        public string PeriodEnd { get; set; } = string.Empty;
    }
}
