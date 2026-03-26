using Incentive.Application.Abstractions.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// System status endpoints.
/// Ported from server/src/routes/systemStatus.js.
/// Auth: userAuth (placeholder — currently passes through in Node.js).
/// NOTE: Node.js userAuth middleware is a placeholder that passes all requests through.
///       We match that behavior here — no actual auth enforcement.
/// </summary>
[ApiController]
public class SystemStatusController : ControllerBase
{
    private readonly ISystemStatusRepository _statusRepo;

    public SystemStatusController(ISystemStatusRepository statusRepo) => _statusRepo = statusRepo;

    /// <summary>
    /// System health and integration status.
    /// Returns integration sync timestamps, job counts, and system health indicators.
    /// </summary>
    [HttpGet("api/v1/system-status/summary")]
    [HttpGet("api/system-status/summary")]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _statusRepo.GetSummaryAsync();
        return Ok(result);
    }
}
