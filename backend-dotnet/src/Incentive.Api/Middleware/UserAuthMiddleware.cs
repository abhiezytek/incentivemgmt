namespace Incentive.Api.Middleware;

/// <summary>
/// User authentication middleware placeholder — SUPERSEDED.
/// JWT Bearer authentication is now handled by ASP.NET Core's built-in auth middleware
/// configured in Extensions/AuthExtensions.cs. All controllers use [Authorize] attributes.
/// This middleware is retained for backward compatibility but performs no auth checks.
/// Auth flow: JWT Bearer → [Authorize] attributes → role-based access control.
/// </summary>
public class UserAuthMiddleware
{
    private readonly RequestDelegate _next;

    public UserAuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Auth is now handled by JWT Bearer middleware (see AuthExtensions.cs)
        // This middleware is a pass-through retained for compatibility
        await _next(context);
    }
}
