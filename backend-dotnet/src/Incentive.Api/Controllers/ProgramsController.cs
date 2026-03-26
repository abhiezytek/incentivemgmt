using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Incentive.Domain.Exceptions;
using Incentive.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Programs controller — full CRUD for incentive programs.
/// Auth: NONE (matches Node.js — programs routes have no auth middleware).
/// Wave 1: GET list, GET by ID, GET preview.
/// Wave 2: POST create, PUT update, PATCH status, DELETE, GET summary.
/// </summary>
[ApiController]
public class ProgramsController : ControllerBase
{
    private static readonly string[] ValidStatuses = ["DRAFT", "ACTIVE", "CLOSED"];
    private static readonly HashSet<string> ProtectedFields = ["id", "created_at", "created_by"];

    private readonly QueryHelper _queryHelper;
    private readonly IProgramsRepository _programsRepo;

    public ProgramsController(QueryHelper queryHelper, IProgramsRepository programsRepo)
    {
        _queryHelper = queryHelper;
        _programsRepo = programsRepo;
    }

    // ── Read endpoints (Wave 1) ─────────────────────────

    /// <summary>
    /// List all incentive programs.
    /// Matches Node.js: GET /api/programs → findAll('incentive_programs')
    /// </summary>
    [HttpGet("api/v1/programs")]
    [HttpGet("api/programs")]
    public async Task<IActionResult> GetAll()
    {
        var programs = await _queryHelper.FindAllAsync("incentive_programs");
        return Ok(programs);
    }

    /// <summary>
    /// Get a single program by ID.
    /// Matches Node.js: GET /api/programs/:id → findById('incentive_programs', id)
    /// </summary>
    [HttpGet("api/v1/programs/{id:int}")]
    [HttpGet("api/programs/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var program = await _queryHelper.FindByIdAsync("incentive_programs", id);
        if (program == null) return NotFound(new { error = "Program not found" });
        return Ok(program);
    }

    /// <summary>
    /// Complete scheme preview including KPIs, payout rules, qualifying rules, and stats.
    /// Matches Node.js: GET /api/programs/:id/preview
    /// </summary>
    [HttpGet("api/v1/programs/{id:int}/preview")]
    [HttpGet("api/programs/{id:int}/preview")]
    public async Task<IActionResult> GetPreview(int id)
    {
        var result = await _programsRepo.GetProgramPreviewAsync(id);
        if (result == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        return Ok(result);
    }

    // ── Summary (Wave 2) ────────────────────────────────

    /// <summary>
    /// Get program summary with KPI count, payout rule count, agent count, and results existence.
    /// Matches Node.js: GET /api/programs/:id/summary
    /// </summary>
    [HttpGet("api/v1/programs/{id:int}/summary")]
    [HttpGet("api/programs/{id:int}/summary")]
    public async Task<IActionResult> GetSummary(int id)
    {
        var result = await _programsRepo.GetProgramSummaryAsync(id);
        if (result == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        return Ok(result);
    }

    // ── Create (Wave 2) ─────────────────────────────────

    /// <summary>
    /// Create a new incentive program.
    /// Matches Node.js: POST /api/programs → insertRow('incentive_programs', body)
    /// </summary>
    [HttpPost("api/v1/programs")]
    [HttpPost("api/programs")]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object?> body)
    {
        var row = await _queryHelper.InsertRowAsync("incentive_programs", body);
        return StatusCode(201, row);
    }

    // ── Update (Wave 2) ─────────────────────────────────

    /// <summary>
    /// Update an incentive program.
    /// Matches Node.js: PUT /api/programs/:id → filter protected fields, updateRow
    /// </summary>
    [HttpPut("api/v1/programs/{id:int}")]
    [HttpPut("api/programs/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object?> body)
    {
        // Filter out protected fields (matches Node.js behavior)
        var updates = new Dictionary<string, object?>();
        foreach (var kv in body)
        {
            if (!ProtectedFields.Contains(kv.Key))
                updates[kv.Key] = kv.Value;
        }

        if (updates.Count == 0)
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "At least one updatable field is required" });

        var row = await _queryHelper.UpdateRowAsync("incentive_programs", id, updates);
        if (row == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        return Ok(row);
    }

    // ── Status update (Wave 2) ──────────────────────────

    /// <summary>
    /// Update program status with business rule validation.
    /// Matches Node.js: PATCH /api/programs/:id/status
    /// Validations:
    /// - Status must be DRAFT, ACTIVE, or CLOSED
    /// - Cannot go from CLOSED → ACTIVE
    /// - When activating: no overlap, must have KPIs, must have payout rules
    /// </summary>
    [HttpPatch("api/v1/programs/{id:int}/status")]
    [HttpPatch("api/programs/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] Dictionary<string, object?> body)
    {
        // 1. Validate status value
        if (!body.TryGetValue("status", out var statusObj) || statusObj == null)
            throw new ApiException(ErrorCodes.VAL_003, new { field = "status", allowed = ValidStatuses });

        var newStatus = statusObj.ToString()!;
        if (!ValidStatuses.Contains(newStatus))
            throw new ApiException(ErrorCodes.VAL_003, new { field = "status", allowed = ValidStatuses });

        // 2. Fetch current program
        var program = await _queryHelper.FindByIdAsync("incentive_programs", id);
        if (program == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        // Extract current status and dates from dynamic
        string currentStatus = "";
        int? channelId = null;
        DateTime? startDate = null;
        DateTime? endDate = null;

        if (program is IDictionary<string, object> dict)
        {
            if (dict.TryGetValue("status", out var cs))
                currentStatus = cs?.ToString() ?? "";
            if (dict.TryGetValue("channel_id", out var cid))
                channelId = cid as int?;
            if (dict.TryGetValue("start_date", out var sd) && sd != null)
                startDate = Convert.ToDateTime(sd);
            if (dict.TryGetValue("end_date", out var ed) && ed != null)
                endDate = Convert.ToDateTime(ed);
        }

        // 3. Cannot transition from CLOSED back to ACTIVE
        if (currentStatus == "CLOSED" && newStatus == "ACTIVE")
            throw new ApiException(ErrorCodes.BUS_001, new { current = currentStatus, requested = newStatus });

        // 4. Extra checks when activating
        if (newStatus == "ACTIVE")
        {
            // Check overlapping active programs for same channel
            if (channelId != null && startDate != null && endDate != null)
            {
                var overlapping = await _programsRepo.GetOverlappingActiveProgramsAsync(
                    id, channelId.Value, startDate.Value, endDate.Value);
                if (overlapping.Any())
                    throw new ApiException(ErrorCodes.BUS_002,
                        new { conflicting_program_ids = overlapping.ToList() });
            }

            // Check KPI rules exist
            var kpiCount = await _programsRepo.GetKpiCountAsync(id);
            if (kpiCount == 0)
                throw new ApiException(ErrorCodes.BUS_007);

            // Check payout rules exist
            var payoutCount = await _programsRepo.GetPayoutRuleCountAsync(id);
            if (payoutCount == 0)
                throw new ApiException(ErrorCodes.BUS_006);
        }

        // 5. Update status
        var updated = await _queryHelper.UpdateRowAsync("incentive_programs", id,
            new Dictionary<string, object?> { ["status"] = newStatus });

        // 6. Return updated program
        return Ok(updated);
    }

    // ── Delete (Wave 2) ─────────────────────────────────

    /// <summary>
    /// Delete an incentive program.
    /// Matches Node.js: DELETE /api/programs/:id → deleteRow('incentive_programs', id)
    /// </summary>
    [HttpDelete("api/v1/programs/{id:int}")]
    [HttpDelete("api/programs/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var row = await _queryHelper.DeleteRowAsync("incentive_programs", id);
        if (row == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "program" });

        return Ok(row);
    }
}
