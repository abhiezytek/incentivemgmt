namespace IncentiveApi.Middleware;

using IncentiveApi.Models;
using IncentiveApi.Utils;

/// <summary>
/// Global exception handler that catches <see cref="ApiException"/> (and any
/// unhandled exception) and returns a structured JSON error response using
/// the <see cref="ApiResponse{T}"/> envelope.
///
/// Must be registered early in the pipeline so it wraps all downstream middleware.
/// </summary>
public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;

    public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(ex, "API error {Code}: {Message}",
                ex.ErrorEntry.Code, ex.ErrorEntry.Message);

            if (context.Response.HasStarted)
            {
                _logger.LogWarning(
                    "Response already started — cannot write ApiException body for {Code}",
                    ex.ErrorEntry.Code);
                return;
            }

            context.Response.StatusCode = ex.ErrorEntry.Status;
            context.Response.ContentType = "application/json";

            var response = ApiResponse<object>.FromError(ex.ErrorEntry, ex.Details);
            await context.Response.WriteAsJsonAsync(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");

            if (context.Response.HasStarted)
            {
                _logger.LogWarning("Response already started — cannot write error body");
                return;
            }

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";

            var response = ApiResponse<object>.Fail(
                "INTERNAL_ERROR", "An unexpected error occurred");
            await context.Response.WriteAsJsonAsync(response);
        }
    }
}

public static class ExceptionHandlerExtensions
{
    public static IApplicationBuilder UseApiExceptionHandler(this IApplicationBuilder app)
        => app.UseMiddleware<ExceptionHandlerMiddleware>();
}
