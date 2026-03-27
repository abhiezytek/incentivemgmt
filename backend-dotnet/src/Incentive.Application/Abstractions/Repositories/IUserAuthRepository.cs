namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository for user authentication data access.
/// </summary>
public interface IUserAuthRepository
{
    /// <summary>
    /// Looks up a user by email address for login.
    /// Returns null if user not found.
    /// </summary>
    Task<UserAuthRecord?> GetByEmailAsync(string email);

    /// <summary>
    /// Looks up a user by ID for /auth/me and audit purposes.
    /// Returns null if user not found.
    /// </summary>
    Task<UserAuthRecord?> GetByIdAsync(int userId);
}

/// <summary>
/// Read-only record representing user data needed for authentication.
/// Maps to the 'users' table in PostgreSQL.
/// </summary>
public record UserAuthRecord(
    int Id,
    string Name,
    string Email,
    string PasswordHash,
    string Role,
    int? ChannelId,
    bool IsActive
);
