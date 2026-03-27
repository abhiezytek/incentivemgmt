namespace IncentiveApi.Controllers;

using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class PayoutsController : ControllerBase
{
    private const string RuleTable = "payout_rules";
    private const string SlabTable = "payout_slabs";

    private readonly QueryHelper _qh;

    public PayoutsController(QueryHelper qh)
    {
        _qh = qh;
    }

    // ── Payout Rules ─────────────────────────────────────────────────

    // GET /payouts
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _qh.FindAllAsync(RuleTable);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // GET /payouts/:id (includes nested slabs)
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var rule = await _qh.FindByIdAsync(RuleTable, id);
        if (rule is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "payout_rule" });

        var slabs = await _qh.FindAllAsync(SlabTable,
            new Dictionary<string, object> { ["payout_rule_id"] = id }, "sort_order");

        var result = new Dictionary<string, object?>();
        foreach (var prop in (IDictionary<string, object>)rule)
            result[prop.Key] = prop.Value;
        result["slabs"] = slabs;

        return Ok(ApiResponse<object>.Ok(result));
    }

    // POST /payouts
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync(RuleTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /payouts/:id
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.UpdateRowAsync(RuleTable, id, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "payout_rule" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /payouts/:id
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _qh.DeleteRowAsync(RuleTable, id);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "payout_rule" });
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    // ── Nested Slabs ─────────────────────────────────────────────────

    // GET /payouts/:ruleId/slabs
    [HttpGet("{ruleId:int}/slabs")]
    public async Task<IActionResult> GetSlabs(int ruleId)
    {
        var rows = await _qh.FindAllAsync(SlabTable,
            new Dictionary<string, object> { ["payout_rule_id"] = ruleId }, "sort_order");
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // POST /payouts/:ruleId/slabs
    [HttpPost("{ruleId:int}/slabs")]
    public async Task<IActionResult> CreateSlab(int ruleId, [FromBody] Dictionary<string, object> body)
    {
        body["payout_rule_id"] = ruleId;
        var row = await _qh.InsertRowAsync(SlabTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /payouts/:ruleId/slabs/:slabId
    [HttpPut("{ruleId:int}/slabs/{slabId:int}")]
    public async Task<IActionResult> UpdateSlab(int ruleId, int slabId,
        [FromBody] Dictionary<string, object> body)
    {
        _ = ruleId;
        var row = await _qh.UpdateRowAsync(SlabTable, slabId, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "slab" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /payouts/:ruleId/slabs/:slabId
    [HttpDelete("{ruleId:int}/slabs/{slabId:int}")]
    public async Task<IActionResult> DeleteSlab(int ruleId, int slabId)
    {
        _ = ruleId;
        var deleted = await _qh.DeleteRowAsync(SlabTable, slabId);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "slab" });
        return Ok(ApiResponse<object>.Ok(new { id = slabId }));
    }
}
