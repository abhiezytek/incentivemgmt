namespace Incentive.Application.Features.OrgDomainMapping;

/// <summary>
/// Response DTO for GET /api/org-domain-mapping.
/// Matches the Node.js response shape exactly.
/// </summary>
public class OrgDomainMappingResponse
{
    public OrgSummaryDto Summary { get; set; } = new();
    public string View { get; set; } = "region";
    public IEnumerable<dynamic> GroupedData { get; set; } = [];
    public IEnumerable<dynamic> Products { get; set; } = [];
}

public class OrgSummaryDto
{
    public int TotalAgents { get; set; }
    public int ActiveAgents { get; set; }
    public int Regions { get; set; }
    public int Channels { get; set; }
    public int Branches { get; set; }
}
