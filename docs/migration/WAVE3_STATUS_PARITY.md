# Wave 3 Status Parity

> Documents status transition behavior preserved from Node.js in Wave 3.

## Incentive Result Status Pipeline

```
DRAFT → APPROVED → INITIATED → PAID
```

### Status Transitions in Wave 3

| Transition | Trigger Endpoint | DB Table | Business Rules | Preserved |
|-----------|-----------------|----------|----------------|-----------|
| DRAFT → APPROVED | `POST /batch-approve` | `ins_incentive_results` | Only DRAFT + gate_passed = TRUE | ✅ |
| — | — | — | Held results excluded from batch | ✅ |
| — | — | — | Gate-failed excluded | ✅ |

### Status Transitions NOT in Wave 3 (remain in Node.js)

| Transition | Trigger | Wave |
|-----------|---------|------|
| APPROVED → INITIATED | Payment initiation | Wave 4 |
| INITIATED → PAID | Mark-paid/disbursement | Wave 4 |
| Any → recalculated | Calculation re-run | Wave 4 |

## Virtual HOLD Status

HOLD is NOT a status in `ins_incentive_results.status`. It is a **virtual status** determined by:

```sql
EXISTS (
  SELECT 1 FROM incentive_adjustments adj
  WHERE adj.result_id = r.id AND adj.adjustment_type = 'HOLD'
    AND NOT EXISTS (
      SELECT 1 FROM incentive_adjustments rel
      WHERE rel.result_id = r.id AND rel.adjustment_type = 'RELEASE'
        AND rel.created_at > adj.created_at
    )
)
```

This means:
- A result is "held" if a HOLD record exists without a subsequent RELEASE
- The actual `status` column remains unchanged (still DRAFT, APPROVED, etc.)
- Hold/release are purely additive operations in `incentive_adjustments`
- Batch approve correctly excludes held results using this same EXISTS check

**Preserved exactly in .NET**: ✅

## Manual Adjustment Impact on Status

Manual adjustments (`POST /:id/adjust`):
- Do NOT change `ins_incentive_results.status`
- Only insert into `incentive_adjustments` table
- The `total_payout` is computed as: `r.total_incentive + COALESCE(adj.total_adjustment, 0)`
- Cannot adjust PAID results (BUS_003 error)

**Preserved exactly in .NET**: ✅

## Exception Resolution Impact

Exception resolution (`POST /exception-log/:id/resolve`):
- Only updates `operational_exceptions` table
- Does NOT modify `ins_incentive_results` status
- Does NOT affect payout workflow
- Transitions: OPEN/INVESTIGATING → RESOLVED or DISMISSED

**Preserved exactly in .NET**: ✅

## No Mismatches Found

All status behaviors from Node.js are preserved exactly in the .NET implementation.
