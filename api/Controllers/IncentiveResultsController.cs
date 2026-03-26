namespace IncentiveApi.Controllers;

using Dapper;
using IncentiveApi.Data;
using IncentiveApi.Models;
using IncentiveApi.Utils;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/v1/incentive-results")]
[Route("api/incentive-results")]
public class IncentiveResultsController : ControllerBase
{
    private readonly QueryHelper _qh;
    private readonly DbConnectionFactory _db;

    public IncentiveResultsController(QueryHelper qh, DbConnectionFactory db)
    {
        _qh = qh;
        _db = db;
    }

    /// <summary>
    /// Pipeline stage counts grouped by status.
    /// </summary>
    [HttpGet("stage-summary")]
    public async Task<IActionResult> GetStageSummary(
        [FromQuery] int? programId,
        [FromQuery] string? periodStart)
    {
        var rows = await _qh.QueryAsync<dynamic>(
            @"SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
              FROM ins_incentive_results
              WHERE (@programId::int IS NULL OR program_id = @programId)
                AND (@periodStart::date IS NULL OR period_start = @periodStart::date)
              GROUP BY status",
            new { programId, periodStart });

        var summary = new Dictionary<string, object>();
        foreach (var r in rows)
        {
            summary[(string)r.status] = new { count = (int)r.count, total = Convert.ToDecimal(r.total) };
        }

        return Ok(ApiResponse<object>.Ok(summary));
    }

    /// <summary>
    /// Channel summary with agent count, total pool, average, and paid count.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? programId,
        [FromQuery] string? periodStart)
    {
        if (!programId.HasValue || string.IsNullOrEmpty(periodStart))
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "programId, periodStart" });

        var rows = await _qh.QueryAsync<dynamic>(
            @"SELECT c.name AS channel,
                     COUNT(*)::int AS agent_count,
                     SUM(r.total_incentive) AS total_pool,
                     AVG(r.total_incentive) AS avg_incentive,
                     SUM(CASE WHEN r.status = 'PAID' THEN 1 ELSE 0 END)::int AS paid_count
              FROM ins_incentive_results r
              JOIN ins_agents a ON a.agent_code = r.agent_code
              JOIN channels c ON c.id = a.channel_id
              WHERE r.program_id = @programId AND r.period_start = @periodStart::date
              GROUP BY c.name
              ORDER BY total_pool DESC",
            new { programId = programId.Value, periodStart });

        return Ok(ApiResponse<object>.Ok(rows));
    }

    /// <summary>
    /// List incentive results with optional filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? programId,
        [FromQuery] string? periodStart,
        [FromQuery] string? status,
        [FromQuery] int? channel,
        [FromQuery] int? region)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (programId.HasValue)
        {
            parameters.Add("programId", programId.Value);
            conditions.Add("r.program_id = @programId");
        }
        if (!string.IsNullOrEmpty(periodStart))
        {
            parameters.Add("periodStart", periodStart);
            conditions.Add("r.period_start = @periodStart::date");
        }
        if (!string.IsNullOrEmpty(status))
        {
            parameters.Add("status", status);
            conditions.Add("r.status = @status");
        }
        if (channel.HasValue)
        {
            parameters.Add("channel", channel.Value);
            conditions.Add("a.channel_id = @channel");
        }
        if (region.HasValue)
        {
            parameters.Add("region", region.Value);
            conditions.Add("a.region_id = @region");
        }

        string where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        using var conn = await _db.CreateConnectionAsync();
        var rows = await conn.QueryAsync(
            $@"SELECT r.*,
                      a.agent_name, c.name AS channel_name, rg.region_code AS region_name,
                      p.name AS program_name
               FROM ins_incentive_results r
               LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
               LEFT JOIN channels c ON c.id = a.channel_id
               LEFT JOIN ins_regions rg ON rg.id = a.region_id
               LEFT JOIN incentive_programs p ON p.id = r.program_id
               {where}
               ORDER BY r.total_incentive DESC",
            parameters);

        return Ok(ApiResponse<object>.Ok(rows));
    }

    /// <summary>
    /// Bulk approve DRAFT results that have passed the persistency gate.
    /// </summary>
    [HttpPost("bulk-approve")]
    public async Task<IActionResult> BulkApprove([FromBody] BulkApproveRequest request)
    {
        using var conn = await _db.CreateConnectionAsync();

        if (request.Ids is { Count: > 0 })
        {
            var rows = await conn.QueryAsync<int>(
                @"UPDATE ins_incentive_results
                  SET status = 'APPROVED', approved_by = @approvedBy, approved_at = NOW()
                  WHERE id = ANY(@ids)
                    AND status = 'DRAFT' AND persistency_gate_passed = TRUE
                  RETURNING id",
                new { approvedBy = request.ApprovedBy, ids = request.Ids.ToArray() });

            var approved = rows.AsList();

            var skipped = await conn.QueryFirstOrDefaultAsync<int>(
                @"SELECT COUNT(*)::int FROM ins_incentive_results
                  WHERE id = ANY(@ids) AND status = 'DRAFT' AND persistency_gate_passed = FALSE",
                new { ids = request.Ids.ToArray() });

            return Ok(ApiResponse<object>.Ok(new
            {
                approved = approved.Count,
                skipped_gate_failed = skipped,
            }));
        }

        if (!request.ProgramId.HasValue || string.IsNullOrEmpty(request.PeriodStart))
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "programId, periodStart" });

        var skippedCount = await conn.QueryFirstOrDefaultAsync<int>(
            @"SELECT COUNT(*)::int FROM ins_incentive_results
              WHERE program_id = @programId AND period_start = @periodStart::date
                AND status = 'DRAFT' AND persistency_gate_passed = FALSE",
            new { programId = request.ProgramId.Value, periodStart = request.PeriodStart });

        var approvedRows = await conn.QueryAsync<int>(
            @"UPDATE ins_incentive_results
              SET status = 'APPROVED', approved_by = @approvedBy, approved_at = NOW()
              WHERE program_id = @programId AND period_start = @periodStart::date
                AND status = 'DRAFT' AND persistency_gate_passed = TRUE
              RETURNING id",
            new
            {
                approvedBy = request.ApprovedBy,
                programId = request.ProgramId.Value,
                periodStart = request.PeriodStart,
            });

        var approvedList = approvedRows.AsList();

        return Ok(ApiResponse<object>.Ok(new
        {
            approved = approvedList.Count,
            skipped_gate_failed = skippedCount,
            approvedCount = approvedList.Count,
        }));
    }

    /// <summary>
    /// Initiate payment for APPROVED results.
    /// </summary>
    [HttpPost("initiate-payment")]
    public async Task<IActionResult> InitiatePayment([FromBody] InitiatePaymentRequest request)
    {
        if (request.Ids is not { Count: > 0 })
            throw new ApiException(ErrorCodes.VAL_001, new { field = "ids" });

        using var conn = await _db.CreateConnectionAsync();

        var rows = (await conn.QueryAsync<int>(
            @"UPDATE ins_incentive_results
              SET status = 'INITIATED'
              WHERE id = ANY(@ids) AND status = 'APPROVED'
              RETURNING id",
            new { ids = request.Ids.ToArray() })).AsList();

        if (rows.Count > 0)
        {
            foreach (var resultId in rows)
            {
                await conn.ExecuteAsync(
                    @"INSERT INTO payout_disbursement_log (result_id, paid_at, paid_by, payment_reference)
                      VALUES (@resultId, NOW(), @paidBy, @paymentReference)",
                    new
                    {
                        resultId,
                        paidBy = request.PaidBy,
                        paymentReference = request.PaymentReference,
                    });
            }
        }

        return Ok(ApiResponse<object>.Ok(new { count = rows.Count }));
    }

    /// <summary>
    /// Mark INITIATED results as PAID.
    /// </summary>
    [HttpPost("mark-paid")]
    public async Task<IActionResult> MarkPaid([FromBody] MarkPaidRequest request)
    {
        using var conn = await _db.CreateConnectionAsync();
        List<int> rows;

        if (request.Ids is { Count: > 0 })
        {
            rows = (await conn.QueryAsync<int>(
                @"UPDATE ins_incentive_results
                  SET status = 'PAID'
                  WHERE id = ANY(@ids) AND status = 'INITIATED'
                  RETURNING id",
                new { ids = request.Ids.ToArray() })).AsList();
        }
        else if (request.ProgramId.HasValue && !string.IsNullOrEmpty(request.PeriodStart))
        {
            rows = (await conn.QueryAsync<int>(
                @"UPDATE ins_incentive_results
                  SET status = 'PAID'
                  WHERE program_id = @programId AND period_start = @periodStart::date
                    AND status = 'INITIATED'
                  RETURNING id",
                new { programId = request.ProgramId.Value, periodStart = request.PeriodStart })).AsList();
        }
        else
        {
            throw new ApiException(ErrorCodes.VAL_001, new { fields = "ids or programId + periodStart" });
        }

        if (rows.Count > 0)
        {
            foreach (var resultId in rows)
            {
                await conn.ExecuteAsync(
                    @"INSERT INTO payout_disbursement_log (result_id, paid_at, paid_by)
                      VALUES (@resultId, NOW(), @paidBy)",
                    new { resultId, paidBy = request.PaidBy });
            }
        }

        return Ok(ApiResponse<object>.Ok(new { paid = rows.Count, paidCount = rows.Count }));
    }

    /// <summary>
    /// Approve a single DRAFT result.
    /// </summary>
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> ApproveSingle(int id, [FromBody] ApproveRequest? request)
    {
        using var conn = await _db.CreateConnectionAsync();
        var rows = (await conn.QueryAsync(
            @"UPDATE ins_incentive_results
              SET status = 'APPROVED', approved_by = @approvedBy, approved_at = NOW()
              WHERE id = @id AND status = 'DRAFT'
              RETURNING id, status",
            new { id, approvedBy = request?.ApprovedBy })).AsList();

        if (rows.Count == 0)
            throw new ApiException(ErrorCodes.VAL_006, new { field = "Result not found or already approved" });

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
            id = (int)rows[0].id,
            status = (string)rows[0].status,
        }));
    }

    public class BulkApproveRequest
    {
        public List<int>? Ids { get; set; }
        public int? ProgramId { get; set; }
        public string? PeriodStart { get; set; }
        public string? ApprovedBy { get; set; }
    }

    public class InitiatePaymentRequest
    {
        public List<int>? Ids { get; set; }
        public string? PaymentReference { get; set; }
        public string? PaidBy { get; set; }
    }

    public class MarkPaidRequest
    {
        public List<int>? Ids { get; set; }
        public int? ProgramId { get; set; }
        public string? PeriodStart { get; set; }
        public string? PaidBy { get; set; }
    }

    public class ApproveRequest
    {
        public string? ApprovedBy { get; set; }
    }
}
