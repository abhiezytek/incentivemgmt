using Incentive.Application.Interfaces;
using Incentive.Domain.Constants;
using Microsoft.AspNetCore.Http;

namespace Incentive.Infrastructure.Security;

/// <summary>
/// Extracts the current user's identity from HttpContext claims.
/// Registered as Scoped so it reads from the current request.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    private System.Security.Claims.ClaimsPrincipal? User
        => _httpContextAccessor.HttpContext?.User;

    public int? UserId
    {
        get
        {
            var val = User?.FindFirst(AuthClaimTypes.UserId)?.Value;
            return int.TryParse(val, out var id) ? id : null;
        }
    }

    public string? Email => User?.FindFirst(AuthClaimTypes.Email)?.Value;

    public string? Name => User?.FindFirst(AuthClaimTypes.Name)?.Value;

    public string? Role => User?.FindFirst(AuthClaimTypes.Role)?.Value;

    public int? ChannelId
    {
        get
        {
            var val = User?.FindFirst(AuthClaimTypes.ChannelId)?.Value;
            return int.TryParse(val, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
