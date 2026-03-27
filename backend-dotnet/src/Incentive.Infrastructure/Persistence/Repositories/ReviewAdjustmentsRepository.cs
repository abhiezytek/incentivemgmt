using System.Text.Json;
using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.ReviewAdjustments;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IReviewAdjustmentsRepository.
/// Ported from server/src/routes/reviewAdjustments.js.
/// All adjustment operations are additive — they never modify ins_incentive_results base values.
/// </summary>
public class ReviewAdjustmentsRepository : IReviewAdjustmentsRepository
{
    private readonly DbConnectionFactory _db;

    public ReviewAdjustmentsRepository(DbConnectionFactory db) => _db = db;

    public async Task<ReviewListResponse> GetReviewListAsync(
        int? programId, string? periodStart, int? channel,
        string? status, string? search, int limit, int offset)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Build dynamic WHERE clause matching Node.js behavior exactly
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (programId.HasValue)
        {
            conditions.Add("r.program_id = @programId");
            parameters.Add("programId", programId.Value);
        }
        if (!string.IsNullOrEmpty(periodStart))
        {
            conditions.Add("r.period_start = @periodStart");
            parameters.Add("periodStart", periodStart);
        }
        if (channel.HasValue)
        {
            conditions.Add("a.channel_id = @channel");
            parameters.Add("channel", channel.Value);
        }
        if (!string.IsNullOrEmpty(status))
        {
            if (status == "HOLD")
            {
                // HOLD is a virtual status — filter by existence of un-released hold adjustments
                conditions.Add(ReviewAdjustmentsSql.HoldExistsFilter);
            }
            else
            {
                conditions.Add("r.status = @status");
                parameters.Add("status", status);
            }
        }
        if (!string.IsNullOrEmpty(search))
        {
            conditions.Add("(a.agent_code ILIKE @search OR a.agent_name ILIKE @search)");
            parameters.Add("search", $"%{search}%");
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        // Fetch paginated rows
        var listSql = $"""
            {ReviewAdjustmentsSql.ListResults}
            {where}
            ORDER BY r.total_incentive DESC
            LIMIT @limit OFFSET @offset
            """;
        parameters.Add("limit", limit);
        parameters.Add("offset", offset);

        var rows = await conn.QueryAsync(listSql, parameters);

        // Summary cards (use same WHERE but without limit/offset)
        var summaryParams = new DynamicParameters();
        // Re-add all non-pagination params
        if (programId.HasValue) summaryParams.Add("programId", programId.Value);
        if (!string.IsNullOrEmpty(periodStart)) summaryParams.Add("periodStart", periodStart);
        if (channel.HasValue) summaryParams.Add("channel", channel.Value);
        if (!string.IsNullOrEmpty(status) && status != "HOLD") summaryParams.Add("status", status);
        if (!string.IsNullOrEmpty(search)) summaryParams.Add("search", $"%{search}%");

        var summarySql = $"""
            {ReviewAdjustmentsSql.SummaryCards}
            {where}
            """;
        var summary = await conn.QueryFirstOrDefaultAsync(summarySql, summaryParams);

        return new ReviewListResponse
        {
            Summary = summary ?? new { },
            Rows = rows,
            Pagination = new PaginationInfo
            {
                Limit = limit,
                Offset = offset,
                Total = (int?)(summary?.total_count) ?? 0,
            },
        };
    }

    public async Task<ReviewDetailResponse?> GetReviewDetailAsync(int id)
    {
        using var conn = await _db.CreateConnectionAsync();

        var result = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.ResultDetail, new { id });
        if (result == null)
            return null;

        var adjustments = await conn.QueryAsync(
            ReviewAdjustmentsSql.AdjustmentsByResultId, new { resultId = id });

        var auditTrail = await conn.QueryAsync(
            ReviewAdjustmentsSql.AuditTrailByResultId, new { resultId = id });

        return new ReviewDetailResponse
        {
            Result = result,
            Adjustments = adjustments,
            AuditTrail = auditTrail,
        };
    }

    public async Task<dynamic?> ApplyAdjustmentAsync(
        int resultId, decimal amount, string? reason, string? notes, string? adjustedBy)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Verify result exists and check status
        var result = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.ResultStatusById, new { id = resultId });
        if (result == null)
            return null; // signals not-found to controller

        // Cannot adjust PAID results (BUS_003 — matches Node.js)
        if ((string)result.status == "PAID")
            throw new Domain.Exceptions.ApiException(Domain.Constants.ErrorCodes.BUS_003);

        // Insert adjustment (additive — never modifies ins_incentive_results)
        var adj = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.InsertAdjustment,
            new { resultId, amount, reason, createdBy = adjustedBy, notes });

        // Record audit action
        await conn.ExecuteAsync(
            ReviewAdjustmentsSql.InsertAuditAction,
            new
            {
                resultId,
                action = "ADJUST",
                actor = adjustedBy,
                details = JsonSerializer.Serialize(new { amount, reason })
            });

        return adj;
    }

    public async Task<bool> HoldResultAsync(int resultId, string? reason, string? heldBy)
    {
        using var conn = await _db.CreateConnectionAsync();

        var result = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.ResultExistsById, new { id = resultId });
        if (result == null)
            return false;

        await conn.ExecuteAsync(
            ReviewAdjustmentsSql.InsertHold,
            new { resultId, reason, createdBy = heldBy });

        await conn.ExecuteAsync(
            ReviewAdjustmentsSql.InsertAuditAction,
            new
            {
                resultId,
                action = "HOLD",
                actor = heldBy,
                details = JsonSerializer.Serialize(new { reason })
            });

        return true;
    }

    public async Task<bool> ReleaseResultAsync(int resultId, string? releasedBy)
    {
        using var conn = await _db.CreateConnectionAsync();

        var result = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.ResultExistsById, new { id = resultId });
        if (result == null)
            return false;

        await conn.ExecuteAsync(
            ReviewAdjustmentsSql.InsertRelease,
            new { resultId, createdBy = releasedBy });

        await conn.ExecuteAsync(
            ReviewAdjustmentsSql.InsertAuditAction,
            new
            {
                resultId,
                action = "RELEASE",
                actor = releasedBy,
                details = "{}"
            });

        return true;
    }

    public async Task<BatchApproveResponse> BatchApproveAsync(int[] ids, string? approvedBy)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Check for held results — exclude them
        var heldRows = await conn.QueryAsync<int>(
            ReviewAdjustmentsSql.HeldResultIds, new { ids });
        var heldIds = new HashSet<int>(heldRows);
        var eligibleIds = ids.Where(id => !heldIds.Contains(id)).ToArray();

        if (eligibleIds.Length == 0)
        {
            return new BatchApproveResponse
            {
                Approved = 0,
                Skipped_held = heldIds.Count,
                Skipped_gate_failed = 0,
            };
        }

        // Approve DRAFT results with persistency gate passed
        var approvedRows = await conn.QueryAsync<int>(
            ReviewAdjustmentsSql.BatchApprove,
            new { approvedBy, ids = eligibleIds });
        var approvedList = approvedRows.ToList();

        // Count gate-failed skips
        var gateFailedRow = await conn.QueryFirstOrDefaultAsync(
            ReviewAdjustmentsSql.SkippedGateFailedCount,
            new { ids = eligibleIds });
        var skippedGateFailed = (int?)gateFailedRow?.cnt ?? 0;

        // Record audit trail for each approved result
        foreach (var approvedId in approvedList)
        {
            await conn.ExecuteAsync(
                ReviewAdjustmentsSql.InsertAuditAction,
                new
                {
                    resultId = approvedId,
                    action = "BATCH_APPROVE",
                    actor = approvedBy,
                    details = "{}"
                });
        }

        return new BatchApproveResponse
        {
            Approved = approvedList.Count,
            Skipped_held = heldIds.Count,
            Skipped_gate_failed = skippedGateFailed,
        };
    }

    public async Task<AuditTrailResponse> GetAuditTrailAsync(int resultId)
    {
        using var conn = await _db.CreateConnectionAsync();

        var actions = await conn.QueryAsync(
            ReviewAdjustmentsSql.AuditTrailByResultId, new { resultId });
        var adjustments = await conn.QueryAsync(
            ReviewAdjustmentsSql.AdjustmentsByResultId, new { resultId });

        return new AuditTrailResponse
        {
            Actions = actions,
            Adjustments = adjustments,
        };
    }
}
