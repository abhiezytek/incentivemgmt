using Microsoft.AspNetCore.Mvc;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;

namespace IncentiveApi.Controllers;

[ApiController]
[Route("api/v1/policy-transactions")]
[Route("api/policy-transactions")]
public class PolicyTransactionsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public PolicyTransactionsController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? agent_code, [FromQuery] string? period_start,
        [FromQuery] string? period_end, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        await using var conn = (Npgsql.NpgsqlConnection)await _db.CreateConnectionAsync();
        var sql = "SELECT * FROM ins_policy_transactions WHERE 1=1";
        var countSql = "SELECT COUNT(*) FROM ins_policy_transactions WHERE 1=1";
        var p = new DynamicParameters();
        if (!string.IsNullOrEmpty(agent_code)) { sql += " AND agent_code = @agent_code"; countSql += " AND agent_code = @agent_code"; p.Add("agent_code", agent_code); }
        if (!string.IsNullOrEmpty(period_start)) { sql += " AND transaction_date >= @ps::date"; countSql += " AND transaction_date >= @ps::date"; p.Add("ps", period_start); }
        if (!string.IsNullOrEmpty(period_end)) { sql += " AND transaction_date <= @pe::date"; countSql += " AND transaction_date <= @pe::date"; p.Add("pe", period_end); }
        var total = await conn.ExecuteScalarAsync<int>(countSql, p);
        sql += " ORDER BY transaction_date DESC LIMIT @limit OFFSET @offset";
        p.Add("limit", limit);
        p.Add("offset", (page - 1) * limit);
        var rows = await conn.QueryAsync(sql, p);
        return Ok(ApiResponse<object>.Ok(new { rows, total, page, limit }));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ApiResponse<object>.Fail("No file provided", "VAL_001", 400));
        var records = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());
        await _bulk.BulkInsertFromDictionariesAsync("ins_policy_transactions", records);
        return Ok(ApiResponse<object>.Ok(new { inserted = records.Count }));
    }
}
