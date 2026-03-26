namespace Incentive.Application.Interfaces;

/// <summary>
/// Service for issuing and validating user JWT tokens.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Generates a JWT for an authenticated user.
    /// </summary>
    string GenerateUserToken(int userId, string email, string name, string role, int? channelId);

    /// <summary>
    /// Returns the configured token lifetime in hours.
    /// </summary>
    int GetExpiryHours();
}
