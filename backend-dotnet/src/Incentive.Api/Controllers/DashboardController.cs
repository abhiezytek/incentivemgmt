using Incentive.Application.Abstractions.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Dashboard endpoints.
/// Ported from server/src/routes/executiveSummary.js.
/// Auth: NONE (matches Node.js — no auth middleware on this route).
/// </summary>
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly IDashboardRepository _dashboardRepo;

    public DashboardController(IDashboardRepository dashboardRepo) => _dashboardRepo = dashboardRepo;

    /// <summary>
    /// Executive summary for the redesigned dashboard.
    /// Returns KPI cards, alerts, channel performance, and recent activity.
    /// </summary>
    [HttpGet("api/v1/dashboard/executive-summary")]
    [HttpGet("api/dashboard/executive-summary")]
    public async Task<IActionResult> GetExecutiveSummary(
        [FromQuery] int? programId = null,
        [FromQuery] string? period = null)
    {
        DateOnly? periodDate = null;
        if (!string.IsNullOrEmpty(period) && DateOnly.TryParse(period, out var parsed))
            periodDate = parsed;

        var result = await _dashboardRepo.GetExecutiveSummaryAsync(programId, periodDate);
        return Ok(result);
    }
}
