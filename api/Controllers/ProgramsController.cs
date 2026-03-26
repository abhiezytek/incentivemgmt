namespace IncentiveApi.Controllers;

using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class ProgramsController : ControllerBase
{
    private const string Table = "incentive_programs";

    private static readonly string[] ValidStatuses = ["DRAFT", "ACTIVE", "CLOSED"];
    private static readonly HashSet<string> ProtectedFields = ["id", "created_at", "created_by"];

    private readonly QueryHelper _qh;
    private readonly DbConnectionFactory _db;

    public ProgramsController(QueryHelper qh, DbConnectionFactory db)
    {
        _qh = qh;
        _db = db;
    }

    // GET /programs
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _qh.FindAllAsync(Table);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // GET /programs/:id
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _qh.FindByIdAsync(Table, id);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // POST /programs
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync(Table, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /programs/:id
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object> body)
    {
        var updates = new Dictionary<string, object>();
        foreach (var kvp in body)
        {
            if (!ProtectedFields.Contains(kvp.Key))
                updates[kvp.Key] = kvp.Value;
        }

        if (updates.Count == 0)
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "At least one updatable field is required" });

        var row = await _qh.UpdateRowAsync(Table, id, updates);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // PATCH /programs/:id/status
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateRequest request)
    {
        var newStatus = request.Status;

        // 1. Validate status value
        if (string.IsNullOrEmpty(newStatus) || !ValidStatuses.Contains(newStatus))
            throw new ApiException(ErrorCodes.VAL_003, new { field = "status", allowed = ValidStatuses });

        // 2. Fetch current program
        var program = await _qh.FindByIdAsync(Table, id);
        if (program is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        string currentStatus = (string)program.status;

        // 3. Cannot transition from CLOSED back to ACTIVE
        if (currentStatus == "CLOSED" && newStatus == "ACTIVE")
            throw new ApiException(ErrorCodes.BUS_001, new { current = currentStatus, requested = newStatus });

        // 4. Extra checks when activating
        if (newStatus == "ACTIVE")
        {
            using var conn = await _db.CreateConnectionAsync();

            // Check overlapping active programs for same channel
            var overlapping = (await conn.QueryAsync<int>(
                """
                SELECT id FROM incentive_programs
                WHERE channel_id = @channelId AND status = 'ACTIVE'
                  AND id != @id
                  AND (start_date, end_date) OVERLAPS (@startDate, @endDate)
                """,
                new
                {
                    channelId = (int)program.channel_id,
                    id,
                    startDate = (DateTime)program.start_date,
                    endDate = (DateTime)program.end_date
                })).AsList();

            if (overlapping.Count > 0)
                throw new ApiException(ErrorCodes.BUS_002, new { conflicting_program_ids = overlapping });

            // Check KPI rules exist
            var kpiCount = await conn.QueryFirstAsync<int>(
                "SELECT COUNT(*)::int FROM kpi_definitions WHERE program_id = @id",
                new { id = (int)program.id });
            if (kpiCount == 0)
                throw new ApiException(ErrorCodes.BUS_007);

            // Check payout rules exist
            var payoutCount = await conn.QueryFirstAsync<int>(
                "SELECT COUNT(*)::int FROM payout_rules WHERE program_id = @id",
                new { id = (int)program.id });
            if (payoutCount == 0)
                throw new ApiException(ErrorCodes.BUS_006);
        }

        // 5. Update status
        var updated = await _qh.UpdateRowAsync(Table, id, new Dictionary<string, object> { ["status"] = newStatus });
        return Ok(ApiResponse<object>.Ok(updated!));
    }

    // DELETE /programs/:id
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _qh.DeleteRowAsync(Table, id);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    // GET /programs/:id/summary
    [HttpGet("{id:int}/summary")]
    public async Task<IActionResult> GetSummary(int id)
    {
        var program = await _qh.FindByIdAsync(Table, id);
        if (program is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        using var conn = await _db.CreateConnectionAsync();

        var kpiCount = await conn.QueryFirstAsync<int>(
            "SELECT COUNT(*)::int FROM kpi_definitions WHERE program_id = @id", new { id });

        var payoutRuleCount = await conn.QueryFirstAsync<int>(
            "SELECT COUNT(*)::int FROM payout_rules WHERE program_id = @id", new { id });

        var agentCount = await conn.QueryFirstAsync<int>(
            "SELECT COUNT(*)::int FROM users WHERE channel_id = @channelId AND is_active = TRUE",
            new { channelId = (int)program.channel_id });

        var resultCount = await conn.QueryFirstAsync<int>(
            "SELECT COUNT(*)::int FROM incentive_results WHERE program_id = @id", new { id });

        return Ok(ApiResponse<object>.Ok(new
        {
            program,
            kpi_count = kpiCount,
            payout_rule_count = payoutRuleCount,
            agent_count = agentCount,
            has_results = resultCount > 0
        }));
    }

    // GET /programs/:id/preview
    [HttpGet("{id:int}/preview")]
    public async Task<IActionResult> GetPreview(int id)
    {
        var program = await _qh.FindByIdAsync(Table, id);
        if (program is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        using var conn = await _db.CreateConnectionAsync();

        // Channel info
        var channel = await conn.QueryFirstOrDefaultAsync(
            "SELECT name, code FROM channels WHERE id = @channelId",
            new { channelId = (int)program.channel_id });

        // KPIs with milestones
        var kpis = await conn.QueryAsync(
            """
            SELECT kd.*, json_agg(km.* ORDER BY km.sort_order) AS milestones
            FROM kpi_definitions kd
            LEFT JOIN kpi_milestones km ON km.kpi_id = kd.id
            WHERE kd.program_id = @id
            GROUP BY kd.id
            ORDER BY kd.sort_order
            """, new { id });

        // Payout rules with slabs
        var payoutRules = await conn.QueryAsync(
            """
            SELECT pr.*, json_agg(ps.* ORDER BY ps.sort_order) AS slabs
            FROM payout_rules pr
            LEFT JOIN payout_slabs ps ON ps.payout_rule_id = pr.id
            WHERE pr.program_id = @id
            GROUP BY pr.id
            """, new { id });

        // Qualifying rules
        var qualifyingRules = await conn.QueryAsync(
            """
            SELECT pqr.*, pr.rule_name, kd.kpi_name
            FROM payout_qualifying_rules pqr
            JOIN payout_rules pr ON pr.id = pqr.payout_rule_id
            LEFT JOIN kpi_definitions kd ON kd.id = pqr.kpi_id
            WHERE pr.program_id = @id
            """, new { id });

        // Agent count
        var agentCount = await conn.QueryFirstAsync<int>(
            "SELECT COUNT(*)::int FROM ins_agents WHERE channel_id = @channelId AND status = 'ACTIVE'",
            new { channelId = (int)program.channel_id });

        // Result stats
        var resultStatsRows = await conn.QueryAsync(
            """
            SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
            FROM ins_incentive_results WHERE program_id = @id
            GROUP BY status
            """, new { id });

        var resultStats = new Dictionary<string, object>();
        foreach (var r in resultStatsRows)
        {
            resultStats[(string)r.status] = new { count = (int)r.count, total = (decimal)r.total };
        }

        // Build response by copying program fields and adding extra properties
        var result = new Dictionary<string, object?>();
        foreach (var prop in (IDictionary<string, object>)program)
            result[prop.Key] = prop.Value;

        result["channel"] = channel;
        result["kpis"] = kpis;
        result["payoutRules"] = payoutRules;
        result["qualifyingRules"] = qualifyingRules;
        result["agentCount"] = agentCount;
        result["resultStats"] = resultStats;

        return Ok(ApiResponse<object>.Ok(result));
    }

    public class StatusUpdateRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
