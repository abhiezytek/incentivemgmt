namespace Incentive.Application.Features.ExceptionLog;

/// <summary>
/// Response DTO for GET /api/exception-log.
/// Matches Node.js response shape: { summary, rows, pagination }.
/// </summary>
public class ExceptionListResponse
{
    public object Summary { get; set; } = new { };
    public IEnumerable<dynamic> Rows { get; set; } = [];
    public ExceptionPaginationInfo Pagination { get; set; } = new();
}

/// <summary>
/// Pagination metadata for exception log list.
/// </summary>
public class ExceptionPaginationInfo
{
    public int Limit { get; set; }
    public int Offset { get; set; }
    public int Total { get; set; }
}
