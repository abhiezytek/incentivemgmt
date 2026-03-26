using Incentive.Application.Abstractions.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Organizational domain mapping endpoints.
/// Ported from server/src/routes/orgDomainMapping.js.
/// Auth: userAuth (placeholder — currently passes through in Node.js).
/// NOTE: Node.js userAuth middleware is a placeholder that passes all requests through.
///       We match that behavior here — no actual auth enforcement.
/// </summary>
[ApiController]
public class OrgDomainMappingController : ControllerBase
{
    private readonly IOrgDomainMappingRepository _orgRepo;

    public OrgDomainMappingController(IOrgDomainMappingRepository orgRepo) => _orgRepo = orgRepo;

    /// <summary>
    /// Organizational mapping overview.
    /// Returns a hierarchical mapping including regions, channels, branches, products, and designations.
    /// </summary>
    [HttpGet("api/v1/org-domain-mapping")]
    [HttpGet("api/org-domain-mapping")]
    public async Task<IActionResult> GetMappings([FromQuery] string view = "region")
    {
        // Validate view parameter (matches Node.js switch/case behavior — defaults to region)
        var validViews = new HashSet<string> { "region", "channel", "branch", "designation" };
        if (!validViews.Contains(view))
            view = "region";

        var result = await _orgRepo.GetMappingsAsync(view);
        return Ok(result);
    }
}
