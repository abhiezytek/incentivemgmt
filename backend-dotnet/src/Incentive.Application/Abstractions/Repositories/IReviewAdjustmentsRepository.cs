using Incentive.Application.Features.ReviewAdjustments;

namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository interface for review &amp; adjustment workflow operations.
/// Ported from server/src/routes/reviewAdjustments.js.
/// All adjustment actions are additive — they never modify ins_incentive_results.calculated values.
/// </summary>
public interface IReviewAdjustmentsRepository
{
    /// <summary>
    /// Get paginated review list with adjustment aggregations and summary cards.
    /// </summary>
    Task<ReviewListResponse> GetReviewListAsync(
        int? programId, string? periodStart, int? channel,
        string? status, string? search, int limit, int offset);

    /// <summary>
    /// Get single result detail with adjustments and audit trail.
    /// Returns null if result not found.
    /// </summary>
    Task<ReviewDetailResponse?> GetReviewDetailAsync(int id);

    /// <summary>
    /// Apply a manual adjustment (additive — never modifies original calculated value).
    /// Returns the inserted adjustment row, or null if result not found.
    /// </summary>
    Task<dynamic?> ApplyAdjustmentAsync(int resultId, decimal amount, string? reason, string? notes, string? adjustedBy);

    /// <summary>
    /// Place a result on hold (additive HOLD record in incentive_adjustments).
    /// Returns false if result not found.
    /// </summary>
    Task<bool> HoldResultAsync(int resultId, string? reason, string? heldBy);

    /// <summary>
    /// Release a held result (additive RELEASE record in incentive_adjustments).
    /// Returns false if result not found.
    /// </summary>
    Task<bool> ReleaseResultAsync(int resultId, string? releasedBy);

    /// <summary>
    /// Batch approve eligible DRAFT results. Excludes held results and gate-failed results.
    /// </summary>
    Task<BatchApproveResponse> BatchApproveAsync(int[] ids, string? approvedBy);

    /// <summary>
    /// Get audit trail for a result (actions + adjustments).
    /// </summary>
    Task<AuditTrailResponse> GetAuditTrailAsync(int resultId);
}
