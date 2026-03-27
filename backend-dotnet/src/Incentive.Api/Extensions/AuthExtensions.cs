using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Incentive.Api.Extensions;

/// <summary>
/// Configures JWT bearer authentication and Swagger bearer auth support.
/// </summary>
public static class AuthExtensions
{
    /// <summary>
    /// Adds JWT bearer authentication with configuration from appsettings Jwt section.
    /// </summary>
    public static IServiceCollection AddJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret must be configured in appsettings");
        var issuer = configuration["Jwt:Issuer"] ?? "IncentiveApi";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = issuer,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),
                RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            };

            // Return structured JSON errors matching Node.js error format
            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    // Suppress default WWW-Authenticate challenge
                    context.HandleResponse();

                    if (!context.Response.HasStarted)
                    {
                        context.Response.StatusCode = 401;
                        context.Response.ContentType = "application/json";

                        var error = string.IsNullOrEmpty(context.ErrorDescription)
                            ? "UNAUTHORIZED"
                            : context.ErrorDescription.Contains("expired", StringComparison.OrdinalIgnoreCase)
                                ? "TOKEN_EXPIRED"
                                : "INVALID_TOKEN";

                        var message = string.IsNullOrEmpty(context.ErrorDescription)
                            ? "Authentication is required"
                            : context.ErrorDescription;

                        await context.Response.WriteAsJsonAsync(new { error, message });
                    }
                },
                OnForbidden = async context =>
                {
                    if (!context.Response.HasStarted)
                    {
                        context.Response.StatusCode = 403;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "FORBIDDEN",
                            message = "You do not have permission to access this resource"
                        });
                    }
                }
            };
        });

        return services;
    }
}
