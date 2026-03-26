# API Contract Parity Checklist

> For each major endpoint group, documents the exact contract the React frontend depends on.
> The .NET API must produce byte-compatible responses for seamless migration.

---

## 1. Programs (`/api/programs`)

### Request Shapes
| Endpoint | Content-Type | Body Fields | Required |
|----------|-------------|-------------|----------|
| POST `/programs` | application/json | `name`, `description`, `start_date`, `end_date`, `channel_id` | name, channel_id |
| PUT `/programs/:id` | application/json | Any subset of: `name`, `description`, `start_date`, `end_date`, `channel_id`, `status` | At least one field |
| PATCH `/programs/:id/status` | application/json | `status` | status (DRAFT\|ACTIVE\|CLOSED) |

### Response Shapes
```
GET /programs       → Array<Program>
GET /programs/:id   → Program object (single)
POST /programs      → Program object (created, 201)
PUT /programs/:id   → Program object (updated)
DELETE /programs/:id → Program object (deleted)
GET /programs/:id/summary → { program, kpiCount, payoutRuleCount, resultCount, ... }
GET /programs/:id/preview → { program, kpis[], payoutRules[], sampleCalculation }
```

### Auth Behavior
- No auth middleware applied (open access)

### Validation Behavior
- POST: Requires `name` (non-empty string)
- PATCH status: Validates transitions DRAFT→ACTIVE→CLOSED (no skip, no rollback)
- DELETE: Only allowed when status = DRAFT
- PUT: Protects `id`, `created_at`, `created_by` from modification

### Error Code Behavior
- 400: `VAL_001` (missing required field)
- 404: Standard `{ error: 'Program not found' }` or `BUS_001`
- 409: `BUS_002` (overlapping date range)
- 422: `BUS_001` (invalid status transition)

### Pagination/Filter Behavior
- No pagination on GET / (returns all programs)
- No query filters

---

## 2. KPIs (`/api/kpis`) + KPI Config (`/api/kpi-config`)

### Request Shapes
| Endpoint | Body Fields | Required |
|----------|-------------|----------|
| POST `/kpis` | `program_id`, `name`, `metric_type`, `target_value`, `weight`, `sort_order` | program_id, name |
| PUT `/kpis/:id` | Any subset of above | At least one |
| POST `/kpis/:kpiId/milestones` | `milestone_label`, `function_type`, `range_from`, `range_to`, `sort_order` | milestone_label, function_type |

### Response Shapes
```
GET /kpis           → Array<KPI>
GET /kpis/:id       → KPI + nested milestones[] (if any)
GET /kpi-config/registry → { stats: { totalKPIs, activeKPIs, programsLinked }, kpis: Array<KPI with milestones, programs, derivedVars> }
POST /kpi-config/:id/validate → { valid: boolean, warnings: string[], errors: string[] }
GET /kpi-config/:id/summary → { kpi, milestones[], payoutSlabs[], qualifyingRules[] }
```

### Validation
- `function_type` must be one of: `LEFT_INCLUSIVE_BETWEEN`, `BETWEEN`, `GTE`, `LTE`
- Milestone ranges should be continuous (validated by `/validate`)
- KPI `metric_type` values: `CURRENCY`, `COUNT`, `PERCENTAGE`, `RATIO`

---

## 3. Payouts (`/api/payouts`)

### Request Shapes
| Endpoint | Body Fields | Required |
|----------|-------------|----------|
| POST `/payouts` | `rule_name`, `program_id`, `calc_type`, `payout_type`, `has_qualifying_rules`, `team_override_pct` | rule_name, program_id |
| POST `/payouts/:id/slabs` | `slab_label`, `kpi_id`, `milestone_label`, `operator`, `value1`, `value2`, `incentive_operator`, `weight_pct`, `max_cap`, `payout_calc_type`, `sort_order` | kpi_id, operator |

### Response Shapes
```
GET /payouts         → Array<PayoutRule>
GET /payouts/:id     → PayoutRule + nested slabs[]
GET /payouts/:id/slabs → Array<Slab> sorted by sort_order
```

### Key Enums
- `calc_type`: FIXED, VARIABLE
- `payout_type`: COMMISSION, BONUS, OVERRIDE
- `operator`: GTE, LTE, BETWEEN, EQ
- `incentive_operator`: MULTIPLY, FLAT, PERCENTAGE_OF
- `payout_calc_type`: SUM, HIGHEST_AMOUNT

---

## 4. Calculate (`/api/calculate`)

### Request Shapes
| Endpoint | Body/Params | Required |
|----------|-------------|----------|
| POST `/calculate/run` | `{ programId, periodStart, periodEnd }` | All three |
| GET `/calculate/results` | Query: `program_id`, `period` (YYYY-MM) | Both required |
| POST `/calculate/:programId/:userId/:period` | Path params only | All three |

### Response Shapes
```
POST /calculate/run → {
  programId, totalAgents, successCount, errorCount,
  totalIncentivePool, errors: [{ agentCode, error }]
}

GET /calculate/results → Array<{
  id, agent_code, agent_name, channel_name, region_name,
  nb_incentive, renewal_incentive, clawback_amount,
  net_self_incentive, total_override, total_incentive,
  persistency_gate_passed, status, calculated_at, ...
}> sorted by total_incentive DESC

POST /calculate/:pid/:uid/:period → 201 with full breakdown JSONB
```

### Error Code Behavior
- 422: `CALC_001` (no performance data), `CALC_002` (no rate defined), `CALC_004` (division by zero)
- 409: `CALC_003` (calculation already in progress)
- 500: `CALC_005` (corrupted hierarchy)

---

## 5. Incentive Results (`/api/incentive-results`)

### Request Shapes
| Endpoint | Body | Required |
|----------|------|----------|
| POST `/incentive-results/bulk-approve` | `{ ids: number[], approvedBy: string }` | ids |
| POST `/incentive-results/initiate-payment` | `{ ids: number[], initiatedBy: string }` | ids |
| POST `/incentive-results/mark-paid` | `{ ids: number[], paidBy: string, paid_at: string }` | ids |

### Response Shapes
```
GET /incentive-results/stage-summary → {
  DRAFT: { count, total_incentive },
  APPROVED: { count, total_incentive },
  INITIATED: { count, total_incentive },
  PAID: { count, total_incentive }
}

GET /incentive-results/summary → {
  total_pool, total_self, total_override, agent_count,
  paid_count, avg_achievement, ...
}

GET /incentive-results → Array<Result> (paginated, default limit 50)

POST /incentive-results/bulk-approve → {
  approved: number, skipped_held: number, skipped_gate_failed: number
}
```

### Status Transitions
```
DRAFT → APPROVED (requires persistency_gate_passed = TRUE, not held)
APPROVED → INITIATED
INITIATED → PAID
```

### Query Filters
- `programId` (required)
- `periodStart` (required for summary/stage-summary)
- `channel` (optional)
- `status` (optional: DRAFT, APPROVED, INITIATED, PAID)

---

## 6. Review & Adjustments (`/api/review-adjustments`)

### Request Shapes
| Endpoint | Body | Required |
|----------|------|----------|
| POST `/:id/adjust` | `{ amount, reason, notes, adjustedBy }` | amount |
| POST `/:id/hold` | `{ reason, heldBy }` | reason |
| POST `/:id/release` | `{ releasedBy }` | — |
| POST `/batch-approve` | `{ ids[], approvedBy }` | ids |

### Response Shapes
```
GET / → {
  results: Array<ResultWithAdjustments>,
  total: number, limit: number, offset: number
}
Each result includes: adjustment_total, adjustment_count, is_held (virtual)

GET /:id → { result: {...}, adjustments: [...], auditTrail: [...] }
GET /:id/audit → { actions: [...], adjustments: [...] }
```

### Key Behavior
- Adjustments are **additive-only** — they never modify `ins_incentive_results` base fields
- HOLD is a **virtual status** — implemented via adjustment records of type "HOLD"
- Cannot adjust PAID results
- `is_held` computed from latest HOLD/RELEASE adjustment

---

## 7. Dashboard (`/api/dashboard`)

### Response Shape (GET /summary)
```json
{
  "kpi": {
    "total_pool": 485000.00,
    "total_self": 340000.00,
    "total_override": 145000.00,
    "agent_count": 80,
    "paid_count": 52,
    "agents_below_gate": 6,
    "avg_achievement": 112.5,
    "total_nb_premium": 25000000,
    "nb_policy_count": 320,
    "total_target": 22000000,
    "avg_persistency_13m": 87.3
  },
  "channelBreakdown": [{ "channel_name": "...", "agent_count": ..., "total": ... }],
  "productMix": [{ "product_name": "...", "premium": ..., "count": ... }],
  "topAgents": [{ "agent_code": "...", "agent_name": "...", "total_incentive": ... }],
  "programs": [{ "id": ..., "name": "...", "status": "..." }],
  "pipelineStatus": { "DRAFT": { "count": ..., "total": ... }, ... },
  "recentActivity": [{ "type": "...", "timestamp": "...", "details": "..." }]
}
```

### Query Filters
- `programId` (optional)
- `period` (optional, ISO date)

---

## 8. Upload Routes (`/api/upload`)

### Request Shape (all endpoints)
- Content-Type: `multipart/form-data`
- Field: `file` (CSV, max 20MB)
- Some endpoints also accept `programId` as form field

### Response Shape
```json
{
  "success": true,
  "inserted": 150,
  "total": 155,
  "skipped": 5,
  "invalid_rows": [{ "row": 12, "reason": "..." }]
}
```

### Validation Behavior
- CSV headers are lowercased, trimmed, spaces→underscores
- Date columns auto-detected by name pattern and converted to ISO
- Required columns vary by upload type (documented in inventory)
- Empty rows silently skipped
- Error: `VAL_007` (missing columns), `VAL_008` (file too large), `VAL_009` (wrong type)

---

## 9. Integration Routes

### Penta Inbound
```
POST /integration/penta/heartbeat → { status: "OK", timestamp }
POST /integration/penta/policy-data → { success, batch_id, received, staged }
```

### Export Outbound
```
POST /integration/export/oracle-financials → text/csv download
POST /integration/export/sap-fico → text/csv download
GET /integration/export/history → Array<ExportLogEntry>
```

### Integration Status
```
GET /integration/status → { lifeAsia: { status, lastFile, ... }, penta: { ... }, hierarchy: { ... }, outbound: { ... } }
GET /integration/file-log → Array<FileLogEntry>
GET /integration/audit-log → Array<AuditLogEntry>
```

---

## 10. Auth (`/api/auth`)

### System Token
```
POST /auth/system-token
Body: { client_id, client_secret }
Response: { token: "JWT...", expires_at: "ISO date" }
Error: 401 if credentials invalid
```

### System Auth Middleware Contract
- Header: `Authorization: Bearer <JWT>`
- JWT payload must have: `{ client_id, type: "SYSTEM" }`
- Checks `api_clients.is_active` and `api_clients.allowed_endpoints`
- Sets `req.apiClient` for downstream use

---

## Critical Parity Notes

1. **Raw arrays vs wrapped responses**: Many Node routes return raw arrays directly (e.g., `res.json(rows)`), not wrapped in `{ success, data }`. The .NET API must match this exactly.
2. **JSONB fields**: `calc_breakdown` is returned as parsed JSON object, not as string. Dapper must deserialize JSONB correctly.
3. **Date formats**: All dates in ISO-8601 (`YYYY-MM-DD` for dates, full ISO for timestamps). PostgreSQL `timestamptz` → JSON as ISO string.
4. **Numeric precision**: PostgreSQL `NUMERIC(15,2)` → JSON as numbers with 2 decimal places. Must not lose precision.
5. **Null handling**: JavaScript `null` → JSON `null`. `undefined` fields are omitted. .NET must match.
6. **Error responses vary**: Some routes use `apiError()` (standardized), others return `{ error: "message" }` directly. Must match per-route.
7. **CSV export**: Oracle/SAP exports set `Content-Type: text/csv` and `Content-Disposition: attachment`. Must match headers exactly.
8. **Policy masking**: Response middleware masks policy numbers. The .NET equivalent must apply the same rules with the same key names and masking algorithm.
