using System.Data;
using System.Text.RegularExpressions;
using Dapper;

namespace Incentive.Infrastructure.Data;

/// <summary>
/// Generic CRUD helper using Dapper, matching the Node.js db/queryHelper.js contract.
/// All table/column names are validated against a safe identifier pattern.
/// </summary>
public partial class QueryHelper
{
    private readonly DbConnectionFactory _db;

    [GeneratedRegex(@"^[a-zA-Z_][a-zA-Z0-9_]*$")]
    private static partial Regex SafeIdentifierRegex();

    public QueryHelper(DbConnectionFactory db) => _db = db;

    private static void AssertIdentifier(string name, string label = "identifier")
    {
        if (!SafeIdentifierRegex().IsMatch(name))
            throw new ArgumentException($"Invalid {label}: {name}");
    }

    /// <summary>
    /// SELECT * FROM table WHERE conditions ORDER BY orderBy.
    /// </summary>
    public async Task<IEnumerable<dynamic>> FindAllAsync(
        string table,
        Dictionary<string, object>? conditions = null,
        string orderBy = "id")
    {
        AssertIdentifier(table, "table name");
        AssertIdentifier(orderBy, "orderBy column");

        var sql = $"SELECT * FROM {table}";
        var parameters = new DynamicParameters();

        if (conditions is { Count: > 0 })
        {
            var clauses = new List<string>();
            var i = 0;
            foreach (var (key, value) in conditions)
            {
                AssertIdentifier(key, "column name");
                clauses.Add($"{key} = @p{i}");
                parameters.Add($"p{i}", value);
                i++;
            }
            sql += $" WHERE {string.Join(" AND ", clauses)}";
        }

        sql += $" ORDER BY {orderBy}";

        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryAsync(sql, parameters);
    }

    /// <summary>
    /// SELECT * FROM table WHERE id = @id.
    /// </summary>
    public async Task<dynamic?> FindByIdAsync(string table, int id)
    {
        AssertIdentifier(table, "table name");
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync($"SELECT * FROM {table} WHERE id = @id", new { id });
    }

    /// <summary>
    /// INSERT INTO table (...) VALUES (...) RETURNING *.
    /// </summary>
    public async Task<dynamic?> InsertRowAsync(string table, Dictionary<string, object?> data)
    {
        AssertIdentifier(table, "table name");
        var keys = data.Keys.ToList();
        keys.ForEach(k => AssertIdentifier(k, "column name"));

        var columns = string.Join(", ", keys);
        var paramNames = string.Join(", ", keys.Select(k => $"@{k}"));

        var sql = $"INSERT INTO {table} ({columns}) VALUES ({paramNames}) RETURNING *";

        var parameters = new DynamicParameters();
        foreach (var (key, value) in data)
            parameters.Add(key, value);

        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(sql, parameters);
    }

    /// <summary>
    /// UPDATE table SET ... WHERE id = @id RETURNING *.
    /// </summary>
    public async Task<dynamic?> UpdateRowAsync(string table, int id, Dictionary<string, object?> data)
    {
        AssertIdentifier(table, "table name");
        var keys = data.Keys.ToList();
        keys.ForEach(k => AssertIdentifier(k, "column name"));

        var setClauses = keys.Select((k, i) => $"{k} = @{k}");
        var sql = $"UPDATE {table} SET {string.Join(", ", setClauses)} WHERE id = @_id RETURNING *";

        var parameters = new DynamicParameters();
        foreach (var (key, value) in data)
            parameters.Add(key, value);
        parameters.Add("_id", id);

        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync(sql, parameters);
    }

    /// <summary>
    /// DELETE FROM table WHERE id = @id RETURNING *.
    /// </summary>
    public async Task<dynamic?> DeleteRowAsync(string table, int id)
    {
        AssertIdentifier(table, "table name");
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync($"DELETE FROM {table} WHERE id = @id RETURNING *", new { id });
    }

    /// <summary>
    /// Execute a raw parameterized query and return typed results.
    /// </summary>
    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryAsync<T>(sql, param);
    }

    /// <summary>
    /// Execute a raw parameterized query and return dynamic results.
    /// </summary>
    public async Task<IEnumerable<dynamic>> QueryAsync(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryAsync(sql, param);
    }

    /// <summary>
    /// Execute a raw parameterized query and return the first result or default.
    /// </summary>
    public async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
    }

    /// <summary>
    /// Execute a non-query SQL command. Returns affected row count.
    /// </summary>
    public async Task<int> ExecuteAsync(string sql, object? param = null)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.ExecuteAsync(sql, param);
    }
}
