# Wave 2 Parity Notes

> Documents response shape differences between Node.js and .NET for Wave 2 endpoints.

---

## Programs CRUD Endpoints

### POST /api/programs → 201
- **Node.js**: Returns `insertRow(TABLE, req.body)` → RETURNING * (dynamic columns)
- **.NET**: Returns `InsertRowAsync("incentive_programs", body)` → RETURNING * (dynamic columns)
- **Parity**: ✅ Exact match — both use generic INSERT RETURNING * with dynamic body.

### PUT /api/programs/:id → 200
- **Node.js**: Filters `PROTECTED_FIELDS = ['id', 'created_at', 'created_by']`, then `updateRow(TABLE, id, updates)`.
- **.NET**: Filters same protected fields, then `UpdateRowAsync("incentive_programs", id, updates)`.
- **Parity**: ✅ Exact match.
- **Error shape**: Node uses `apiError('VAL_001')` for empty updates, `apiError('VAL_006')` for not found.
  .NET uses `throw new ApiException(ErrorCodes.VAL_001)` and `ApiException(ErrorCodes.VAL_006)` respectively.
  Both produce `{ success: false, error: "...", code: "VAL_001" }`.

### PATCH /api/programs/:id/status → 200
- **Node.js**: Returns `updateRow(TABLE, id, { status })` → full program object.
- **.NET**: Returns `UpdateRowAsync("incentive_programs", id, { status })` → full program object.
- **Parity**: ✅ Exact match.
- **Validation errors**: Same error codes (VAL_003, VAL_006, BUS_001, BUS_002, BUS_006, BUS_007).
- **Note on BUS_001**: Node.js error message says "Program is not in ACTIVE status" but it's used for
  the CLOSED→ACTIVE forbidden transition. This is preserved as-is (matching the ErrorCodes.cs definition).

### DELETE /api/programs/:id → 200
- **Node.js**: Returns `deleteRow(TABLE, id)` → deleted row object.
- **.NET**: Returns `DeleteRowAsync("incentive_programs", id)` → deleted row object.
- **Parity**: ✅ Exact match.

### GET /api/programs/:id/summary → 200
- **Node.js response shape**:
  ```json
  {
    "program": { ... },
    "kpi_count": 3,
    "payout_rule_count": 2,
    "agent_count": 45,
    "has_results": true
  }
  ```
- **.NET response shape**: Same structure via anonymous type.
- **Parity**: ✅ Exact match.
- **Note**: Node.js uses `users` table for agent count. .NET preserves this. The preview endpoint
  uses `ins_agents` table instead. This difference exists in Node.js itself and is preserved.

---

## KPI Config Endpoints

### GET /api/kpi-config/registry → 200
- **Node.js response shape**:
  ```json
  {
    "stats": { "totalKPIs": 25, "activeKPIs": 20, "programsLinked": 5, "derivedVariables": 8 },
    "kpis": [ { "id": 1, "kpi_name": "...", "milestones": [...], ... } ],
    "derivedVariables": [ { "id": 1, "var_name": "...", ... } ]
  }
  ```
- **.NET response shape**: Same structure. Note: `stats` uses camelCase field names (`totalKPIs`, `activeKPIs`, etc.)
  which the .NET snake_case serializer will convert to `total_kpis`, `active_kpis`, etc.
- **Parity**: ⚠️ Minor difference — `stats` field names become snake_case in .NET:
  - Node: `totalKPIs` → .NET: `total_kpis`
  - Node: `activeKPIs` → .NET: `active_kpis`
  - Node: `programsLinked` → .NET: `programs_linked`
  - Node: `derivedVariables` → .NET: `derived_variables` (top-level key too)
- **Impact**: Frontend may need to handle both formats during transition. RTK Query
  hooks should be checked for hardcoded camelCase key access.

### POST /api/kpi-config/:id/validate → 200
- **Node.js response shape**:
  ```json
  {
    "valid": true,
    "errors": [],
    "warnings": [],
    "milestoneCount": 4,
    "payoutSlabLinks": 2
  }
  ```
- **.NET response shape**: Same structure. `milestoneCount` → `milestone_count`, `payoutSlabLinks` → `payout_slab_links`.
- **Parity**: ⚠️ Same snake_case difference as registry endpoint.

### GET /api/kpi-config/:id/summary → 200
- **Node.js response shape**: Spread KPI object + `milestones`, `payoutSlabs`, `qualifyingRules` arrays.
- **.NET response shape**: Same. Uses Dictionary spread pattern matching Node.js `{...kpiRows[0], milestones, payoutSlabs, qualifyingRules}`.
- **Parity**: ✅ Exact match for DB columns (already snake_case). `payoutSlabs` → `payout_slabs` and
  `qualifyingRules` → `qualifying_rules` — but these are added as dictionary keys, not C# properties,
  so they preserve the camelCase as written in the code.
- **Clarification**: The keys `payoutSlabs` and `qualifyingRules` are added directly as Dictionary keys
  in the repository, so they will NOT be converted to snake_case by the serializer.
  This matches Node.js behavior.

---

## Error Response Parity

| Error | Node.js Status | .NET Status | Match |
|-------|---------------|-------------|-------|
| Invalid status enum | 400 (VAL_003) | 400 (VAL_003) | ✅ |
| Program not found | 400/404 (VAL_006) | 400 (VAL_006) | ✅ |
| CLOSED→ACTIVE blocked | 422 (BUS_001) | 422 (BUS_001) | ✅ |
| Overlapping active programs | 409 (BUS_002) | 409 (BUS_002) | ✅ |
| No payout rules | 422 (BUS_006) | 422 (BUS_006) | ✅ |
| No KPI rules | 422 (BUS_007) | 422 (BUS_007) | ✅ |
| Empty update body | 400 (VAL_001) | 400 (VAL_001) | ✅ |
| KPI not found | 404 | 404 | ✅ |
| Server error | 500 | 500 (GEN_001) | ⚠️ .NET wraps in `{success, error, code}` format |

---

## Summary of Parity Gaps

| # | Gap | Severity | Impact |
|---|-----|----------|--------|
| 1 | KPI registry `stats` field names become snake_case | Low | Frontend RTK Query hooks may need to accept both |
| 2 | KPI validate `milestoneCount`/`payoutSlabLinks` become snake_case | Low | Same as above |
| 3 | Server error format differs (Node: `{error}`, .NET: `{success, error, code}`) | Low | More structured in .NET — already documented in Wave 1 |
