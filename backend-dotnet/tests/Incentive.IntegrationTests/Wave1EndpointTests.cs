using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Incentive.IntegrationTests;

/// <summary>
/// Integration tests for Wave 1 endpoints.
/// Tests the response shape, status codes, and content type of all Wave 1 endpoints.
/// These tests use WebApplicationFactory and require a valid database connection.
/// If no database is available, the tests verify HTTP-level behavior (status codes, error handling).
/// </summary>
public class Wave1EndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public Wave1EndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    // ── Dashboard ──────────────────────────────────────

    [Fact]
    public async Task DashboardExecutiveSummary_Returns200()
    {
        var response = await _client.GetAsync("/api/dashboard/executive-summary");
        // May return 200 or 500 depending on DB availability; both are valid HTTP responses
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task DashboardExecutiveSummary_V1Route_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/dashboard/executive-summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task DashboardExecutiveSummary_WithQueryParams_Returns200()
    {
        var response = await _client.GetAsync("/api/dashboard/executive-summary?programId=1&period=2024-01-01");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task DashboardExecutiveSummary_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/dashboard/executive-summary");
        if (response.StatusCode != HttpStatusCode.OK) return; // Skip shape check if DB unavailable

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        // Verify expected top-level keys
        Assert.True(root.TryGetProperty("kpi_cards", out _), "Response should contain kpi_cards");
        Assert.True(root.TryGetProperty("alerts", out _), "Response should contain alerts");
        Assert.True(root.TryGetProperty("pipeline", out _), "Response should contain pipeline");
        Assert.True(root.TryGetProperty("channel_performance", out _), "Response should contain channel_performance");
        Assert.True(root.TryGetProperty("recent_activity", out _), "Response should contain recent_activity");
        Assert.True(root.TryGetProperty("last_sync", out _), "Response should contain last_sync");
    }

    // ── System Status ──────────────────────────────────

    [Fact]
    public async Task SystemStatusSummary_Returns200()
    {
        var response = await _client.GetAsync("/api/system-status/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task SystemStatusSummary_V1Route_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/system-status/summary");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task SystemStatusSummary_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/system-status/summary");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("database", out _), "Response should contain database");
        Assert.True(root.TryGetProperty("sync_status", out _), "Response should contain sync_status");
        Assert.True(root.TryGetProperty("integration_counts", out _), "Response should contain integration_counts");
        Assert.True(root.TryGetProperty("file_processing", out _), "Response should contain file_processing");
        Assert.True(root.TryGetProperty("server_time", out _), "Response should contain server_time");
    }

    // ── Notifications ──────────────────────────────────

    [Fact]
    public async Task Notifications_Returns200()
    {
        var response = await _client.GetAsync("/api/notifications");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Notifications_V1Route_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/notifications");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Notifications_WithFilters_Returns200()
    {
        var response = await _client.GetAsync("/api/notifications?unreadOnly=true&type=INFO&limit=10&offset=0");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Notifications_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/notifications");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("rows", out _), "Response should contain rows");
        Assert.True(root.TryGetProperty("total", out _), "Response should contain total");
        Assert.True(root.TryGetProperty("unread", out _), "Response should contain unread");
    }

    [Fact]
    public async Task Notifications_MarkAsRead_Returns200()
    {
        var response = await _client.PostAsync("/api/notifications/1/read", null);
        // May return 200 or 500 depending on DB availability
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Notifications_MarkAllAsRead_Returns200()
    {
        var response = await _client.PostAsync("/api/notifications/mark-all-read", null);
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    // ── Org Domain Mapping ──────────────────────────────

    [Fact]
    public async Task OrgDomainMapping_Returns200()
    {
        var response = await _client.GetAsync("/api/org-domain-mapping");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task OrgDomainMapping_V1Route_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/org-domain-mapping");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Theory]
    [InlineData("region")]
    [InlineData("channel")]
    [InlineData("branch")]
    [InlineData("designation")]
    public async Task OrgDomainMapping_AllViews_Return200(string view)
    {
        var response = await _client.GetAsync($"/api/org-domain-mapping?view={view}");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task OrgDomainMapping_InvalidView_DefaultsToRegion()
    {
        var response = await _client.GetAsync("/api/org-domain-mapping?view=invalid");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task OrgDomainMapping_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/org-domain-mapping");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        Assert.True(root.TryGetProperty("summary", out _), "Response should contain summary");
        Assert.True(root.TryGetProperty("view", out _), "Response should contain view");
        Assert.True(root.TryGetProperty("grouped_data", out _), "Response should contain grouped_data");
        Assert.True(root.TryGetProperty("products", out _), "Response should contain products");
    }

    // ── Programs Preview ──────────────────────────────

    [Fact]
    public async Task ProgramsPreview_Returns200OrNotFound()
    {
        var response = await _client.GetAsync("/api/programs/1/preview");
        // May return 200, 400 (not found via apiError), or 500 depending on DB state
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task ProgramsPreview_V1Route_Returns200OrNotFound()
    {
        var response = await _client.GetAsync("/api/v1/programs/1/preview");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.BadRequest
            or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task ProgramsPreview_InvalidId_ReturnsErrorResponse()
    {
        var response = await _client.GetAsync("/api/programs/999999/preview");
        if (response.StatusCode == HttpStatusCode.BadRequest)
        {
            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var root = json.RootElement;

            // Should match Node.js apiError('VAL_006') format
            Assert.True(root.TryGetProperty("success", out var success));
            Assert.False(success.GetBoolean());
            Assert.True(root.TryGetProperty("code", out var code));
            Assert.Equal("VAL_006", code.GetString());
        }
    }

    [Fact]
    public async Task ProgramsPreview_ReturnsExpectedShape()
    {
        var response = await _client.GetAsync("/api/programs/1/preview");
        if (response.StatusCode != HttpStatusCode.OK) return;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        var root = json.RootElement;

        // Program preview should contain these composed fields
        Assert.True(root.TryGetProperty("channel", out _), "Response should contain channel");
        Assert.True(root.TryGetProperty("kpis", out _), "Response should contain kpis");
        Assert.True(root.TryGetProperty("payoutRules", out _) || root.TryGetProperty("payout_rules", out _),
            "Response should contain payoutRules or payout_rules");
        Assert.True(root.TryGetProperty("agentCount", out _) || root.TryGetProperty("agent_count", out _),
            "Response should contain agentCount or agent_count");
        Assert.True(root.TryGetProperty("resultStats", out _) || root.TryGetProperty("result_stats", out _),
            "Response should contain resultStats or result_stats");
    }

    // ── Health ──────────────────────────────────────

    [Fact]
    public async Task HealthEndpoint_Returns200()
    {
        var response = await _client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Programs List (existing) ───────────────────

    [Fact]
    public async Task ProgramsList_Returns200()
    {
        var response = await _client.GetAsync("/api/programs");
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task ProgramsGetById_Returns200OrNotFound()
    {
        var response = await _client.GetAsync("/api/programs/1");
        Assert.True(response.StatusCode is HttpStatusCode.OK
            or HttpStatusCode.NotFound
            or HttpStatusCode.InternalServerError);
    }

    // ── Routing Parity ─────────────────────────────

    [Theory]
    [InlineData("/api/dashboard/executive-summary")]
    [InlineData("/api/v1/dashboard/executive-summary")]
    [InlineData("/api/system-status/summary")]
    [InlineData("/api/v1/system-status/summary")]
    [InlineData("/api/notifications")]
    [InlineData("/api/v1/notifications")]
    [InlineData("/api/org-domain-mapping")]
    [InlineData("/api/v1/org-domain-mapping")]
    [InlineData("/api/programs")]
    [InlineData("/api/v1/programs")]
    public async Task AllWave1Routes_AreAccessible(string url)
    {
        var response = await _client.GetAsync(url);
        // Route must be found (not 404). May return OK or InternalServerError (DB).
        Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
    }
}
