using Incentive.Domain.Exceptions;
using System.Text.Json;

namespace Incentive.Api.Middleware;

/// <summary>
/// Global exception handler middleware.
/// Catches ApiException and returns standardized error responses matching Node.js apiError() format.
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
            _logger.LogWarning(ex, "API error: {Code} {Message}", ex.ErrorCode, ex.Message);

            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";

            var body = new
            {
                success = false,
                error = ex.Message,
                code = ex.ErrorCode,
                details = ex.Details
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(body, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = "Internal server error",
                    code = "GEN_001"
                }));
            }
        }
    }
}
