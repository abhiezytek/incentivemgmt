using Incentive.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ── Services ────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Match Node.js JSON serialization: snake_case, include nulls
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never;
    });

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT Authentication
builder.Services.AddJwtAuth(builder.Configuration);

// CORS — open (matches Node.js cors() with no options)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// HttpContextAccessor for CurrentUserService
builder.Services.AddHttpContextAccessor();

// Register all layered services (Infrastructure + Application)
builder.Services.AddAllServices(builder.Configuration);

var app = builder.Build();

// ── Middleware Pipeline ──────────────────────────────
app.UseCustomMiddleware();
app.UseCors();

// Swagger UI at /api/docs (matching Node.js)
app.UseSwagger(c => c.RouteTemplate = "api/docs/{documentName}/swagger.json");
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/api/docs/v1/swagger.json", "Incentive API v1");
    c.RoutePrefix = "api/docs";
    c.DocumentTitle = "Incentive System API Docs";
});

app.UseAuthentication();
app.UseAuthorization();

// Health endpoint (matches Node.js GET /api/health) — anonymous
app.MapGet("/api/health", () => new { status = "ok" });

app.MapControllers();

app.Run();
