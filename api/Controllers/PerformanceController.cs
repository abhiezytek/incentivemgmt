using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/performance")]
[Route("api/performance")]
public class PerformanceController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly QueryHelper _qh;
    private readonly BulkInsertUtil _bulk;

    public PerformanceController(DbConnectionFactory db, QueryHelper qh, BulkInsertUtil bulk)
    {
        _db = db;
        _qh = qh;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? program_id, [FromQuery] string? period)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = "SELECT * FROM performance_data WHERE 1=1";
        var p = new DynamicParameters();
        if (program_id.HasValue) { sql += " AND program_id = @program_id"; p.Add("program_id", program_id); }
        if (!string.IsNullOrEmpty(period)) { sql += " AND period = @period"; p.Add("period", period); }
        sql += " ORDER BY created_at DESC";
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> body)
    {
        var row = await _qh.InsertRowAsync("performance_data", body);
        return Created("", ApiResponse<object>.Ok(row));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("performance_data", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
