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

// CORS — open (matches Node.js cors() with no options)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

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

app.UseAuthorization();

// Health endpoint (matches Node.js GET /api/health)
app.MapGet("/api/health", () => new { status = "ok" });

app.MapControllers();

app.Run();
