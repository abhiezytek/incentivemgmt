using Incentive.Application.Features.ExceptionLog;

namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository interface for exception log operations.
/// Ported from server/src/routes/exceptionLog.js.
/// All operations target the additive operational_exceptions table only.
/// </summary>
public interface IExceptionLogRepository
{
    /// <summary>
    /// Get paginated exception list with summary cards.
    /// Summary cards are always unfiltered; list respects filters.
    /// </summary>
    Task<ExceptionListResponse> GetExceptionListAsync(
        string? type, string? status, string? severity,
        string? source, string? search, int limit, int offset);

    /// <summary>
    /// Get single exception detail by ID.
    /// Returns null if not found.
    /// </summary>
    Task<dynamic?> GetExceptionByIdAsync(int id);

    /// <summary>
    /// Resolve or dismiss an exception.
    /// Returns the updated row, or null if not found or already resolved.
    /// </summary>
    Task<dynamic?> ResolveExceptionAsync(int id, string status, string? resolvedBy, string? note);
}
