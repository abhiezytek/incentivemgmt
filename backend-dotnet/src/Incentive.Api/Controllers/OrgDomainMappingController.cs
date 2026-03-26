using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Organizational domain mapping endpoints.
/// Ported from server/src/routes/orgDomainMapping.js.
/// Auth: Admin/Ops — organizational config.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.AdminOrOps)]
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
