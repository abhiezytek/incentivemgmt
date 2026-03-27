# Wave 2 Validation Parity

> Documents validation rules preserved from Node.js for Wave 2 configuration endpoints.

---

## Program Status Transition (PATCH /api/programs/:id/status)

### Validation Rules (exact parity with Node.js)

| # | Rule | Node.js Code | .NET Code | Error Code | HTTP |
|---|------|-------------|-----------|------------|------|
| 1 | Status must be DRAFT, ACTIVE, or CLOSED | `VALID_STATUSES.includes(newStatus)` | `ValidStatuses.Contains(newStatus)` | VAL_003 | 400 |
| 2 | Program must exist | `findById(TABLE, id)` → null check | `FindByIdAsync(table, id)` → null check | VAL_006 | 400 |
| 3 | Cannot transition CLOSED → ACTIVE | `program.status === 'CLOSED' && newStatus === 'ACTIVE'` | Same condition | BUS_001 | 422 |
| 4 | No overlapping active programs (same channel, date range) | `OVERLAPS ($3, $4)` SQL | Same OVERLAPS SQL | BUS_002 | 409 |
| 5 | Must have KPI definitions when activating | `COUNT from kpi_definitions` | Same | BUS_007 | 422 |
| 6 | Must have payout rules when activating | `COUNT from payout_rules` | Same | BUS_006 | 422 |

### Status Transition Matrix

| From \ To | DRAFT | ACTIVE | CLOSED |
|-----------|-------|--------|--------|
| DRAFT | ✅ | ✅ (with checks 4-6) | ✅ |
| ACTIVE | ✅ | ✅ | ✅ |
| CLOSED | ✅ | ❌ (BUS_001) | ✅ |

---

## Program Update (PUT /api/programs/:id)

### Validation Rules

| # | Rule | Node.js Code | .NET Code | Error Code | HTTP |
|---|------|-------------|-----------|------------|------|
| 1 | Protected fields are filtered out | `PROTECTED_FIELDS = ['id', 'created_at', 'created_by']` | Same list | — | — |
| 2 | At least one updatable field required | `Object.keys(updates).length === 0` | `updates.Count == 0` | VAL_001 | 400 |
| 3 | Program must exist | `updateRow` returns null | `UpdateRowAsync` returns null | VAL_006 | 400 |

---

## Program Create (POST /api/programs)

### Validation Rules

| # | Rule | Node.js Code | .NET Code | Notes |
|---|------|-------------|-----------|-------|
| 1 | Body is passed directly to INSERT | `insertRow(TABLE, req.body)` | `InsertRowAsync(table, body)` | No explicit validation — relies on DB constraints |

> **Note**: Node.js has no explicit field validation for program creation.
> It relies entirely on PostgreSQL constraints (NOT NULL, UNIQUE, etc.).
> .NET preserves this exact behavior.

---

## KPI Config Validate (POST /api/kpi-config/:id/validate)

### Validation Checks

| # | Check | Type | Node.js Code | .NET Code | Match |
|---|-------|------|-------------|-----------|-------|
| 1 | KPI must exist | Error | `kpiRows.length === 0` → 404 | `kpi == null` → 404 | ✅ |
| 2 | Linked program must exist | Error | `prog.length === 0` | `prog == null` | ✅ |
| 3 | Linked program is CLOSED | Warning | `prog[0].status === 'CLOSED'` | Same check | ✅ |
| 4 | No milestones defined | Warning | `milestones.length === 0` | `milestones.Count == 0` | ✅ |
| 5 | Gap in milestone ranges | Warning | `curr.range_to < next.range_from` | Same comparison (decimal) | ✅ |
| 6 | KPI not linked to payout slab | Warning | `payoutLinks[0]?.cnt === 0` | Same check | ✅ |

### Response Shape

```json
{
  "valid": true,         // errors.length === 0
  "errors": [],          // Array of { field, message }
  "warnings": [],        // Array of { field, message }
  "milestoneCount": 4,   // Note: becomes milestone_count in .NET
  "payoutSlabLinks": 2   // Note: becomes payout_slab_links in .NET
}
```

---

## Validation Rules NOT Yet Migrated

The following validation rules exist in other Node.js routes but are not in Wave 2 scope:

| Rule | Route | Wave |
|------|-------|------|
| CSV column validation | `/api/upload/*` | Wave 3 |
| Date format validation | Various POST/PUT routes | Wave 2+ |
| Payout slab overlap checking | `/api/payouts/*` | Wave 2+ |
| Agent hierarchy validation | `/api/calculate/*` | Wave 4 |
| Incentive result status transitions | `/api/incentive-results/*` | Wave 3 |

---

## Error Code Registry (Wave 2 additions)

No new error codes were added. All Wave 2 validations use existing error codes from ErrorCodes.cs:

| Code | Status | Message | Used By |
|------|--------|---------|---------|
| VAL_001 | 400 | Required field missing | PUT update (empty body) |
| VAL_003 | 400 | Invalid enum value | PATCH status (bad status) |
| VAL_006 | 400 | Referenced record not found | GET summary, PUT, PATCH, DELETE (not found) |
| BUS_001 | 422 | Program is not in ACTIVE status | PATCH status (CLOSED→ACTIVE) |
| BUS_002 | 409 | Overlapping program date range | PATCH status (overlap check) |
| BUS_006 | 422 | No payout rules defined | PATCH status (activation check) |
| BUS_007 | 422 | No KPI rules defined | PATCH status (activation check) |
