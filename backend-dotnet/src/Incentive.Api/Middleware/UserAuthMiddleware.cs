namespace Incentive.Api.Middleware;

/// <summary>
/// User authentication middleware placeholder.
/// Currently passes all requests through — matches Node.js middleware/userAuth.js behavior.
/// When a user login/session system is implemented, this middleware should verify
/// the user's identity and set HttpContext.Items["User"] before calling next.
/// </summary>
public class UserAuthMiddleware
{
    private readonly RequestDelegate _next;

    public UserAuthMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // TODO: Implement user authentication when login system is added
        await _next(context);
    }
}
