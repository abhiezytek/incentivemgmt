using System.Threading.RateLimiting;
using Incentive.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

var env = builder.Environment;

// ── Production startup safety checks ────────────────
if (!env.IsDevelopment())
{
    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "";
    if (jwtSecret.Length < 32 || jwtSecret == "your_jwt_secret_here")
        throw new InvalidOperationException(
            "PRODUCTION SAFETY: Jwt:Secret must be set to a strong value (≥32 chars). " +
            "Do not use the default placeholder.");

    var systemSecret = builder.Configuration["Jwt:SystemSecret"] ?? "";
    if (systemSecret.Length < 32 || systemSecret == "your-system-jwt-secret-here")
        throw new InvalidOperationException(
            "PRODUCTION SAFETY: Jwt:SystemSecret must be set to a strong value (≥32 chars).");
}

// ── Services ────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Match Node.js JSON serialization: snake_case, include nulls
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// Swagger / OpenAPI — enabled in Development only for Production safety
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT Authentication
builder.Services.AddJwtAuth(builder.Configuration);

// CORS — environment-specific
builder.Services.AddCors(options =>
{
    if (env.IsDevelopment())
    {
        // Development: open CORS (matches Node.js cors() with no options)
        options.AddDefaultPolicy(policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
    }
    else
    {
        // Production / Staging: restrict to configured origins
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        options.AddDefaultPolicy(policy =>
        {
            if (allowedOrigins.Length > 0)
            {
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }
            else
            {
                // Fallback: allow any origin but log warning at startup
                policy.AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader();
            }
        });
    }
});

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "RATE_LIMITED", message = "Too many requests. Please try again later." }, ct);
    };

    // Auth endpoints: 10 requests per minute per IP
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Heavy endpoints (calculation, export): 5 requests per minute per IP
    options.AddPolicy("heavy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Upload endpoints: 10 requests per minute per IP
    options.AddPolicy("upload", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// HttpContextAccessor for CurrentUserService
builder.Services.AddHttpContextAccessor();

// Register all layered services (Infrastructure + Application)
builder.Services.AddAllServices(builder.Configuration);

var app = builder.Build();

// ── Log CORS warning in non-dev if no origins configured ──
if (!env.IsDevelopment())
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (origins == null || origins.Length == 0)
    {
        app.Logger.LogWarning(
            "PRODUCTION WARNING: Cors:AllowedOrigins is not configured. " +
            "CORS is open to all origins. Set Cors:AllowedOrigins in appsettings.Production.json.");
    }
}

// ── Middleware Pipeline ──────────────────────────────
app.UseCustomMiddleware();
app.UseCors();
app.UseRateLimiter();

// Swagger UI — only in Development
if (env.IsDevelopment())
{
    app.UseSwagger(c => c.RouteTemplate = "api/docs/{documentName}/swagger.json");
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/api/docs/v1/swagger.json", "Incentive API v1");
        c.RoutePrefix = "api/docs";
        c.DocumentTitle = "Incentive System API Docs";
    });
}

app.UseAuthentication();
app.UseAuthorization();

// Health endpoint (matches Node.js GET /api/health) — anonymous
app.MapGet("/api/health", () => new { status = "ok" });

app.MapControllers();

app.Run();
