using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/persistency-data")]
[Route("api/persistency-data")]
public class PersistencyDataController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public PersistencyDataController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? agent_code, [FromQuery] string? period)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = "SELECT * FROM ins_persistency_data WHERE 1=1";
        var p = new DynamicParameters();
        if (!string.IsNullOrEmpty(agent_code)) { sql += " AND agent_code = @agent_code"; p.Add("agent_code", agent_code); }
        if (!string.IsNullOrEmpty(period)) { sql += " AND period = @period"; p.Add("period", period); }
        sql += " ORDER BY created_at DESC";
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("ins_persistency_data", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
