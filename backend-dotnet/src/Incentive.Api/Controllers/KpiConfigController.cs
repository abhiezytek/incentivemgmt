using Incentive.Application.Abstractions.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// KPI Configuration controller — read-only config endpoints + validation.
/// Auth: userAuth (matches Node.js — kpi-config routes use userAuth middleware).
/// NOTE: userAuth is currently a placeholder in Node. We match that behavior.
/// Ported from server/src/routes/kpiConfig.js.
/// </summary>
[ApiController]
public class KpiConfigController : ControllerBase
{
    private readonly IKpiConfigRepository _kpiConfigRepo;

    public KpiConfigController(IKpiConfigRepository kpiConfigRepo)
    {
        _kpiConfigRepo = kpiConfigRepo;
    }

    /// <summary>
    /// KPI configuration registry — all KPIs with milestones, program info, and derived variables.
    /// Matches Node.js: GET /api/kpi-config/registry
    /// </summary>
    [HttpGet("api/v1/kpi-config/registry")]
    [HttpGet("api/kpi-config/registry")]
    public async Task<IActionResult> GetRegistry()
    {
        var result = await _kpiConfigRepo.GetRegistryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Validate KPI configuration — checks milestones, program linkage, payout slab links.
    /// Matches Node.js: POST /api/kpi-config/:id/validate
    /// Returns 404 if KPI not found.
    /// </summary>
    [HttpPost("api/v1/kpi-config/{id:int}/validate")]
    [HttpPost("api/kpi-config/{id:int}/validate")]
    public async Task<IActionResult> Validate(int id)
    {
        var result = await _kpiConfigRepo.ValidateKpiAsync(id);
        if (result == null)
            return NotFound(new { error = "KPI definition not found" });

        return Ok(result);
    }

    /// <summary>
    /// KPI configuration summary — single KPI with milestones, payout slabs, qualifying rules.
    /// Matches Node.js: GET /api/kpi-config/:id/summary
    /// Returns 404 if KPI not found.
    /// </summary>
    [HttpGet("api/v1/kpi-config/{id:int}/summary")]
    [HttpGet("api/kpi-config/{id:int}/summary")]
    public async Task<IActionResult> GetSummary(int id)
    {
        var result = await _kpiConfigRepo.GetKpiSummaryAsync(id);
        if (result == null)
            return NotFound(new { error = "KPI definition not found" });

        return Ok(result);
    }
}
