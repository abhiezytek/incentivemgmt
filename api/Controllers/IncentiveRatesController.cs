using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/incentive-rates")]
[Route("api/incentive-rates")]
public class IncentiveRatesController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public IncentiveRatesController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? product_code, [FromQuery] string? transaction_type, [FromQuery] bool? is_active)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = @"SELECT r.*, c.channel_name FROM ins_incentive_rates r
                    LEFT JOIN channels c ON r.channel_id = c.id WHERE 1=1";
        var p = new DynamicParameters();
        if (!string.IsNullOrEmpty(product_code)) { sql += " AND r.product_code = @product_code"; p.Add("product_code", product_code); }
        if (!string.IsNullOrEmpty(transaction_type)) { sql += " AND r.transaction_type = @transaction_type"; p.Add("transaction_type", transaction_type); }
        if (is_active.HasValue) { sql += " AND r.is_active = @is_active"; p.Add("is_active", is_active); }
        sql += " ORDER BY r.product_code, r.policy_year";
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("ins_incentive_rates", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
