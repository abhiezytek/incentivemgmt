using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Incentive.Application.Interfaces;
using Incentive.Domain.Constants;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Incentive.Infrastructure.Security;

/// <summary>
/// JWT token generation service for user authentication.
/// Reads configuration from Jwt:Secret, Jwt:Issuer, Jwt:ExpiryHours in appsettings.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config) => _config = config;

    public string GenerateUserToken(int userId, string email, string name, string role, int? channelId)
    {
        var secret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured");
        var issuer = _config["Jwt:Issuer"] ?? "IncentiveApi";
        var expiryHours = GetExpiryHours();

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(AuthClaimTypes.UserId, userId.ToString()),
            new(AuthClaimTypes.Email, email),
            new(AuthClaimTypes.Name, name),
            new(AuthClaimTypes.Role, role),
            // Standard role claim for [Authorize(Roles = "...")] support
            new(ClaimTypes.Role, role),
        };

        if (channelId.HasValue)
            claims.Add(new Claim(AuthClaimTypes.ChannelId, channelId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public int GetExpiryHours()
    {
        if (int.TryParse(_config["Jwt:ExpiryHours"], out var hours) && hours > 0)
            return hours;
        return 24; // default
    }
}
