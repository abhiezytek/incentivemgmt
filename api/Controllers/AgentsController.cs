using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/agents")]
[Route("api/agents")]
public class AgentsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public AgentsController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? channel_id, [FromQuery] int? region_id,
        [FromQuery] string? status, [FromQuery] string? search)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = "SELECT a.*, c.channel_name, r.region_name FROM ins_agents a LEFT JOIN channels c ON a.channel_id = c.id LEFT JOIN ins_regions r ON a.region_id = r.id WHERE 1=1";
        var p = new DynamicParameters();
        if (channel_id.HasValue) { sql += " AND a.channel_id = @channel_id"; p.Add("channel_id", channel_id); }
        if (region_id.HasValue) { sql += " AND a.region_id = @region_id"; p.Add("region_id", region_id); }
        if (!string.IsNullOrEmpty(status)) { sql += " AND a.status = @status"; p.Add("status", status); }
        if (!string.IsNullOrEmpty(search)) { sql += " AND (a.agent_code ILIKE @s OR a.agent_name ILIKE @s)"; p.Add("s", $"%{search}%"); }
        sql += " ORDER BY a.agent_name";
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("ins_agents", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
