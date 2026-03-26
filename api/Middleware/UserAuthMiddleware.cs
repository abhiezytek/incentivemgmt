namespace IncentiveApi.Middleware;

/// <summary>
/// User authentication middleware placeholder.
///
/// Currently passes all requests through unchanged. When a user login/session
/// system is implemented (e.g. session cookies, user JWT), this middleware
/// should verify the user's identity and attach user info to
/// <c>HttpContext.Items["User"]</c> before calling next.
///
/// Ported from server/src/middleware/userAuth.js which is also a passthrough.
/// </summary>
public class UserAuthMiddleware
{
    private readonly RequestDelegate _next;

    public UserAuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Future: verify user session/JWT and populate HttpContext.Items["User"]
        await _next(context);
    }
}

public static class UserAuthExtensions
{
    public static IApplicationBuilder UseUserAuth(this IApplicationBuilder app)
        => app.UseMiddleware<UserAuthMiddleware>();
}
