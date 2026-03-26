using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// System status endpoints.
/// Ported from server/src/routes/systemStatus.js.
/// Auth: Admin/Ops only — operational monitoring.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.AdminOrOps)]
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
