namespace Incentive.Application.Features.Programs;

/// <summary>
/// Response DTO for GET /api/programs/{id}/preview.
/// Matches the Node.js response shape exactly.
/// The program fields are spread at the top level.
/// </summary>
public class ProgramPreviewResponse
{
    // Program fields are dynamic (spread from program row)
    public dynamic Program { get; set; } = null!;
    public dynamic? Channel { get; set; }
    public IEnumerable<dynamic> Kpis { get; set; } = [];
    public IEnumerable<dynamic> PayoutRules { get; set; } = [];
    public IEnumerable<dynamic> QualifyingRules { get; set; } = [];
    public int AgentCount { get; set; }
    public Dictionary<string, ProgramResultStatDto> ResultStats { get; set; } = new();
}

public class ProgramResultStatDto
{
    public int Count { get; set; }
    public decimal Total { get; set; }
}
