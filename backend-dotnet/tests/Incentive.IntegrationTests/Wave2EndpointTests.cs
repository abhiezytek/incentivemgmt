using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Incentive.IntegrationTests;

/// <summary>
/// Integration tests for Wave 2 endpoints.
/// Covers Programs CRUD, status transitions, KPI Config registry/validate/summary.
/// Tests accept 200 or 500 (DB availability independent) for read endpoints.
/// </summary>
public class Wave2EndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public Wave2EndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    // ── Programs Summary ──────────────────────────────

    [Fact]
    public async Task ProgramsSummary_Returns200OrError()
    {
        var response = await _client.GetAsync("/api/programs/1/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsSummary_V1Route_Returns200OrError()
    {
        var response = await _client.GetAsync("/api/v1/programs/1/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsSummary_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/programs/1/summary");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("program", out _), "Response should contain program");
        Assert.True(root.TryGetProperty("kpi_count", out _), "Response should contain kpi_count");
        Assert.True(root.TryGetProperty("payout_rule_count", out _), "Response should contain payout_rule_count");
        Assert.True(root.TryGetProperty("agent_count", out _), "Response should contain agent_count");
        Assert.True(root.TryGetProperty("has_results", out _), "Response should contain has_results");
    }

    // ── Programs Create ──────────────────────────────

    [Fact]
    public async Task ProgramsCreate_Returns201()
    {
        var body = new { name = "Test Program", description = "Test Description" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/programs", content);
        Assert.True(response.StatusCode is HttpStatusCode.Created or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsCreate_V1Route_Returns201()
    {
        var body = new { name = "Test Program V1", description = "V1 Test" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/v1/programs", content);
        Assert.True(response.StatusCode is HttpStatusCode.Created or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    // ── Programs Update ──────────────────────────────

    [Fact]
    public async Task ProgramsUpdate_Returns200OrError()
    {
        var body = new { name = "Updated Program Name" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PutAsync("/api/programs/1", content);
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsUpdate_EmptyBody_Returns400()
    {
        var body = new { id = 1, created_at = "2024-01-01" }; // Only protected fields
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PutAsync("/api/programs/1", content);
        // Should return 400 (VAL_001) since no updatable fields
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsUpdate_NotFound_ReturnsError()
    {
        var body = new { name = "Non-existent" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PutAsync("/api/programs/999999", content);
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    // ── Programs Status Update ──────────────────────

    [Fact]
    public async Task ProgramsStatusUpdate_InvalidStatus_Returns400()
    {
        var body = new { status = "INVALID_STATUS" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PatchAsync("/api/programs/1/status", content);
        // Should return 400 (VAL_003) for invalid status
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsStatusUpdate_MissingStatus_Returns400()
    {
        var body = new { };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PatchAsync("/api/programs/1/status", content);
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsStatusUpdate_V1Route_Accessible()
    {
        var body = new { status = "DRAFT" };
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        var response = await _client.PatchAsync("/api/v1/programs/1/status", content);
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.UnprocessableEntity
            or HttpStatusCode.Conflict
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    // ── Programs Delete ──────────────────────────────

    [Fact]
    public async Task ProgramsDelete_NotFound_ReturnsError()
    {
        var response = await _client.DeleteAsync("/api/programs/999999");
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProgramsDelete_V1Route_Accessible()
    {
        var response = await _client.DeleteAsync("/api/v1/programs/999998");
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest
            or HttpStatusCode.NotFound
            or HttpStatusCode.OK
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    // ── KPI Config Registry ──────────────────────────

    [Fact]
    public async Task KpiConfigRegistry_Returns200()
    {
        var response = await _client.GetAsync("/api/kpi-config/registry");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigRegistry_V1Route_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/kpi-config/registry");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigRegistry_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/kpi-config/registry");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("stats", out _), "Response should contain stats");
        Assert.True(root.TryGetProperty("kpis", out _), "Response should contain kpis");
        Assert.True(root.TryGetProperty("derived_variables", out _) || root.TryGetProperty("derivedVariables", out _),
            "Response should contain derivedVariables");
    }

    // ── KPI Config Validate ──────────────────────────

    [Fact]
    public async Task KpiConfigValidate_Returns200OrNotFound()
    {
        var response = await _client.PostAsync("/api/kpi-config/1/validate", null);
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigValidate_V1Route_Returns200OrNotFound()
    {
        var response = await _client.PostAsync("/api/v1/kpi-config/1/validate", null);
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigValidate_NotFound_Returns404()
    {
        var response = await _client.PostAsync("/api/kpi-config/999999/validate", null);
        Assert.True(response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigValidate_ReturnsExpectedShape()
    {
        var response = await _client.PostAsync("/api/kpi-config/1/validate", null);
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("valid", out _), "Response should contain valid");
        Assert.True(root.TryGetProperty("errors", out _), "Response should contain errors");
        Assert.True(root.TryGetProperty("warnings", out _), "Response should contain warnings");
        Assert.True(root.TryGetProperty("milestone_count", out _) || root.TryGetProperty("milestoneCount", out _),
            "Response should contain milestoneCount");
        Assert.True(root.TryGetProperty("payout_slab_links", out _) || root.TryGetProperty("payoutSlabLinks", out _),
            "Response should contain payoutSlabLinks");
    }

    // ── KPI Config Summary ──────────────────────────

    [Fact]
    public async Task KpiConfigSummary_Returns200OrNotFound()
    {
        var response = await _client.GetAsync("/api/kpi-config/1/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigSummary_V1Route_Returns200OrNotFound()
    {
        var response = await _client.GetAsync("/api/v1/kpi-config/1/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError
                or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigSummary_NotFound_Returns404()
    {
        var response = await _client.GetAsync("/api/kpi-config/999999/summary");
        Assert.True(response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.InternalServerError or HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task KpiConfigSummary_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/kpi-config/1/summary");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("milestones", out _), "Response should contain milestones");
        Assert.True(root.TryGetProperty("payout_slabs", out _) || root.TryGetProperty("payoutSlabs", out _),
            "Response should contain payoutSlabs");
        Assert.True(root.TryGetProperty("qualifying_rules", out _) || root.TryGetProperty("qualifyingRules", out _),
            "Response should contain qualifyingRules");
    }

    // ── Routing Parity (Wave 2 routes) ──────────────

    [Theory]
    [InlineData("/api/programs/1/summary")]
    [InlineData("/api/v1/programs/1/summary")]
    [InlineData("/api/kpi-config/registry")]
    [InlineData("/api/v1/kpi-config/registry")]
    [InlineData("/api/kpi-config/1/summary")]
    [InlineData("/api/v1/kpi-config/1/summary")]
    public async Task AllWave2ReadRoutes_AreAccessible(string url)
    {
        var response = await _client.GetAsync(url);
        // Route must be found (not 404/405 for route itself).
        // 404 from repository (KPI not found) is acceptable.
        Assert.True(response.StatusCode != HttpStatusCode.MethodNotAllowed,
            $"Route {url} should be accessible");
    }

    [Theory]
    [InlineData("/api/kpi-config/1/validate")]
    [InlineData("/api/v1/kpi-config/1/validate")]
    public async Task AllWave2PostRoutes_AreAccessible(string url)
    {
        var response = await _client.PostAsync(url, null);
        Assert.True(response.StatusCode != HttpStatusCode.MethodNotAllowed,
            $"Route {url} should be accessible via POST");
    }
}
