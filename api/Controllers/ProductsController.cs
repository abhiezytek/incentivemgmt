using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/products")]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public ProductsController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? product_category, [FromQuery] string? product_type, [FromQuery] bool? is_active)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = "SELECT * FROM ins_products WHERE 1=1";
        var p = new DynamicParameters();
        if (!string.IsNullOrEmpty(product_category)) { sql += " AND product_category = @product_category"; p.Add("product_category", product_category); }
        if (!string.IsNullOrEmpty(product_type)) { sql += " AND product_type = @product_type"; p.Add("product_type", product_type); }
        if (is_active.HasValue) { sql += " AND is_active = @is_active"; p.Add("is_active", is_active); }
        sql += " ORDER BY product_name";
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(rows));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("ins_products", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
