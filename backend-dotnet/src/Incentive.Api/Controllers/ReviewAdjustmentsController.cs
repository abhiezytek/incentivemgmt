using Incentive.Application.Abstractions.Repositories;
using Incentive.Domain.Constants;
using Incentive.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Incentive.Api.Controllers;

/// <summary>
/// Review &amp; Adjustments workflow endpoints.
/// Ported from server/src/routes/reviewAdjustments.js (7 endpoints).
/// Auth: WorkflowActors (Admin, Ops, Finance, Manager).
///
/// IMPORTANT: All adjustment operations are ADDITIVE.
/// They insert into incentive_adjustments / incentive_review_actions
/// and NEVER modify the original calculated values in ins_incentive_results.
/// The only mutation to ins_incentive_results is batch-approve which changes status only.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.WorkflowActors)]
public class ReviewAdjustmentsController : ControllerBase
{
    private readonly IReviewAdjustmentsRepository _reviewRepo;

    public ReviewAdjustmentsController(IReviewAdjustmentsRepository reviewRepo) =>
        _reviewRepo = reviewRepo;

    /// <summary>
    /// List incentive results for review with aggregated adjustments and summary cards.
    /// Matches Node.js: GET /api/review-adjustments
    /// </summary>
    [HttpGet("api/v1/review-adjustments")]
    [HttpGet("api/review-adjustments")]
    public async Task<IActionResult> GetList(
        [FromQuery] int? programId = null,
        [FromQuery] string? periodStart = null,
        [FromQuery] int? channel = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var result = await _reviewRepo.GetReviewListAsync(
            programId, periodStart, channel, status, search, limit, offset);
        return Ok(result);
    }

    /// <summary>
    /// Get single result detail with adjustments and audit trail.
    /// Matches Node.js: GET /api/review-adjustments/:id
    /// Returns the result fields spread at top level with adjustments and auditTrail arrays.
    /// </summary>
    [HttpGet("api/v1/review-adjustments/{id:int}")]
    [HttpGet("api/review-adjustments/{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var result = await _reviewRepo.GetReviewDetailAsync(id);
        if (result == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "id" });

        // Spread result fields at top level + include adjustments and auditTrail
        // (matches Node.js: res.json({ ...rows[0], adjustments, auditTrail }))
        var response = new Dictionary<string, object?>();

        if (result.Result is IDictionary<string, object> resultDict)
        {
            foreach (var kv in resultDict)
                response[kv.Key] = kv.Value;
        }

        response["adjustments"] = result.Adjustments;
        response["auditTrail"] = result.AuditTrail;

        return Ok(response);
    }

    /// <summary>
    /// Apply a manual adjustment (additive — never modifies original calculated value).
    /// Matches Node.js: POST /api/review-adjustments/:id/adjust
    /// </summary>
    [HttpPost("api/v1/review-adjustments/{id:int}/adjust")]
    [HttpPost("api/review-adjustments/{id:int}/adjust")]
    public async Task<IActionResult> Adjust(int id, [FromBody] Dictionary<string, object?> body)
    {
        // Validate required field
        if (!body.TryGetValue("amount", out var amountObj) || amountObj == null)
            throw new ApiException(ErrorCodes.VAL_001, new { field = "amount" });

        var amount = Convert.ToDecimal(amountObj);
        var reason = body.GetValueOrDefault("reason")?.ToString();
        var notes = body.GetValueOrDefault("notes")?.ToString();
        var adjustedBy = body.GetValueOrDefault("adjustedBy")?.ToString();

        var adj = await _reviewRepo.ApplyAdjustmentAsync(id, amount, reason, notes, adjustedBy);
        if (adj == null)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "id" });

        return Ok(new { success = true, adjustment = adj });
    }

    /// <summary>
    /// Place a result on hold (additive HOLD record — does NOT change ins_incentive_results.status).
    /// Matches Node.js: POST /api/review-adjustments/:id/hold
    /// </summary>
    [HttpPost("api/v1/review-adjustments/{id:int}/hold")]
    [HttpPost("api/review-adjustments/{id:int}/hold")]
    public async Task<IActionResult> Hold(int id, [FromBody] Dictionary<string, object?>? body)
    {
        var reason = body?.GetValueOrDefault("reason")?.ToString();
        var heldBy = body?.GetValueOrDefault("heldBy")?.ToString();

        var success = await _reviewRepo.HoldResultAsync(id, reason, heldBy);
        if (!success)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "id" });

        return Ok(new { success = true, held = true });
    }

    /// <summary>
    /// Release a held result (additive RELEASE record).
    /// Matches Node.js: POST /api/review-adjustments/:id/release
    /// </summary>
    [HttpPost("api/v1/review-adjustments/{id:int}/release")]
    [HttpPost("api/review-adjustments/{id:int}/release")]
    public async Task<IActionResult> Release(int id, [FromBody] Dictionary<string, object?>? body)
    {
        var releasedBy = body?.GetValueOrDefault("releasedBy")?.ToString();

        var success = await _reviewRepo.ReleaseResultAsync(id, releasedBy);
        if (!success)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "id" });

        return Ok(new { success = true, released = true });
    }

    /// <summary>
    /// Batch approve DRAFT results. Excludes held results and gate-failed results.
    /// Matches Node.js: POST /api/review-adjustments/batch-approve
    /// NOTE: This is the only endpoint that mutates ins_incentive_results (status field only).
    /// </summary>
    [HttpPost("api/v1/review-adjustments/batch-approve")]
    [HttpPost("api/review-adjustments/batch-approve")]
    public async Task<IActionResult> BatchApprove([FromBody] Dictionary<string, object?> body)
    {
        if (!body.TryGetValue("ids", out var idsObj) || idsObj == null)
            throw new ApiException(ErrorCodes.VAL_001, new { field = "ids" });

        int[] ids;
        try
        {
            // Handle both JsonElement arrays and direct int arrays
            if (idsObj is System.Text.Json.JsonElement jsonElement)
            {
                ids = jsonElement.EnumerateArray()
                    .Select(e => e.GetInt32())
                    .ToArray();
            }
            else if (idsObj is IEnumerable<object> enumerable)
            {
                ids = enumerable.Select(x => Convert.ToInt32(x)).ToArray();
            }
            else
            {
                throw new InvalidCastException();
            }
        }
        catch
        {
            throw new ApiException(ErrorCodes.VAL_001, new { field = "ids" });
        }

        if (ids.Length == 0)
            throw new ApiException(ErrorCodes.VAL_001, new { field = "ids" });

        var approvedBy = body.GetValueOrDefault("approvedBy")?.ToString();

        var result = await _reviewRepo.BatchApproveAsync(ids, approvedBy);
        return Ok(result);
    }

    /// <summary>
    /// Get audit trail for a result (actions + adjustments).
    /// Matches Node.js: GET /api/review-adjustments/:id/audit
    /// </summary>
    [HttpGet("api/v1/review-adjustments/{id:int}/audit")]
    [HttpGet("api/review-adjustments/{id:int}/audit")]
    public async Task<IActionResult> GetAuditTrail(int id)
    {
        var result = await _reviewRepo.GetAuditTrailAsync(id);
        return Ok(result);
    }
}
