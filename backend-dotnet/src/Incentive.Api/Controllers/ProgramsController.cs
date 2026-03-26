using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Incentive.Domain.Exceptions;
using Incentive.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Programs controller — read-only endpoints.
/// Auth: NONE (matches Node.js — no auth middleware on programs routes).
/// Wave 1: GET list, GET by ID, GET preview.
/// Wave 2 will add: POST, PUT, PATCH /status, DELETE, GET /summary.
/// </summary>
[ApiController]
public class ProgramsController : ControllerBase
{
    private readonly QueryHelper _queryHelper;
    private readonly IProgramsRepository _programsRepo;

    public ProgramsController(QueryHelper queryHelper, IProgramsRepository programsRepo)
    {
        _queryHelper = queryHelper;
        _programsRepo = programsRepo;
    }

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
    /// Returns 404 with apiError('VAL_006') if program not found.
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

    // Additional endpoints (POST, PUT, PATCH /status, DELETE, GET /summary)
    // will be implemented in Wave 2. See ROUTE_MIGRATION_MATRIX.md for the full list.
}
