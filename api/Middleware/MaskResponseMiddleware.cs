namespace IncentiveApi.Middleware;

using System.Text;
using System.Text.Json;
using IncentiveApi.Utils;

/// <summary>
/// Middleware that intercepts JSON responses and masks policy numbers
/// before sending them to the client.
///
/// Ported from server/src/middleware/maskResponse.js.
///
/// Behaviour:
///  - Skips /api/integration/export/* paths (finance files need real numbers)
///  - Checks shouldMask() config flag from system_config table
///  - Masks policy number fields in the response body via <see cref="DataMask"/>
///  - On error, sends the unmasked response (never breaks the response)
/// </summary>
public class MaskResponseMiddleware
{
    private static readonly string[] SkipPrefixes = ["/api/integration/export/"];

    // Responses larger than 10 MB are passed through unmasked to avoid excessive memory usage
    private const long MaxBufferSize = 10 * 1024 * 1024;

    private readonly RequestDelegate _next;
    private readonly ILogger<MaskResponseMiddleware> _logger;

    public MaskResponseMiddleware(RequestDelegate next, ILogger<MaskResponseMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, DataMask dataMask)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip export endpoints — no masking overhead
        if (SkipPrefixes.Any(prefix => path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        // Buffer the response body so we can inspect and mask it
        var originalBodyStream = context.Response.Body;
        using var bufferStream = new MemoryStream();
        context.Response.Body = bufferStream;

        await _next(context);

        // Restore original stream before writing the final response
        context.Response.Body = originalBodyStream;
        bufferStream.Seek(0, SeekOrigin.Begin);

        var contentType = context.Response.ContentType;
        bool isJson = bufferStream.Length > 0
            && bufferStream.Length <= MaxBufferSize
            && contentType != null
            && contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase);

        if (isJson)
        {
            var body = await new StreamReader(bufferStream, Encoding.UTF8).ReadToEndAsync();

            try
            {
                if (await dataMask.ShouldMaskAsync())
                {
                    using var doc = JsonDocument.Parse(body);
                    var masked = DataMask.MaskPolicyNumbersInJson(doc.RootElement);
                    body = JsonSerializer.Serialize(masked);
                }
            }
            catch (Exception ex)
            {
                // On error, fall through and send unmasked — don't break the response
                _logger.LogError(ex, "Masking error — sending unmasked response");
            }

            var resultBytes = Encoding.UTF8.GetBytes(body);
            context.Response.ContentLength = resultBytes.Length;
            await originalBodyStream.WriteAsync(resultBytes);
        }
        else if (bufferStream.Length > 0)
        {
            // Non-JSON response — copy through unmodified
            await bufferStream.CopyToAsync(originalBodyStream);
        }
    }
}

public static class MaskResponseExtensions
{
    public static IApplicationBuilder UseMaskResponse(this IApplicationBuilder app)
        => app.UseMiddleware<MaskResponseMiddleware>();
}
