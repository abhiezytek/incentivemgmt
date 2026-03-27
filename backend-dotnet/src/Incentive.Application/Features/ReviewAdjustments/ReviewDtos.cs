namespace Incentive.Application.Features.ReviewAdjustments;

/// <summary>
/// Response DTO for GET /api/review-adjustments.
/// Matches Node.js response shape: { summary, rows, pagination }.
/// </summary>
public class ReviewListResponse
{
    public object Summary { get; set; } = new { };
    public IEnumerable<dynamic> Rows { get; set; } = [];
    public PaginationInfo Pagination { get; set; } = new();
}

/// <summary>
/// Response DTO for GET /api/review-adjustments/{id}.
/// Matches Node.js: { ...result, adjustments, auditTrail }.
/// </summary>
public class ReviewDetailResponse
{
    public dynamic Result { get; set; } = null!;
    public IEnumerable<dynamic> Adjustments { get; set; } = [];
    public IEnumerable<dynamic> AuditTrail { get; set; } = [];
}

/// <summary>
/// Response DTO for GET /api/review-adjustments/{id}/audit.
/// Matches Node.js: { actions, adjustments }.
/// </summary>
public class AuditTrailResponse
{
    public IEnumerable<dynamic> Actions { get; set; } = [];
    public IEnumerable<dynamic> Adjustments { get; set; } = [];
}

/// <summary>
/// Response DTO for POST /api/review-adjustments/batch-approve.
/// Matches Node.js: { approved, skipped_held, skipped_gate_failed }.
/// </summary>
public class BatchApproveResponse
{
    public int Approved { get; set; }
    public int Skipped_held { get; set; }
    public int Skipped_gate_failed { get; set; }
}

/// <summary>
/// Pagination metadata used in list responses.
/// </summary>
public class PaginationInfo
{
    public int Limit { get; set; }
    public int Offset { get; set; }
    public int Total { get; set; }
}
