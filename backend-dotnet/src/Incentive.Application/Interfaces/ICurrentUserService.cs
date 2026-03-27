namespace Incentive.Application.Interfaces;

/// <summary>
/// Provides the current authenticated user's identity from the HTTP context.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>User's database ID, or null if not authenticated.</summary>
    int? UserId { get; }

    /// <summary>User's email, or null if not authenticated.</summary>
    string? Email { get; }

    /// <summary>User's display name, or null if not authenticated.</summary>
    string? Name { get; }

    /// <summary>User's role (ADMIN, FINANCE, etc.), or null if not authenticated.</summary>
    string? Role { get; }

    /// <summary>User's channel ID, or null.</summary>
    int? ChannelId { get; }

    /// <summary>Whether a user is currently authenticated.</summary>
    bool IsAuthenticated { get; }
}
