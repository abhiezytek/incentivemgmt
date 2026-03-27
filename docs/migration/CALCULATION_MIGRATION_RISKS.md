# Calculation Migration Risks

> Documents the highest-risk areas in the Node.js → .NET 10 migration.
> The calculation engine is the core business logic — any behavioral difference is a production-critical bug.

---

## 1. Calculation Engine Touchpoints

### Generic Engine (`calculateIncentive.js` — 270 lines)

| Step | Logic | Tables | Risk Level |
|------|-------|--------|------------|
| Step 1 | Fetch KPI definitions for program | `kpi_definitions` | Low |
| Step 2-3 | Fetch performance data, compute `achievement_pct = (achieved/target)*100` | `performance_data` | **Medium** — division by zero when target=0 returns 0 |
| Step 4-5 | Match milestones per KPI using `matchesMilestone()` | `kpi_milestones` | **High** — boundary conditions critical |
| Step 5-9 | Evaluate payout slabs: qualifying gates → slab matching → incentive calculation | `payout_rules`, `payout_slabs`, `payout_qualifying_rules` | **Critical** — most complex logic |
| Step 10 | Sum slab payouts (SUM vs HIGHEST_AMOUNT) | — | **High** — calc_type/payout_calc_type interaction |
| Step 11-13 | Team rollup: fetch reportees → their self_incentive → apply `team_override_pct` | `group_members`, `incentive_results` | Medium |
| Step 14 | Persist to `incentive_results` with JSONB `calc_breakdown` | `incentive_results` | Low |

### Insurance Engine (`insuranceCalcEngine.js` — 177 lines)

| Step | Logic | Tables | Risk Level |
|------|-------|--------|------------|
| Step 1 | Call `compute_agent_kpi()` PL/pgSQL function | `ins_agent_kpi_summary` | **High** — SQL function with JSONB aggregation |
| Step 2 | Product-wise NB incentive: rate lookup by product_code, rate_type, premium slabs | `ins_incentive_rates`, `ins_products` | **Critical** — 3 rate types, slab bounds |
| Step 3 | Renewal incentive: percentage of renewal premium | `ins_incentive_rates` | Medium |
| Step 4 | Persistency gate check: 13M/25M/37M/49M thresholds | `ins_persistency_gates` | **Critical** — gate consequences affect all amounts |
| Step 5 | MLM override: downline lookup via `hierarchy_path LIKE`, 3 levels | `ins_agents`, `ins_mlm_override_rates`, `ins_incentive_results` | **High** — LIKE-based hierarchy, level matching |
| Step 6 | UPSERT to `ins_incentive_results` | `ins_incentive_results` | Medium — ON CONFLICT clause |

---

## 2. Rate Lookup Touchpoints

### NB Rate Lookup (Insurance Engine Step 2)
```sql
WHERE r.program_id = $1
  AND r.transaction_type = 'NEW_BUSINESS'
  AND r.policy_year = 1
  AND r.effective_from <= $2
  AND (r.effective_to IS NULL OR r.effective_to >= $2)
  AND r.is_active = TRUE
```

**Risk**: Date comparison logic (inclusive bounds), NULL effective_to handling.

### Rate Type Calculation
| rate_type | Formula | Risk |
|-----------|---------|------|
| `PERCENTAGE_OF_PREMIUM` | `(premium * incentive_rate) / 100` | Medium — decimal precision |
| `FLAT_PER_POLICY` | `count * incentive_rate` | Low |
| `PERCENTAGE_OF_APE` | `(ape * incentive_rate) / 100` | Medium — APE may be null/0 |

### Premium Slab Bounds
```javascript
if (premium < rate.min_premium_slab || premium > rate.max_premium_slab) continue;
```
**Risk**: Boundary conditions — must be `<` and `>` (exclusive), not `<=` / `>=`.

---

## 3. Persistency Gate Logic

### Gate Evaluation Order
Gates are processed in ascending `persistency_month` order. First `BLOCK_INCENTIVE` gate that fails terminates the loop and zeros all incentives.

### Gate Consequences

| Consequence | Behavior | Risk |
|-------------|----------|------|
| `BLOCK_INCENTIVE` | Sets `nbIncentive = 0`, `renewalIncentive = 0`, breaks loop | **Critical** — order-dependent, full reset |
| `REDUCE_BY_PCT` | Reduces NB incentive by `consequence_value`% | **High** — percentage of current (not original) NB |
| `CLAWBACK_PCT` | Adds clawback amount (separate from REDUCE) | Medium |

### Persistency Field Access Pattern
```javascript
const persField = `persistency_${gate.persistency_month}m`;
const agentPers = kpi[persField] || 0;
```
**Risk**: Dynamic field name construction. The KPI summary JSONB must have fields named `persistency_13m`, `persistency_25m`, `persistency_37m`, `persistency_49m`. Missing field defaults to 0 (treated as failed gate).

---

## 4. Approval State Transitions

### Pipeline: DRAFT → APPROVED → INITIATED → PAID

| Transition | Guard | Side Effects |
|------------|-------|--------------|
| DRAFT → APPROVED | `persistency_gate_passed` must be TRUE; not held (virtual) | Records `incentive_review_actions` |
| APPROVED → INITIATED | None (status check only) | Updates `initiated_at`, `initiated_by` |
| INITIATED → PAID | None (status check only) | Updates `paid_at`, `paid_by` |

### Bulk Approve Response
```json
{ "approved": 18, "skipped_held": 2, "skipped_gate_failed": 1 }
```
**Risk**: The skip counting logic — must match exactly. Items that are already APPROVED/INITIATED/PAID are silently skipped (not counted as error).

### Virtual HOLD Status
- A result is "held" if the latest adjustment of type `HOLD` has no subsequent `RELEASE`
- HOLD prevents approval but does NOT change the `status` column
- The review-adjustments endpoint computes `is_held` at query time

---

## 5. Export Source Queries

### Oracle AP Export
```sql
SELECT r.*, a.agent_name, a.agent_code, ...
FROM ins_incentive_results r
JOIN ins_agents a ON a.agent_code = r.agent_code
WHERE r.program_id = $1 AND r.period_start = $2 AND r.status = 'APPROVED'
```

**Side effect**: After generating the CSV, status is updated to `INITIATED`:
```sql
UPDATE ins_incentive_results SET status = 'INITIATED', initiated_at = NOW() WHERE id = ANY($1)
```

**CSV Column Format (Oracle AP)**:
- Dates: `DD-MON-YYYY` (e.g., `15-MAR-2025`)
- Amounts: 2 decimal places
- Policy numbers: **NOT masked** (export path skips masking middleware)

### SAP FICO Export
- Dates: `DD.MM.YYYY` (e.g., `15.03.2025`)
- Includes: VENDOR_CODE, COST_CENTER, GL_ACCOUNT, PROFIT_CENTER
- Same side effect: APPROVED → INITIATED

**Risk**: Date format differences between Oracle and SAP exports must be preserved exactly.

---

## 6. Highest-Risk Migration Areas

### Rank 1: Milestone Matching Logic (CRITICAL)
**Why**: Boundary conditions in `matchesMilestone()` are the most precision-sensitive:
- `LEFT_INCLUSIVE_BETWEEN`: `v >= from && v < to` (left-inclusive, right-exclusive)
- `BETWEEN`: `v >= from && v <= to` (both inclusive)
- `GTE`: `v >= from`
- `LTE`: `v <= from`

A single `<` vs `<=` error changes incentive amounts for every agent.

**Mitigation**: Port exact comparison logic. Regression test R01-R21 verify baseline values.

### Rank 2: Slab Evaluation & Incentive Operators (CRITICAL)
**Why**: Multiple interacting conditions:
- Slab matching (operator + value1/value2)
- Milestone label matching (optional filter)
- Incentive calculation (MULTIPLY/FLAT/PERCENTAGE_OF with weight_pct and max_cap)
- Sum vs Max (calc_type VARIABLE → pick max; others → sum)

**Mitigation**: Port line-by-line. Use regression tests to verify.

### Rank 3: Persistency Gate Cascade (HIGH)
**Why**: Gate processing is order-dependent. First BLOCK terminates everything. REDUCE applies to current (not original) value.

**Mitigation**: Preserve loop order and break semantics exactly.

### Rank 4: MLM Hierarchy Path Matching (HIGH)
**Why**: Uses `LIKE '$myPath.%'` for downline discovery. Hierarchy levels are relative (`hierarchy_level - myLevel`). Override rates are matched by relative level.

**Mitigation**: Verify LIKE pattern escaping (dots in path). Test with multi-level hierarchies.

### Rank 5: JSONB Serialization/Deserialization (HIGH)
**Why**: `calc_breakdown` and `nb_by_product` are stored as JSONB. JavaScript naturally handles this; C# needs explicit JSON handling with Dapper.

**Mitigation**: Use `System.Text.Json` or `Newtonsoft.Json` with Dapper type handlers. Test round-trip serialization.

### Rank 6: Qualifying Gate AND/OR Logic (MEDIUM-HIGH)
**Why**: Uses `condition_join` field — if ANY rule has `OR`, the entire gate set uses OR logic; otherwise AND. This is a subtle behavior.

```javascript
const isOr = qRules.some((qr) => qr.condition_join === 'OR');
const qualified = isOr ? results.some(Boolean) : results.every(Boolean);
```

### Rank 7: CSV Date Parsing (MEDIUM)
**Why**: Node uses `new Date()` constructor which handles many formats. C# `DateTime.Parse` has different default behavior.

**Mitigation**: Use `DateTime.TryParseExact` with explicit format strings.

### Rank 8: Decimal Precision (MEDIUM)
**Why**: JavaScript uses IEEE 754 doubles. C# `decimal` is 128-bit. Small rounding differences could accumulate.

**Mitigation**: Use `decimal` in C# for all monetary calculations. Match PostgreSQL `NUMERIC(15,2)` exactly.

### Rank 9: Null/Default Handling (MEDIUM)
**Why**: JavaScript `null` and `undefined` behave differently. `Number(null)` = 0, `Number(undefined)` = NaN. C# has different null semantics.

**Mitigation**: Explicitly handle nullable fields. Use `?? 0` pattern matching JavaScript's `|| 0`.

### Rank 10: Bulk Insert UNNEST Semantics (LOW-MEDIUM)
**Why**: Node uses `UNNEST($1::text[])` for bulk inserts. C# Dapper doesn't have a direct equivalent.

**Mitigation**: Use `Dapper`'s multi-row insert or build UNNEST SQL manually with parameter arrays.

---

## 7. What Must NOT Change

| Aspect | Reason |
|--------|--------|
| Milestone boundary comparisons (`<` vs `<=` etc.) | Changes incentive amounts for all agents |
| Persistency gate order and break semantics | First BLOCK_INCENTIVE terminates; order matters |
| Slab sum vs max behavior (calc_type dependent) | Changes total incentive calculation |
| Rate type formulas (3 types) | Changes NB incentive for every product |
| JSONB calc_breakdown structure | Frontend parses and displays this |
| Status pipeline (DRAFT→APPROVED→INITIATED→PAID) | Workflow correctness |
| Export date formats (DD-MON-YYYY for Oracle, DD.MM.YYYY for SAP) | Integration compliance |
| Policy number masking algorithm (first 3 + asterisks + last 3) | PII compliance |
| Qualifying gate AND/OR evaluation | Changes whether agents qualify for incentive |
| MLM override level matching (relative level) | Changes override amounts |
| `compute_agent_kpi()` PL/pgSQL function behavior | Database function — shared between Node and .NET |
| Team rollup using direct reportees' self_incentive | Changes team incentive calculation |
| Bulk approve skip counting (held, gate_failed) | Frontend displays these counts |
| UPSERT ON CONFLICT semantics for ins_incentive_results | Calculation idempotency |
