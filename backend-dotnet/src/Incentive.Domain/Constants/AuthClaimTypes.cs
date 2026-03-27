namespace Incentive.Domain.Constants;

/// <summary>
/// Custom JWT claim type constants used across the application.
/// </summary>
public static class AuthClaimTypes
{
    /// <summary>User's database ID.</summary>
    public const string UserId = "user_id";

    /// <summary>User's email address.</summary>
    public const string Email = "email";

    /// <summary>User's display name.</summary>
    public const string Name = "name";

    /// <summary>User's role (ADMIN, FINANCE, OPS, MANAGER, AGENT).</summary>
    public const string Role = "role";

    /// <summary>User's assigned channel ID (nullable).</summary>
    public const string ChannelId = "channel_id";
}
