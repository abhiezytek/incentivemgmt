namespace IncentiveApi.Controllers;

using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class KpisController : ControllerBase
{
    private const string KpiTable = "kpi_definitions";
    private const string MilestoneTable = "kpi_milestones";

    private readonly QueryHelper _qh;

    public KpisController(QueryHelper qh)
    {
        _qh = qh;
    }

    // ── KPI Definitions ──────────────────────────────────────────────

    // GET /kpis
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _qh.FindAllAsync(KpiTable);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // GET /kpis/:id (includes nested milestones)
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var kpi = await _qh.FindByIdAsync(KpiTable, id);
        if (kpi is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "kpi" });

        var milestones = await _qh.FindAllAsync(MilestoneTable,
            new Dictionary<string, object> { ["kpi_id"] = id }, "sort_order");

        var result = new Dictionary<string, object?>();
        foreach (var prop in (IDictionary<string, object>)kpi)
            result[prop.Key] = prop.Value;
        result["milestones"] = milestones;

        return Ok(ApiResponse<object>.Ok(result));
    }

    // POST /kpis
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync(KpiTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /kpis/:id
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.UpdateRowAsync(KpiTable, id, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "kpi" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /kpis/:id
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _qh.DeleteRowAsync(KpiTable, id);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "kpi" });
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    // ── Nested Milestones ────────────────────────────────────────────

    // GET /kpis/:kpiId/milestones
    [HttpGet("{kpiId:int}/milestones")]
    public async Task<IActionResult> GetMilestones(int kpiId)
    {
        var rows = await _qh.FindAllAsync(MilestoneTable,
            new Dictionary<string, object> { ["kpi_id"] = kpiId }, "sort_order");
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // POST /kpis/:kpiId/milestones
    [HttpPost("{kpiId:int}/milestones")]
    public async Task<IActionResult> CreateMilestone(int kpiId, [FromBody] Dictionary<string, object> body)
    {
        body["kpi_id"] = kpiId;
        var row = await _qh.InsertRowAsync(MilestoneTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /kpis/:kpiId/milestones/:milestoneId
    [HttpPut("{kpiId:int}/milestones/{milestoneId:int}")]
    public async Task<IActionResult> UpdateMilestone(int kpiId, int milestoneId,
        [FromBody] Dictionary<string, object> body)
    {
        _ = kpiId; // validated by route constraint; ownership can be verified if needed
        var row = await _qh.UpdateRowAsync(MilestoneTable, milestoneId, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "milestone" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /kpis/:kpiId/milestones/:milestoneId
    [HttpDelete("{kpiId:int}/milestones/{milestoneId:int}")]
    public async Task<IActionResult> DeleteMilestone(int kpiId, int milestoneId)
    {
        _ = kpiId;
        var deleted = await _qh.DeleteRowAsync(MilestoneTable, milestoneId);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "milestone" });
        return Ok(ApiResponse<object>.Ok(new { id = milestoneId }));
    }
}
