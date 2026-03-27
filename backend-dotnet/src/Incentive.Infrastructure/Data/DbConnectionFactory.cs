using System.Data;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Incentive.Infrastructure.Data;

/// <summary>
/// Factory for creating PostgreSQL connections using Npgsql.
/// Reads connection string from IConfiguration (ConnectionStrings:DefaultConnection).
/// </summary>
public class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured");
    }

    public async Task<IDbConnection> CreateConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}
