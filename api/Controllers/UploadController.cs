namespace IncentiveApi.Controllers;

using System.Globalization;
using System.Text.RegularExpressions;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/[controller]")]
[Route("api/[controller]")]
public partial class UploadController : ControllerBase
{
    private static readonly int[] ValidPersistencyMonths = [13, 25, 37, 49, 61];
    private static readonly Regex DateRegex = GenerateDateRegex();

    private readonly DbConnectionFactory _db;
    private readonly BulkInsertUtil _bulk;

    public UploadController(DbConnectionFactory db, BulkInsertUtil bulk)
    {
        _db = db;
        _bulk = bulk;
    }

    // ── POST /upload/policy-transactions ─────────────────────────────
    [HttpPost("policy-transactions")]
    public async Task<IActionResult> UploadPolicyTransactions(IFormFile file)
    {
        await EnsureNotDuplicate(file.FileName);

        var rows = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());

        string[] required = ["policy_number", "agent_code", "product_code",
            "transaction_type", "premium_amount", "annualized_premium", "paid_date"];
        ValidateColumns(rows, required);

        // Date format validation
        string[] dateFields = ["issue_date", "due_date", "paid_date"];
        ValidateDateFields(rows, dateFields);

        // Pre-fetch lookup maps
        using var conn = await _db.CreateConnectionAsync();

        var channelRows = await conn.QueryAsync("SELECT id, name FROM channels");
        var channelMap = BuildLookup(channelRows, r => ((string)r.name)?.ToUpperInvariant(), r => (int)r.id);

        var regionRows = await conn.QueryAsync("SELECT id, region_code FROM ins_regions");
        var regionMap = BuildLookup(regionRows, r => ((string)r.region_code)?.ToUpperInvariant(), r => (int)r.id);

        var mapped = rows.Select(r =>
        {
            var channelId = GetLookupValue(r, "channel_code", channelMap);
            var regionId = GetLookupValue(r, "region_code", regionMap);
            return new object?[]
            {
                r.GetValueOrDefault("policy_number"),
                r.GetValueOrDefault("agent_code"),
                r.GetValueOrDefault("product_code"),
                channelId, regionId,
                r.GetValueOrDefault("transaction_type"),
                ToIntOrDefault(r.GetValueOrDefault("policy_year"), 1),
                r.GetValueOrDefault("premium_amount"),
                r.GetValueOrDefault("sum_assured"),
                r.GetValueOrDefault("annualized_premium"),
                r.GetValueOrDefault("payment_mode"),
                r.GetValueOrDefault("issue_date"),
                r.GetValueOrDefault("due_date"),
                r.GetValueOrDefault("paid_date"),
                r.GetValueOrDefault("policy_status") ?? "ACTIVE",
                "UPLOAD"
            };
        }).ToList();

        string[] cols = ["policy_number", "agent_code", "product_code", "channel_id", "region_id",
            "transaction_type", "policy_year", "premium_amount", "sum_assured",
            "annualized_premium", "payment_mode", "issue_date", "due_date",
            "paid_date", "policy_status", "source_system"];

        var typeMap = new Dictionary<string, string>
        {
            ["policy_year"] = "int", ["premium_amount"] = "numeric", ["sum_assured"] = "numeric",
            ["annualized_premium"] = "numeric", ["channel_id"] = "int", ["region_id"] = "int",
            ["issue_date"] = "date", ["due_date"] = "date", ["paid_date"] = "date"
        };

        var count = await _bulk.BulkInsertTypedAsync("ins_policy_transactions", cols, typeMap, mapped,
            """
            ON CONFLICT (policy_number, transaction_type, due_date)
            DO UPDATE SET premium_amount=EXCLUDED.premium_amount,
            paid_date=EXCLUDED.paid_date, policy_status=EXCLUDED.policy_status
            """);

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
            inserted = count,
            total = rows.Count,
            skipped = rows.Count - count
        }));
    }

    // ── POST /upload/agents ──────────────────────────────────────────
    [HttpPost("agents")]
    public async Task<IActionResult> UploadAgents(IFormFile file)
    {
        await EnsureNotDuplicate(file.FileName);

        var rows = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());

        string[] required = ["agent_code", "agent_name", "channel_code", "region_code", "hierarchy_level"];
        ValidateColumns(rows, required);

        using var conn = await _db.CreateConnectionAsync();

        var channelRows = await conn.QueryAsync("SELECT id, name FROM channels");
        var channelMap = BuildLookup(channelRows, r => ((string)r.name)?.ToUpperInvariant(), r => (int)r.id);

        var regionRows = await conn.QueryAsync("SELECT id, region_code FROM ins_regions");
        var regionMap = BuildLookup(regionRows, r => ((string)r.region_code)?.ToUpperInvariant(), r => (int)r.id);

        var existingAgents = await conn.QueryAsync("SELECT id, agent_code FROM ins_agents");
        var agentLookup = BuildLookup(existingAgents,
            r => ((string)r.agent_code)?.ToUpperInvariant(), r => (int)r.id);

        var mapped = rows.Select(r =>
        {
            var channelId = GetLookupValue(r, "channel_code", channelMap);
            var regionId = GetLookupValue(r, "region_code", regionMap);
            var parentAgentCode = r.GetValueOrDefault("parent_agent_code")?.ToString();
            object? parentId = !string.IsNullOrEmpty(parentAgentCode)
                ? agentLookup.GetValueOrDefault(parentAgentCode.ToUpperInvariant())
                : null;

            return new object?[]
            {
                r.GetValueOrDefault("agent_code"),
                r.GetValueOrDefault("agent_name"),
                channelId, regionId,
                r.GetValueOrDefault("branch_code"),
                r.GetValueOrDefault("license_number"),
                r.GetValueOrDefault("license_expiry"),
                r.GetValueOrDefault("activation_date"),
                parentId,
                ToIntOrDefault(r.GetValueOrDefault("hierarchy_level"), 1),
                r.GetValueOrDefault("status") ?? "ACTIVE"
            };
        }).ToList();

        string[] cols = ["agent_code", "agent_name", "channel_id", "region_id", "branch_code",
            "license_number", "license_expiry", "activation_date",
            "parent_agent_id", "hierarchy_level", "status"];

        var typeMap = new Dictionary<string, string>
        {
            ["channel_id"] = "int", ["region_id"] = "int", ["parent_agent_id"] = "int",
            ["hierarchy_level"] = "int", ["license_expiry"] = "date", ["activation_date"] = "date"
        };

        var count = await _bulk.BulkInsertTypedAsync("ins_agents", cols, typeMap, mapped,
            """
            ON CONFLICT (agent_code) DO UPDATE SET
            agent_name=EXCLUDED.agent_name, status=EXCLUDED.status,
            parent_agent_id=EXCLUDED.parent_agent_id
            """);

        // Update hierarchy_path after all agents inserted
        await conn.ExecuteAsync(
            """
            UPDATE ins_agents a SET hierarchy_path =
              CASE WHEN parent_agent_id IS NULL THEN id::text
                   ELSE (SELECT hierarchy_path FROM ins_agents p
                         WHERE p.id = a.parent_agent_id) || '.' || a.id::text
              END
            """);

        return Ok(ApiResponse<object>.Ok(new { success = true, inserted = count }));
    }

    // ── POST /upload/persistency ─────────────────────────────────────
    [HttpPost("persistency")]
    public async Task<IActionResult> UploadPersistency(IFormFile file, [FromForm] int programId)
    {
        await EnsureNotDuplicate(file.FileName);

        var rows = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());

        string[] required = ["agent_code", "persistency_month", "period_start",
            "period_end", "policies_due", "policies_renewed"];
        ValidateColumns(rows, required);

        // Row-level persistency validation
        var invalidRows = new List<object>();
        var validRows = new List<Dictionary<string, object?>>();

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var monthStr = row.GetValueOrDefault("persistency_month")?.ToString();
            if (!int.TryParse(monthStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out var month)
                || !ValidPersistencyMonths.Contains(month))
            {
                invalidRows.Add(new
                {
                    row = i + 2,
                    agent_code = row.GetValueOrDefault("agent_code"),
                    persistency_month = row.GetValueOrDefault("persistency_month"),
                    error = $"VAL_010: persistency_month must be one of: {string.Join(", ", ValidPersistencyMonths)}"
                });
            }
            else if (!TryParsePositiveNumber(row.GetValueOrDefault("policies_due")))
            {
                invalidRows.Add(new
                {
                    row = i + 2,
                    error = "VAL_004: policies_due must be a positive number"
                });
            }
            else if (ToDecimal(row.GetValueOrDefault("policies_renewed")) > ToDecimal(row.GetValueOrDefault("policies_due")))
            {
                invalidRows.Add(new
                {
                    row = i + 2,
                    error = "VAL_004: policies_renewed cannot exceed policies_due"
                });
            }
            else
            {
                validRows.Add(row);
            }
        }

        if (invalidRows.Count > 0 && validRows.Count == 0)
        {
            return StatusCode(ErrorCodes.VAL_010.Status,
                ApiResponse<object>.Fail(ErrorCodes.VAL_010.Code, "All rows failed validation",
                    new { invalid_rows = invalidRows }));
        }

        var mapped = validRows.Select(r => new object?[]
        {
            r.GetValueOrDefault("agent_code"),
            programId,
            r.GetValueOrDefault("persistency_month"),
            r.GetValueOrDefault("period_start"),
            r.GetValueOrDefault("period_end"),
            r.GetValueOrDefault("policies_due"),
            r.GetValueOrDefault("policies_renewed")
        }).ToList();

        string[] cols = ["agent_code", "program_id", "persistency_month",
            "period_start", "period_end", "policies_due", "policies_renewed"];

        var typeMap = new Dictionary<string, string>
        {
            ["program_id"] = "int", ["persistency_month"] = "int",
            ["policies_due"] = "int", ["policies_renewed"] = "int",
            ["period_start"] = "date", ["period_end"] = "date"
        };

        var count = await _bulk.BulkInsertTypedAsync("ins_persistency_data", cols, typeMap, mapped,
            """
            ON CONFLICT (agent_code, program_id, persistency_month, period_start)
            DO UPDATE SET policies_due=EXCLUDED.policies_due,
            policies_renewed=EXCLUDED.policies_renewed
            """);

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
            inserted = count,
            skipped = invalidRows.Count,
            invalid_rows = invalidRows,
            total = rows.Count
        }));
    }

    // ── POST /upload/incentive-rates ─────────────────────────────────
    [HttpPost("incentive-rates")]
    public async Task<IActionResult> UploadIncentiveRates(IFormFile file, [FromForm] int programId)
    {
        await EnsureNotDuplicate(file.FileName);

        var rows = await CsvParserUtil.ParseCsvAsync(file.OpenReadStream());

        using var conn = await _db.CreateConnectionAsync();

        // Product code existence check
        var products = await conn.QueryAsync<string>(
            "SELECT product_code FROM ins_products WHERE is_active=TRUE");
        var validCodes = new HashSet<string>(products);

        var unknownProducts = rows
            .Select(r => r.GetValueOrDefault("product_code")?.ToString())
            .Where(code => !string.IsNullOrEmpty(code) && !validCodes.Contains(code!))
            .Distinct()
            .ToList();

        if (unknownProducts.Count > 0)
            throw new ApiException(ErrorCodes.VAL_006, new { unknown_products = unknownProducts });

        // Date format validation
        string[] dateFields = ["effective_from", "effective_to"];
        ValidateDateFields(rows, dateFields);

        // Pre-fetch channel lookup
        var channelRows = await conn.QueryAsync("SELECT id, name FROM channels");
        var channelMap = BuildLookup(channelRows, r => ((string)r.name)?.ToUpperInvariant(), r => (int)r.id);

        var mapped = rows.Select(r =>
        {
            var channelId = GetLookupValue(r, "channel_code", channelMap);
            return new object?[]
            {
                programId,
                r.GetValueOrDefault("product_code"),
                channelId,
                r.GetValueOrDefault("policy_year"),
                r.GetValueOrDefault("transaction_type"),
                r.GetValueOrDefault("rate_type"),
                r.GetValueOrDefault("incentive_rate"),
                r.GetValueOrDefault("min_premium_slab") ?? "0",
                r.GetValueOrDefault("max_premium_slab") ?? "999999999",
                r.GetValueOrDefault("min_policy_term") ?? "0",
                r.GetValueOrDefault("max_policy_term") ?? "99",
                r.GetValueOrDefault("effective_from"),
                r.GetValueOrDefault("effective_to"),
                true
            };
        }).ToList();

        string[] cols = ["program_id", "product_code", "channel_id", "policy_year",
            "transaction_type", "rate_type", "incentive_rate",
            "min_premium_slab", "max_premium_slab", "min_policy_term",
            "max_policy_term", "effective_from", "effective_to", "is_active"];

        var typeMap = new Dictionary<string, string>
        {
            ["program_id"] = "int", ["channel_id"] = "int", ["policy_year"] = "int",
            ["incentive_rate"] = "numeric", ["min_premium_slab"] = "numeric",
            ["max_premium_slab"] = "numeric", ["min_policy_term"] = "int",
            ["max_policy_term"] = "int", ["effective_from"] = "date", ["effective_to"] = "date",
            ["is_active"] = "boolean"
        };

        var count = await _bulk.BulkInsertTypedAsync("ins_incentive_rates", cols, typeMap, mapped, "");

        return Ok(ApiResponse<object>.Ok(new { success = true, inserted = count }));
    }

    // ── Private helpers ──────────────────────────────────────────────

    private async Task EnsureNotDuplicate(string filename)
    {
        using var conn = await _db.CreateConnectionAsync();
        var exists = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT id FROM file_processing_log WHERE file_name=@filename AND status='SUCCESS'",
            new { filename });
        if (exists.HasValue)
            throw new ApiException(ErrorCodes.INT_003);
    }

    private static void ValidateColumns(List<Dictionary<string, object?>> rows, string[] required)
    {
        if (rows.Count == 0)
            throw new ApiException(ErrorCodes.VAL_007, new { message = "File is empty" });

        var headers = rows[0].Keys.ToHashSet();
        var missing = required.Where(c => !headers.Contains(c)).ToArray();
        if (missing.Length > 0)
            throw new ApiException(ErrorCodes.VAL_007, new { message = $"Missing columns: {string.Join(", ", missing)}" });
    }

    private static bool IsValidDate(string? str)
    {
        if (string.IsNullOrEmpty(str)) return false;
        var match = DateRegex.Match(str);
        if (!match.Success) return false;
        var y = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var m = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        var d = int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
        try
        {
            var date = new DateTime(y, m, d);
            return date.Year == y && date.Month == m && date.Day == d;
        }
        catch
        {
            return false;
        }
    }

    private static void ValidateDateFields(List<Dictionary<string, object?>> rows, string[] dateFields)
    {
        var dateErrors = new List<object>();
        for (var i = 0; i < rows.Count; i++)
        {
            foreach (var field in dateFields)
            {
                var val = rows[i].GetValueOrDefault(field)?.ToString();
                if (!string.IsNullOrEmpty(val) && !IsValidDate(val))
                {
                    dateErrors.Add(new { row = i + 2, field, value = val });
                }
            }
        }

        if (dateErrors.Count > 0)
            throw new ApiException(ErrorCodes.VAL_002, new { invalid_dates = dateErrors });
    }

    private static Dictionary<string, int> BuildLookup(
        IEnumerable<dynamic> dbRows,
        Func<dynamic, string?> keySelector,
        Func<dynamic, int> valueSelector)
    {
        var dict = new Dictionary<string, int>();
        foreach (var r in dbRows)
        {
            var key = keySelector(r);
            if (key != null)
                dict[key] = valueSelector(r);
        }
        return dict;
    }

    private static object? GetLookupValue(Dictionary<string, object?> row, string field,
        Dictionary<string, int> lookup)
    {
        var code = row.GetValueOrDefault(field)?.ToString();
        if (string.IsNullOrEmpty(code)) return null;
        return lookup.TryGetValue(code.ToUpperInvariant(), out var id) ? id : null;
    }

    private static object ToIntOrDefault(object? value, int defaultValue)
    {
        if (value is null) return defaultValue;
        var str = value.ToString();
        return int.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed : defaultValue;
    }

    private static bool TryParsePositiveNumber(object? value)
    {
        if (value is null || string.IsNullOrEmpty(value.ToString())) return false;
        return decimal.TryParse(value.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var num) && num >= 0;
    }

    private static decimal ToDecimal(object? value)
    {
        if (value is null) return 0;
        return decimal.TryParse(value.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var num) ? num : 0;
    }

    [GeneratedRegex(@"^(\d{4})-(\d{2})-(\d{2})$")]
    private static partial Regex GenerateDateRegex();
}
