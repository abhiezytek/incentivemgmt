namespace IncentiveApi.Utils;

using Dapper;
using IncentiveApi.Data;
using System.Text.RegularExpressions;

public partial class BulkInsertUtil
{
    private static readonly Regex IdentRegex = GenerateIdentRegex();
    private static readonly Regex TypeRegex = GenerateTypeRegex();

    private readonly DbConnectionFactory _db;

    public BulkInsertUtil(DbConnectionFactory db)
    {
        _db = db;
    }

    private static void AssertIdentifier(string name)
    {
        if (!IdentRegex.IsMatch(name))
            throw new ArgumentException($"Invalid SQL identifier: {name}");
    }

    private static void AssertType(string type)
    {
        if (!TypeRegex.IsMatch(type))
            throw new ArgumentException($"Invalid SQL type: {type}");
    }

    /// <summary>
    /// Generic bulk insert using UNNEST. All columns are cast to text[].
    /// </summary>
    /// <param name="tableName">Target table name</param>
    /// <param name="columns">Column names</param>
    /// <param name="rows">List of rows, each row is a list of values in column order</param>
    /// <param name="onConflict">Optional ON CONFLICT clause, e.g. "ON CONFLICT (id) DO NOTHING"</param>
    /// <returns>Number of rows inserted</returns>
    public async Task<int> BulkInsertAsync(
        string tableName,
        string[] columns,
        List<object?[]> rows,
        string? onConflict = null)
    {
        if (rows.Count == 0) return 0;

        AssertIdentifier(tableName);
        foreach (var col in columns) AssertIdentifier(col);

        var parameters = new DynamicParameters();
        var unnestParams = new List<string>();

        for (var ci = 0; ci < columns.Length; ci++)
        {
            var colArray = rows.Select(r => ci < r.Length ? r[ci]?.ToString() : null).ToArray();
            var paramName = $"p{ci}";
            parameters.Add(paramName, colArray);
            unnestParams.Add($"@{paramName}::text[]");
        }

        var sql = $"""
            INSERT INTO {tableName} ({string.Join(", ", columns)})
            SELECT * FROM UNNEST({string.Join(", ", unnestParams)})
            AS t({string.Join(", ", columns)})
            {onConflict ?? ""}
            """;

        using var conn = await _db.CreateConnectionAsync();
        return await conn.ExecuteAsync(sql, parameters);
    }

    /// <summary>
    /// Typed bulk insert — more performant when column types are known.
    /// </summary>
    /// <param name="tableName">Target table name</param>
    /// <param name="columns">Column names</param>
    /// <param name="typeMap">Mapping of column name to PostgreSQL type (e.g. "integer", "text")</param>
    /// <param name="rows">List of rows, each row is a list of values in column order</param>
    /// <param name="onConflict">Optional ON CONFLICT clause</param>
    /// <returns>Number of rows inserted</returns>
    public async Task<int> BulkInsertTypedAsync(
        string tableName,
        string[] columns,
        Dictionary<string, string> typeMap,
        List<object?[]> rows,
        string? onConflict = null)
    {
        if (rows.Count == 0) return 0;

        AssertIdentifier(tableName);
        foreach (var col in columns) AssertIdentifier(col);

        var parameters = new DynamicParameters();
        var unnestParams = new List<string>();

        for (var ci = 0; ci < columns.Length; ci++)
        {
            var col = columns[ci];
            var colArray = rows.Select(r => ci < r.Length ? r[ci]?.ToString() : null).ToArray();
            var paramName = $"p{ci}";
            parameters.Add(paramName, colArray);

            var pgType = typeMap.GetValueOrDefault(col, "text");
            AssertType(pgType);
            unnestParams.Add($"@{paramName}::{pgType}[]");
        }

        var sql = $"""
            INSERT INTO {tableName} ({string.Join(", ", columns)})
            SELECT * FROM UNNEST({string.Join(", ", unnestParams)})
            AS t({string.Join(", ", columns)})
            {onConflict ?? ""}
            """;

        using var conn = await _db.CreateConnectionAsync();
        return await conn.ExecuteAsync(sql, parameters);
    }

    /// <summary>
    /// Convenience method: bulk insert from a list of dictionaries.
    /// Columns are inferred from the keys of the first dictionary.
    /// </summary>
    public async Task<int> BulkInsertFromDictionariesAsync(
        string tableName,
        List<Dictionary<string, object?>> data,
        string? onConflict = null)
    {
        if (data.Count == 0) return 0;

        var columns = data[0].Keys.ToArray();
        var rows = data
            .Select(d => columns.Select(c => d.GetValueOrDefault(c)).ToArray())
            .ToList();

        return await BulkInsertAsync(tableName, columns, rows, onConflict);
    }

    [GeneratedRegex(@"^[a-zA-Z_][a-zA-Z0-9_]*$")]
    private static partial Regex GenerateIdentRegex();

    [GeneratedRegex(@"^[a-zA-Z_][a-zA-Z0-9_ ]*$")]
    private static partial Regex GenerateTypeRegex();
}
