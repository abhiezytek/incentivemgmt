# Wave 3 Parity Notes

> Documents response contract parity between Node.js and .NET for Wave 3 endpoints.

## Review & Adjustments

### GET /api/review-adjustments (list)

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Response shape | `{ summary, rows, pagination }` | `{ summary, rows, pagination }` | ✅ |
| Summary fields | `total_calculated, total_held, total_adjustments, net_payout, total_count` | Same | ✅ |
| Row fields | `id, agent_code, program_id, period_start, period_end, calculated, net_self_incentive, total_override, status, persistency_gate_passed, agent_name, channel_name, region_name, program_name, adjustment, hold_count, total_payout` | Same | ✅ |
| Pagination | `{ limit, offset, total }` | `{ limit, offset, total }` | ✅ |
| HOLD filter | Virtual status via EXISTS sub-query | Same EXISTS sub-query | ✅ |
| LATERAL JOIN | Used for per-row adjustment aggregation | Same | ✅ |
| Order | `ORDER BY r.total_incentive DESC` | Same | ✅ |
| Default limit | 50 | 50 | ✅ |

### GET /api/review-adjustments/:id (detail)

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Response shape | `{ ...result, adjustments, auditTrail }` | Same (spread result + arrays) | ✅ |
| KPI fields | `nb_achievement_pct, nb_total_premium, persistency_13m, nb_policy_count, nb_target_premium` | Same | ✅ |
| Agent fields | `agent_name, branch_code, hierarchy_level, channel_name, region_name` | Same | ✅ |
| Not found | 404 with `apiError('VAL_006')` | 400 with VAL_006 (via exception middleware) | ⚠️ Minor |

> **Note**: Node.js returns HTTP 404 for not-found results. .NET returns the VAL_006 error code through the exception middleware which uses the error code's configured status (400). The error body shape is identical. Frontend typically checks `error.code` rather than HTTP status.

### POST /api/review-adjustments/:id/adjust

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Request body | `{ amount, reason, notes, adjustedBy }` | Same | ✅ |
| Required fields | `amount` | `amount` | ✅ |
| Missing amount | VAL_001 | VAL_001 | ✅ |
| PAID guard | BUS_003 | BUS_003 | ✅ |
| Success response | `{ success: true, adjustment: {...} }` | Same | ✅ |
| Not found | 404 with VAL_006 | 400 with VAL_006 | ⚠️ Minor |

### POST /api/review-adjustments/:id/hold

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Request body | `{ reason, heldBy }` | Same | ✅ |
| Success response | `{ success: true, held: true }` | Same | ✅ |
| Not found | 404 with VAL_006 | 400 with VAL_006 | ⚠️ Minor |

### POST /api/review-adjustments/:id/release

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Request body | `{ releasedBy }` | Same | ✅ |
| Success response | `{ success: true, released: true }` | Same | ✅ |
| Not found | 404 with VAL_006 | 400 with VAL_006 | ⚠️ Minor |

### POST /api/review-adjustments/batch-approve

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Request body | `{ ids: [int], approvedBy }` | Same | ✅ |
| Required fields | `ids` (non-empty array) | Same | ✅ |
| Missing ids | VAL_001 | VAL_001 | ✅ |
| Success response | `{ approved, skipped_held, skipped_gate_failed }` | Same | ✅ |
| Empty eligible | `{ approved: 0, skipped_held: N, skipped_gate_failed: 0 }` | Same | ✅ |

### GET /api/review-adjustments/:id/audit

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Response shape | `{ actions, adjustments }` | Same | ✅ |
| Order | `ORDER BY created_at DESC` for both | Same | ✅ |

## Exception Log

### GET /api/exception-log (list)

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Response shape | `{ summary, rows, pagination }` | Same | ✅ |
| Summary cards | Always unfiltered | Always unfiltered | ✅ |
| Summary fields | `open_count, resolved_today, critical_count, sources_affected, total_count` | Same | ✅ |
| Pagination | `{ limit, offset, total }` | Same | ✅ |
| Default limit | 25 | 25 | ✅ |
| Order | `ORDER BY created_at DESC` | Same | ✅ |

### GET /api/exception-log/:id (detail)

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Response shape | Single row object | Same | ✅ |
| Not found | 404 with VAL_006 | 400 with VAL_006 | ⚠️ Minor |

### POST /api/exception-log/:id/resolve

| Aspect | Node.js | .NET | Match |
|--------|---------|------|-------|
| Request body | `{ status, resolvedBy, note }` | Same | ✅ |
| Default status | 'RESOLVED' | 'RESOLVED' | ✅ |
| Allowed statuses | RESOLVED, DISMISSED | RESOLVED, DISMISSED | ✅ |
| Invalid status | VAL_003 | VAL_003 | ✅ |
| Already resolved | 404 with `"Exception not found or already resolved"` | 404 with same message | ✅ |
| Success | `{ success: true, exception: {...} }` | Same | ✅ |

## Known Minor Differences

| # | Difference | Impact | Mitigation |
|---|-----------|--------|-----------|
| 1 | Not-found responses use HTTP 400 (from VAL_006 error code config) instead of explicit 404 | Low — frontend checks error code, not HTTP status | Error code is identical (VAL_006) |
| 2 | Error body uses `{ success, error, code, details }` in .NET vs `{ error, code, field }` in Node.js | Low — code field is the same | Frontend should check `code` field |
| 3 | JSON field naming uses snake_case in .NET (configured in Program.cs) | None — matches Node.js behavior | N/A |
