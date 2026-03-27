namespace IncentiveApi.Controllers;

using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public class GroupsController : ControllerBase
{
    private const string GroupTable = "user_groups";
    private const string MemberTable = "group_members";

    private readonly QueryHelper _qh;

    public GroupsController(QueryHelper qh)
    {
        _qh = qh;
    }

    // ── User Groups ──────────────────────────────────────────────────

    // GET /groups
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _qh.FindAllAsync(GroupTable);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // GET /groups/:id (includes nested members)
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var group = await _qh.FindByIdAsync(GroupTable, id);
        if (group is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "group" });

        var members = await _qh.FindAllAsync(MemberTable,
            new Dictionary<string, object> { ["group_id"] = id });

        var result = new Dictionary<string, object?>();
        foreach (var prop in (IDictionary<string, object>)group)
            result[prop.Key] = prop.Value;
        result["members"] = members;

        return Ok(ApiResponse<object>.Ok(result));
    }

    // POST /groups
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync(GroupTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /groups/:id
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.UpdateRowAsync(GroupTable, id, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "group" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /groups/:id
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _qh.DeleteRowAsync(GroupTable, id);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "group" });
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    // ── Nested Group Members ─────────────────────────────────────────

    // GET /groups/:groupId/members
    [HttpGet("{groupId:int}/members")]
    public async Task<IActionResult> GetMembers(int groupId)
    {
        var rows = await _qh.FindAllAsync(MemberTable,
            new Dictionary<string, object> { ["group_id"] = groupId });
        return Ok(ApiResponse<object>.Ok(rows));
    }

    // POST /groups/:groupId/members
    [HttpPost("{groupId:int}/members")]
    public async Task<IActionResult> CreateMember(int groupId, [FromBody] Dictionary<string, object> body)
    {
        body["group_id"] = groupId;
        var row = await _qh.InsertRowAsync(MemberTable, body);
        return StatusCode(201, ApiResponse<object>.Ok(row));
    }

    // PUT /groups/:groupId/members/:memberId
    [HttpPut("{groupId:int}/members/{memberId:int}")]
    public async Task<IActionResult> UpdateMember(int groupId, int memberId,
        [FromBody] Dictionary<string, object> body)
    {
        _ = groupId;
        var row = await _qh.UpdateRowAsync(MemberTable, memberId, body);
        if (row is null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "member" });
        return Ok(ApiResponse<object>.Ok(row));
    }

    // DELETE /groups/:groupId/members/:memberId
    [HttpDelete("{groupId:int}/members/{memberId:int}")]
    public async Task<IActionResult> DeleteMember(int groupId, int memberId)
    {
        _ = groupId;
        var deleted = await _qh.DeleteRowAsync(MemberTable, memberId);
        if (!deleted)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "member" });
        return Ok(ApiResponse<object>.Ok(new { id = memberId }));
    }
}
