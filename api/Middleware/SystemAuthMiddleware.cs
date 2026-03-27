namespace IncentiveApi.Middleware;

using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.IdentityModel.Tokens;

/// <summary>
/// Record attached to HttpContext.Items["ApiClient"] after successful system authentication.
/// Downstream controllers access this to identify the calling system client.
/// </summary>
public sealed record ApiClientInfo(
    int Id,
    string ClientId,
    string ClientName,
    string[] AllowedEndpoints);

/// <summary>
/// Apply to controllers or actions to require system-to-system JWT authentication.
/// <code>[SystemAuth]</code>
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class SystemAuthAttribute : TypeFilterAttribute
{
    public SystemAuthAttribute() : base(typeof(SystemAuthFilter)) { }
}

/// <summary>
/// Authorization filter implementing system-to-system JWT authentication.
/// Used by <see cref="SystemAuthAttribute"/> for per-controller/action auth.
/// </summary>
public class SystemAuthFilter : IAsyncAuthorizationFilter
{
    private readonly IConfiguration _config;
    private readonly DbConnectionFactory _db;
    private readonly ILogger<SystemAuthFilter> _logger;

    public SystemAuthFilter(
        IConfiguration config,
        DbConnectionFactory db,
        ILogger<SystemAuthFilter> logger)
    {
        _config = config;
        _db = db;
        _logger = logger;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        try
        {
            var clientInfo = await SystemAuthLogic.ValidateAsync(
                context.HttpContext, _config, _db, _logger);
            context.HttpContext.Items["ApiClient"] = clientInfo;
        }
        catch (ApiException ex)
        {
            context.Result = new JsonResult(
                ApiResponse<object>.FromError(ex.ErrorEntry, ex.Details))
            {
                StatusCode = ex.ErrorEntry.Status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in system authentication");
            context.Result = new JsonResult(
                ApiResponse<object>.Fail("AUTH_ERROR", "Authentication failed"))
            {
                StatusCode = 500
            };
        }
    }
}

/// <summary>
/// Pipeline middleware for system authentication. Apply to route groups
/// via <c>app.UseSystemAuth()</c> or conditionally with <c>UseWhen</c>.
/// Errors propagate to <see cref="ExceptionHandlerMiddleware"/>.
/// </summary>
public class SystemAuthMiddleware
{
    private readonly RequestDelegate _next;

    public SystemAuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        IConfiguration config,
        DbConnectionFactory db,
        ILogger<SystemAuthMiddleware> logger)
    {
        var clientInfo = await SystemAuthLogic.ValidateAsync(context, config, db, logger);
        context.Items["ApiClient"] = clientInfo;
        await _next(context);
    }
}

/// <summary>
/// Shared validation logic used by both the filter and the pipeline middleware.
///
/// 1. Extracts Bearer token from Authorization header
/// 2. Verifies JWT using Jwt:SystemSecret
/// 3. Validates token payload (client_id, type == SYSTEM)
/// 4. Looks up client in api_clients — checks is_active
/// 5. Checks requested endpoint is in allowed_endpoints
/// 6. Updates api_clients.last_used_at (fire-and-forget)
/// 7. Returns client info for downstream use
/// </summary>
internal static class SystemAuthLogic
{
    internal static async Task<ApiClientInfo> ValidateAsync(
        HttpContext context,
        IConfiguration config,
        DbConnectionFactory db,
        ILogger logger)
    {
        // 1. Extract Bearer token
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(authHeader) ||
            !authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
        {
            throw new ApiException(ErrorCodes.AUTH_001);
        }

        var token = authHeader["Bearer ".Length..];

        // 2. Verify JWT
        var secret = config["Jwt:SystemSecret"];
        if (string.IsNullOrEmpty(secret))
        {
            logger.LogError("Jwt:SystemSecret is not configured");
            throw new InvalidOperationException("System authentication is not configured");
        }

        string? clientId;
        string? type;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };
            var principal = handler.ValidateToken(token, parameters, out _);
            clientId = principal.FindFirst("client_id")?.Value;
            type = principal.FindFirst("type")?.Value;
        }
        catch (SecurityTokenExpiredException)
        {
            throw new ApiException(ErrorCodes.AUTH_002);
        }
        catch (SecurityTokenException)
        {
            throw new ApiException(ErrorCodes.AUTH_003);
        }

        // 3. Validate payload fields
        if (string.IsNullOrEmpty(clientId) || type != "SYSTEM")
        {
            throw new ApiException(ErrorCodes.AUTH_003,
                "Token must contain client_id and type SYSTEM");
        }

        // 4. Lookup client in api_clients
        using var conn = await db.CreateConnectionAsync();
        var client = await conn.QueryFirstOrDefaultAsync<ApiClientRecord>(
            "SELECT id, client_id, client_name, allowed_endpoints, is_active " +
            "FROM api_clients WHERE client_id = @clientId",
            new { clientId });

        if (client is null)
            throw new ApiException(ErrorCodes.AUTH_005);

        if (!client.is_active)
            throw new ApiException(ErrorCodes.AUTH_006);

        // 5. Check endpoint authorization
        var requestedPath = context.Request.Path.Value ?? "";
        var allowed = client.allowed_endpoints ?? [];

        var isAllowed = allowed.Any(pattern =>
        {
            if (pattern.EndsWith("/*"))
            {
                var prefix = pattern[..^1];
                return requestedPath.StartsWith(prefix, StringComparison.Ordinal);
            }
            return requestedPath == pattern;
        });

        if (!isAllowed)
        {
            throw new ApiException(ErrorCodes.AUTH_007,
                $"Client is not authorized for {requestedPath}");
        }

        // 6. Update last_used_at (fire-and-forget, mirrors Node.js pool.query().catch())
        _ = Task.Run(async () =>
        {
            try
            {
                using var updateConn = await db.CreateConnectionAsync();
                await updateConn.ExecuteAsync(
                    "UPDATE api_clients SET last_used_at = NOW() WHERE id = @id",
                    new { id = client.id });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to update last_used_at for client {ClientId}",
                    client.client_id);
            }
        });

        // 7. Return client info for downstream use
        return new ApiClientInfo(
            client.id,
            client.client_id,
            client.client_name,
            client.allowed_endpoints ?? []);
    }

    /// <summary>Dapper model matching api_clients table columns.</summary>
    internal sealed class ApiClientRecord
    {
        public int id { get; set; }
        public string client_id { get; set; } = "";
        public string client_name { get; set; } = "";
        public string[]? allowed_endpoints { get; set; }
        public bool is_active { get; set; }
    }
}

public static class SystemAuthExtensions
{
    public static IApplicationBuilder UseSystemAuth(this IApplicationBuilder app)
        => app.UseMiddleware<SystemAuthMiddleware>();
}
