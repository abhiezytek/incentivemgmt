using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Dapper;
using Incentive.Infrastructure.Data;
using Microsoft.IdentityModel.Tokens;

namespace Incentive.Api.Middleware;

/// <summary>
/// System-to-system JWT authentication middleware.
/// Matches the behavior of Node.js middleware/systemAuth.js:
/// 1. Extract Bearer token
/// 2. Verify JWT using Jwt:SystemSecret
/// 3. Validate payload (client_id, type=SYSTEM)
/// 4. Lookup client in api_clients table
/// 5. Check is_active and allowed_endpoints
/// 6. Update last_used_at
/// 7. Set HttpContext.Items["ApiClient"]
/// </summary>
public class SystemAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _config;
    private readonly ILogger<SystemAuthMiddleware> _logger;

    public SystemAuthMiddleware(RequestDelegate next, IConfiguration config, ILogger<SystemAuthMiddleware> logger)
    {
        _next = next;
        _config = config;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, DbConnectionFactory db)
    {
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "MISSING_TOKEN", message = "Authorization header with Bearer token is required" });
            return;
        }

        var token = authHeader["Bearer ".Length..];
        var secret = _config["Jwt:SystemSecret"];
        if (string.IsNullOrEmpty(secret))
        {
            _logger.LogError("[SystemAuth] Jwt:SystemSecret is not configured");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { error = "SERVER_CONFIG_ERROR", message = "System authentication is not configured" });
            return;
        }

        // Verify JWT
        string? clientId;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = handler.ValidateToken(token, validationParams, out var validatedToken);
            clientId = principal.FindFirst("client_id")?.Value;
            var tokenType = principal.FindFirst("type")?.Value;

            if (string.IsNullOrEmpty(clientId) || tokenType != "SYSTEM")
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { error = "INVALID_TOKEN_PAYLOAD", message = "Token must contain client_id and type SYSTEM" });
                return;
            }
        }
        catch (SecurityTokenExpiredException)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "TOKEN_EXPIRED", message = "Token has expired" });
            return;
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "INVALID_TOKEN", message = ex.Message });
            return;
        }

        // Lookup client in api_clients
        using var conn = await db.CreateConnectionAsync();
        var client = await conn.QueryFirstOrDefaultAsync(
            "SELECT id, client_id, client_name, allowed_endpoints, is_active FROM api_clients WHERE client_id = @clientId",
            new { clientId });

        if (client == null)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "UNKNOWN_CLIENT", message = "Client not registered" });
            return;
        }

        if (!(bool)client.is_active)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "CLIENT_DISABLED", message = "Client account is deactivated" });
            return;
        }

        // Check endpoint authorization
        var requestedPath = context.Request.Path.Value ?? "";
        var allowedEndpoints = ((string[])client.allowed_endpoints) ?? [];

        var isAllowed = allowedEndpoints.Any(pattern =>
        {
            if (pattern.EndsWith("/*"))
            {
                var prefix = pattern[..^1];
                return requestedPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
            }
            return string.Equals(requestedPath, pattern, StringComparison.OrdinalIgnoreCase);
        });

        if (!isAllowed)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "ENDPOINT_NOT_ALLOWED", message = $"Client is not authorized for {requestedPath}" });
            return;
        }

        // Fire-and-forget last_used_at update
        _ = Task.Run(async () =>
        {
            try
            {
                using var updateConn = await db.CreateConnectionAsync();
                await updateConn.ExecuteAsync("UPDATE api_clients SET last_used_at = NOW() WHERE id = @id", new { id = (int)client.id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SystemAuth] Failed to update last_used_at");
            }
        });

        // Attach client info
        context.Items["ApiClient"] = new
        {
            id = (int)client.id,
            client_id = (string)client.client_id,
            client_name = (string)client.client_name,
            allowed_endpoints = (string[])client.allowed_endpoints
        };

        await _next(context);
    }
}
