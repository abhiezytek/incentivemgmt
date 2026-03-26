using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Incentive.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Exception Log endpoints.
/// Ported from server/src/routes/exceptionLog.js (3 endpoints).
/// Auth: Admin/Ops — operational exception management.
/// All operations target the additive operational_exceptions table only.
/// Exception resolution does NOT affect incentive result status.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.AdminOrOps)]
public class ExceptionLogController : ControllerBase
{
    private readonly IExceptionLogRepository _exceptionRepo;

    public ExceptionLogController(IExceptionLogRepository exceptionRepo) =>
        _exceptionRepo = exceptionRepo;

    /// <summary>
    /// List operational exceptions with summary cards.
    /// Summary cards are always unfiltered; list respects filters.
    /// Matches Node.js: GET /api/exception-log
    /// </summary>
    [HttpGet("api/v1/exception-log")]
    [HttpGet("api/exception-log")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? source = null,
        [FromQuery] string? search = null,
        [FromQuery] int limit = 25,
        [FromQuery] int offset = 0)
    {
        var result = await _exceptionRepo.GetExceptionListAsync(
            type, status, severity, source, search, limit, offset);
        return Ok(result);
    }

    /// <summary>
    /// Get exception detail by ID.
    /// Matches Node.js: GET /api/exception-log/:id
    /// </summary>
    [HttpGet("api/v1/exception-log/{id:int}")]
    [HttpGet("api/exception-log/{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var result = await _exceptionRepo.GetExceptionByIdAsync(id);
        if (result == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "id" });

        return Ok(result);
    }

    /// <summary>
    /// Resolve or dismiss an operational exception.
    /// Only updates the additive operational_exceptions table.
    /// Does NOT affect incentive result status or payout workflow.
    /// Matches Node.js: POST /api/exception-log/:id/resolve
    /// </summary>
    [HttpPost("api/v1/exception-log/{id:int}/resolve")]
    [HttpPost("api/exception-log/{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id, [FromBody] Dictionary<string, object?>? body)
    {
        var status = body?.GetValueOrDefault("status")?.ToString() ?? "RESOLVED";
        var resolvedBy = body?.GetValueOrDefault("resolvedBy")?.ToString();
        var note = body?.GetValueOrDefault("note")?.ToString();

        // Validate status enum
        if (status != "RESOLVED" && status != "DISMISSED")
            throw new ApiException(ErrorCodes.VAL_003, new { field = "status", allowed = new[] { "RESOLVED", "DISMISSED" } });

        var result = await _exceptionRepo.ResolveExceptionAsync(id, status, resolvedBy, note);
        if (result == null)
            return NotFound(new { error = "Exception not found or already resolved" });

        return Ok(new { success = true, exception = result });
    }
}
