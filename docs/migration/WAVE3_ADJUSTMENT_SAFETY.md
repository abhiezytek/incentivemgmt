# Wave 3 Adjustment Safety

> Verifies the additive adjustment design is preserved in the .NET implementation.

## Core Principle

**Base calculated values must remain unchanged.** Manual adjustments are stored in a separate additive table (`incentive_adjustments`) and never modify the original values in `ins_incentive_results`.

## Tables Involved

| Table | Purpose | Mutated by Wave 3? |
|-------|---------|-------------------|
| `ins_incentive_results` | Base calculated incentive results | **Only status field** (batch-approve: DRAFT→APPROVED) |
| `incentive_adjustments` | Additive adjustment records | ✅ INSERT only (adjust, hold, release) |
| `incentive_review_actions` | Audit trail of all review actions | ✅ INSERT only (all actions) |
| `operational_exceptions` | Exception log | ✅ UPDATE status/resolution only |

## Additive Design Verification

### 1. Manual Adjustments (`POST /:id/adjust`)

```sql
-- .NET: ReviewAdjustmentsSql.InsertAdjustment
INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by, notes)
VALUES (@resultId, @amount, 'MANUAL', @reason, @createdBy, @notes)
RETURNING *
```

- ✅ **INSERT only** — never UPDATE/DELETE on ins_incentive_results
- ✅ **Additive table** — incentive_adjustments is separate from base results
- ✅ **Original preserved** — `r.total_incentive` is never modified
- ✅ **Final payout transparent** — computed as `r.total_incentive + COALESCE(adj.total_adjustment, 0)`
- ✅ **PAID guard** — BUS_003 error prevents adjusting PAID results

### 2. Hold Actions (`POST /:id/hold`)

```sql
-- .NET: ReviewAdjustmentsSql.InsertHold
INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
VALUES (@resultId, 0, 'HOLD', @reason, @createdBy)
```

- ✅ **INSERT only** — no mutation of base result
- ✅ **Zero amount** — hold records have adjustment_amount = 0
- ✅ **Virtual status** — hold detected via EXISTS, not stored in status column
- ✅ **Base result unchanged** — ins_incentive_results.status remains as-is

### 3. Release Actions (`POST /:id/release`)

```sql
-- .NET: ReviewAdjustmentsSql.InsertRelease
INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
VALUES (@resultId, 0, 'RELEASE', 'Hold released', @createdBy)
```

- ✅ **INSERT only** — creates a RELEASE record that supersedes HOLD
- ✅ **Zero amount** — release records have adjustment_amount = 0
- ✅ **Temporal logic** — RELEASE.created_at > HOLD.created_at clears the hold

### 4. Batch Approve (`POST /batch-approve`)

```sql
-- .NET: ReviewAdjustmentsSql.BatchApprove
UPDATE ins_incentive_results
SET status = 'APPROVED', approved_by = @approvedBy, approved_at = NOW()
WHERE id = ANY(@ids) AND status = 'DRAFT' AND persistency_gate_passed = TRUE
RETURNING id
```

- ⚠️ **This is the ONLY mutation to ins_incentive_results** in Wave 3
- ✅ **Status field only** — does not modify calculated amounts
- ✅ **Held excluded** — held results detected and removed from eligible list before UPDATE
- ✅ **Gate-failed excluded** — WHERE persistency_gate_passed = TRUE
- ✅ **Only DRAFT → APPROVED** — cannot approve already-approved or initiated results
- ✅ **Audit trail recorded** — BATCH_APPROVE action inserted for each approved result

### 5. Exception Resolution (`POST /exception-log/:id/resolve`)

```sql
-- .NET: ExceptionLogSql.ResolveException
UPDATE operational_exceptions
SET status = @status, resolved_by = @resolvedBy, resolved_at = NOW(), resolution_note = @note
WHERE id = @id AND status NOT IN ('RESOLVED', 'DISMISSED')
RETURNING *
```

- ✅ **Exception table only** — no modification to incentive results
- ✅ **No cross-table impact** — exception status is independent of payout workflow
- ✅ **Idempotent** — cannot re-resolve already resolved/dismissed exceptions

## Audit Trail Completeness

Every write action in Wave 3 records an audit entry:

| Action | Recorded In | Fields |
|--------|------------|--------|
| ADJUST | `incentive_review_actions` | result_id, 'ADJUST', actor, {amount, reason} |
| HOLD | `incentive_review_actions` | result_id, 'HOLD', actor, {reason} |
| RELEASE | `incentive_review_actions` | result_id, 'RELEASE', actor, {} |
| BATCH_APPROVE | `incentive_review_actions` | result_id, 'BATCH_APPROVE', actor, {} |

Exception resolution does not write to `incentive_review_actions` (matches Node.js — exceptions are a separate concern).

## Risk Assessment

| Risk | Mitigation | Status |
|------|-----------|--------|
| Adjustment overwrites base value | INSERT only design, no UPDATE on total_incentive | ✅ Mitigated |
| Hold corrupts status column | Virtual HOLD via EXISTS, no UPDATE on status | ✅ Mitigated |
| Release without hold | RELEASE record is always valid (temporal logic handles edge case) | ✅ Matches Node |
| Approve held result | Held IDs excluded before UPDATE query | ✅ Mitigated |
| Approve gate-failed | WHERE persistency_gate_passed = TRUE | ✅ Mitigated |
| Exception resolves payout | Separate table, no cross-table UPDATE | ✅ Mitigated |
