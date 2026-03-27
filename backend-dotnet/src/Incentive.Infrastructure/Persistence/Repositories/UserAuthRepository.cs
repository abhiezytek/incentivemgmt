using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Infrastructure.Data;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper-based user auth repository. Queries the 'users' table.
/// </summary>
public class UserAuthRepository : IUserAuthRepository
{
    private readonly DbConnectionFactory _db;

    public UserAuthRepository(DbConnectionFactory db) => _db = db;

    public async Task<UserAuthRecord?> GetByEmailAsync(string email)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync<UserAuthRecord>(
            """
            SELECT id, name, email, password_hash AS passwordhash,
                   role, channel_id AS channelid, is_active AS isactive
            FROM users
            WHERE email = @email
            """,
            new { email });
    }

    public async Task<UserAuthRecord?> GetByIdAsync(int userId)
    {
        using var conn = await _db.CreateConnectionAsync();
        return await conn.QueryFirstOrDefaultAsync<UserAuthRecord>(
            """
            SELECT id, name, email, password_hash AS passwordhash,
                   role, channel_id AS channelid, is_active AS isactive
            FROM users
            WHERE id = @userId
            """,
            new { userId });
    }
}
