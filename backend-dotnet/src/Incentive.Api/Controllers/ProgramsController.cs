using Incentive.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Example controller demonstrating the pattern for Wave 1 migration.
/// GET /api/v1/programs and /api/programs (unversioned alias).
/// </summary>
[ApiController]
public class ProgramsController : ControllerBase
{
    private readonly QueryHelper _queryHelper;

    public ProgramsController(QueryHelper queryHelper) => _queryHelper = queryHelper;

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

    // Additional endpoints (POST, PUT, PATCH /status, DELETE, GET /summary, GET /preview)
    // will be implemented in Wave 2. See ROUTE_MIGRATION_MATRIX.md for the full list.
}
