namespace IncentiveApi.Data;

using Dapper;
using System.Data;
using System.Text.RegularExpressions;

public partial class QueryHelper
{
    private readonly DbConnectionFactory _db;

    private static readonly Regex SafeIdentifier = GenerateSafeIdentifierRegex();

    public QueryHelper(DbConnectionFactory db)
    {
        _db = db;
    }

    private static void AssertIdentifier(string name, string label = "identifier")
    {
        if (!SafeIdentifier.IsMatch(name))
            throw new ArgumentException($"Invalid {label}: {name}");
    }

    public async Task<IEnumerable<dynamic>> FindAllAsync(
        string table,
        Dictionary<string, object>? where = null,
        string? orderBy = null,
        int? limit = null)
    {
        AssertIdentifier(table, "table name");
        var orderCol = orderBy ?? "id";
        AssertIdentifier(orderCol, "orderBy column");

        var parameters = new DynamicParameters();
        var sql = $"SELECT * FROM {table}";

        if (where is { Count: > 0 })
        {
            var clauses = new List<string>();
            foreach (var kvp in where)
            {
                AssertIdentifier(kvp.Key, "column name");
                clauses.Add($"{kvp.Key} = @w_{kvp.Key}");
                parameters.Add($"w_{kvp.Key}", kvp.Value);
            }
            sql += " WHERE " + string.Join(" AND ", clauses);
        }

        sql += $" ORDER BY {orderCol}";

        if (limit.HasValue)
        {
            sql += " LIMIT @_limit";
            parameters.Add("_limit", limit.Value);
        }

        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryAsync(sql, parameters);
    }

    public async Task<dynamic?> FindByIdAsync(string table, int id)
    {
        AssertIdentifier(table, "table name");
        var sql = $"SELECT * FROM {table} WHERE id = @id";
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(sql, new { id });
    }

    public async Task<dynamic> InsertRowAsync(string table, Dictionary<string, object> data)
    {
        AssertIdentifier(table, "table name");
        var columns = new List<string>();
        var placeholders = new List<string>();
        var parameters = new DynamicParameters();

        foreach (var kvp in data)
        {
            AssertIdentifier(kvp.Key, "column name");
            columns.Add(kvp.Key);
            placeholders.Add($"@{kvp.Key}");
            parameters.Add(kvp.Key, kvp.Value);
        }

        var sql = $"INSERT INTO {table} ({string.Join(", ", columns)}) VALUES ({string.Join(", ", placeholders)}) RETURNING *";
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstAsync(sql, parameters);
    }

    public async Task<dynamic?> UpdateRowAsync(string table, int id, Dictionary<string, object> data)
    {
        AssertIdentifier(table, "table name");
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();

        foreach (var kvp in data)
        {
            AssertIdentifier(kvp.Key, "column name");
            setClauses.Add($"{kvp.Key} = @{kvp.Key}");
            parameters.Add(kvp.Key, kvp.Value);
        }

        parameters.Add("id", id);
        var sql = $"UPDATE {table} SET {string.Join(", ", setClauses)} WHERE id = @id RETURNING *";
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(sql, parameters);
    }

    public async Task<bool> DeleteRowAsync(string table, int id)
    {
        AssertIdentifier(table, "table name");
        var sql = $"DELETE FROM {table} WHERE id = @id";
        using var conn = await _db.CreateConnectionAsync();
        var affected = await conn.ExecuteAsync(sql, new { id });
        return affected > 0;
    }

    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryAsync<T>(sql, param);
    }

    public async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
    }

    public async Task<int> ExecuteAsync(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.ExecuteAsync(sql, param);
    }

    [GeneratedRegex(@"^[a-zA-Z_][a-zA-Z0-9_]*$")]
    private static partial Regex GenerateSafeIdentifierRegex();
}
