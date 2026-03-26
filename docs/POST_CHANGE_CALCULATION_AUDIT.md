# Post-Change Calculation Integrity Audit

**Date:** 2026-03-26
**Auditor:** Automated Code Audit
**System:** Insurance Incentive Management System
**Scope:** All additive features added since baseline

---

## 1. Objective

Verify that the following newly added features have **not** impacted the existing
incentive calculation engine, approval workflow, payout pipeline, or export logic:

- reviewAdjustments APIs (7 endpoints)
- exceptionLog APIs (3 endpoints)
- executive summary API (1 endpoint)
- system status API (1 endpoint)
- notifications APIs (3 endpoints)
- orgDomainMapping API (1 endpoint)
- kpiConfig read/validate APIs (3 endpoints)
- program preview endpoint (1 endpoint)
- Additive tables: `incentive_adjustments`, `incentive_review_actions`,
  `operational_exceptions`, `notification_events`

---

## 2. Change Scope Reviewed

### New Route Files (7 files)

| File | Endpoints | Tables Written | Core Tables Modified |
|------|-----------|----------------|----------------------|
| `reviewAdjustments.js` | 7 (GET /, GET /:id, POST /:id/adjust, POST /:id/hold, POST /:id/release, POST /batch-approve, GET /:id/audit) | `incentive_adjustments` (INSERT), `incentive_review_actions` (INSERT), `ins_incentive_results` (UPDATE status via batch-approve) | YES — batch-approve updates status DRAFT→APPROVED (mirrors existing logic) |
| `exceptionLog.js` | 3 (GET /, GET /:id, POST /:id/resolve) | `operational_exceptions` (UPDATE status) | NO |
| `executiveSummary.js` | 1 (GET /executive-summary) | None (read-only) | NO |
| `systemStatus.js` | 1 (GET /summary) | None (read-only) | NO |
| `notifications.js` | 3 (GET /, POST /:id/read, POST /mark-all-read) | `notification_events` (UPDATE is_read) | NO |
| `orgDomainMapping.js` | 1 (GET /) | None (read-only) | NO |
| `kpiConfig.js` | 3 (GET /registry, POST /:id/validate, GET /:id/summary) | None (read-only) | NO |

### New Program Endpoint (in existing file)

| File | Endpoint | Tables Written | Core Tables Modified |
|------|----------|----------------|----------------------|
| `programs.js` | GET /:id/preview | None (read-only) | NO |

### New Migration

| File | Operation | Existing Tables Modified |
|------|-----------|-------------------------|
| `006_additive_tables.sql` | CREATE TABLE ×4 | **NO** — zero ALTER/DROP statements |

### Route Registration (server/index.js)

All 7 new route modules are **appended** to the Express app. No existing route
registrations were moved, renamed, or removed. Both `/api/v1/` and `/api/` prefixes
are used (consistent with existing pattern).

---

## 3. Core Calculation Paths Inspected

### 3.1 Calculation Engine — `server/src/engine/insuranceCalcEngine.js`

| Step | Function | Tables Read | Tables Written |
|------|----------|-------------|----------------|
| KPI computation | `compute_agent_kpi()` | `ins_policy_transactions`, `ins_persistency_data` | `ins_agent_kpi_summary` (UPSERT) |
| NB incentive rates | inline SQL | `ins_incentive_rates`, `ins_products` | — |
| Renewal incentive rates | inline SQL | `ins_incentive_rates` | — |
| Persistency gate check | inline SQL | `ins_persistency_gates` | — |
| MLM override | inline SQL | `ins_agents`, `ins_incentive_results`, `ins_mlm_override_rates` | — |
| Result save | UPSERT | — | `ins_incentive_results` |

**Additive table references in engine: NONE**

The calculation engine (`insuranceCalcEngine.js`, 177 lines) does **not** import,
reference, or join any of the four additive tables. The engine's SQL queries
exclusively read from:
- `ins_agent_kpi_summary`
- `ins_incentive_rates`
- `ins_products`
- `ins_persistency_gates`
- `ins_agents`
- `ins_mlm_override_rates`
- `ins_incentive_results` (for downline overrides)

And writes exclusively to:
- `ins_incentive_results` (UPSERT with `ON CONFLICT`)

**Verdict: ✅ SAFE — Engine is completely isolated from additive features.**

### 3.2 Stored Procedure — `server/src/db/functions/compute_agent_kpi.sql`

The stored procedure computes KPIs from `ins_policy_transactions` and
`ins_persistency_data`, writing to `ins_agent_kpi_summary`. It does **not**
reference any additive tables.

**Verdict: ✅ SAFE**

### 3.3 Calculation Trigger — `server/src/routes/calculate.js`

Routes `/api/calculate/run` and `/api/calculate/{programId}/{userId}/{period}`
call `calculateAgentIncentive()` from the engine. No additive tables referenced.

**Verdict: ✅ SAFE**

---

## 4. Approval Workflow Paths Inspected

### 4.1 Status Transition Map

```
DRAFT → APPROVED → INITIATED → PAID
```

| Transition | File | Endpoint | WHERE Clause |
|-----------|------|----------|-------------|
| DRAFT → APPROVED (bulk) | `incentiveResults.js:425-430` | POST /bulk-approve | `status='DRAFT' AND persistency_gate_passed=TRUE` |
| DRAFT → APPROVED (single) | `incentiveResults.js:742-745` | POST /:id/approve | `status='DRAFT'` |
| APPROVED → INITIATED | `incentiveResults.js:539-544` | POST /initiate-payment | `status='APPROVED'` |
| APPROVED → INITIATED | `export.js:131-135` | POST /oracle-financials, POST /sap-fico | `status='APPROVED'` |
| INITIATED → PAID | `incentiveResults.js:638-643` | POST /mark-paid | `status='INITIATED'` |

### 4.2 New Batch-Approve in reviewAdjustments.js

The `reviewAdjustments.js` file contains a `POST /batch-approve` endpoint
(line 437-443) that performs the same DRAFT → APPROVED transition:

```sql
UPDATE ins_incentive_results
SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
WHERE id = ANY($2::int[])
  AND status = 'DRAFT' AND persistency_gate_passed = TRUE
RETURNING id
```

This uses the **exact same WHERE clause** as the original bulk-approve in
`incentiveResults.js`. Additionally, it checks for held results and excludes
them from approval. This is an **extension** of the approval workflow, not a
modification.

### 4.3 No Bypass Routes Found

- No new route sets status to `APPROVED` without checking `persistency_gate_passed`
- No new route sets status to `INITIATED` or `PAID` directly
- Exception resolution in `exceptionLog.js` only updates `operational_exceptions.status`
  (not `ins_incentive_results.status`)
- Notification routes only update `notification_events.is_read`
- Hold/release in `reviewAdjustments.js` insert rows into `incentive_adjustments`
  (they do NOT modify `ins_incentive_results.status`)

**Verdict: ✅ SAFE — DRAFT → APPROVED → INITIATED → PAID pipeline is intact.**

---

## 5. Payout Eligibility Paths Inspected

### 5.1 Payout Initiation

`incentiveResults.js` POST `/initiate-payment` (line 531-562):
- WHERE: `status = 'APPROVED'`
- Action: UPDATE → `status = 'INITIATED'`
- Side effect: INSERT into `payout_disbursement_log`

No new routes touch or bypass this endpoint.

### 5.2 Mark-Paid Flow

`incentiveResults.js` POST `/mark-paid` (line 631-670):
- WHERE: `status = 'INITIATED'`
- Action: UPDATE → `status = 'PAID'`
- Side effect: INSERT into `payout_disbursement_log`

No new routes touch or bypass this endpoint.

**Verdict: ✅ SAFE — Payout eligibility logic is unchanged.**

---

## 6. Export Eligibility Paths Inspected

### 6.1 Export Query — `server/src/routes/integration/export.js`

`fetchExportRows()` (line 99-122):

```sql
SELECT r.id AS result_id, r.agent_code, r.program_id, r.period_start,
       r.total_incentive, a.agent_name, c.code AS channel_code,
       c.name AS channel_name, rg.region_code
FROM ins_incentive_results r
JOIN ins_agents a ON a.agent_code = r.agent_code
JOIN channels c ON c.id = a.channel_id
LEFT JOIN ins_regions rg ON rg.id = a.region_id
WHERE r.program_id = $1
  AND r.period_start = $2
  AND r.status IN ('APPROVED', 'INITIATED')
  AND r.total_incentive > 0
ORDER BY r.agent_code
```

**Key observations:**
- Export uses `r.total_incentive` (base calculated value), NOT adjusted payout
- No JOIN to `incentive_adjustments` or any additive table
- Status filter remains `IN ('APPROVED', 'INITIATED')`
- No inclusion of held/released/manual exception rows
- No duplicates possible from additive table joins (none exist)

### 6.2 Export Status Transition

After export, `markResultsInitiated()` (line 128-136) transitions:
```sql
UPDATE ins_incentive_results SET status = 'INITIATED'
WHERE id = ANY($1) AND status = 'APPROVED'
```

This is unchanged and unaffected by additive tables.

**Verdict: ✅ SAFE — Export uses base `total_incentive` from `ins_incentive_results` only.
No additive tables are joined or referenced in export queries.**

---

## 7. Risk Areas Found

### 7.1 LOW RISK — reviewAdjustments.js batch-approve duplicates approval logic

The `reviewAdjustments.js` `POST /batch-approve` endpoint performs the same
`DRAFT → APPROVED` transition as `incentiveResults.js`. While the WHERE clause
is identical, this creates **two entry points** for approval. This is a design
choice, not a defect:

- Both enforce `status = 'DRAFT' AND persistency_gate_passed = TRUE`
- The reviewAdjustments version additionally checks for held results (extra safety)
- Audit trail is recorded via `incentive_review_actions`

**Risk:** LOW — No data corruption possible. Both paths are safe.

### 7.2 INFO — executiveSummaryRouter missing userAuth middleware

In `server/index.js`, the `executiveSummaryRouter` is registered without `userAuth`
middleware at both `/api/v1/dashboard` and `/api/dashboard`. This is likely
intentional (shared with the existing dashboard router), but should be verified.

**Risk:** Not a calculation impact. Authentication concern only.

### 7.3 NONE — All other new routes are read-only or additive-only

- `exceptionLog.js` — only modifies `operational_exceptions` (additive table)
- `notifications.js` — only modifies `notification_events.is_read` (additive table)
- `kpiConfig.js` — read-only
- `orgDomainMapping.js` — read-only
- `systemStatus.js` — read-only
- `programs.js` preview — read-only

---

## 8. Tests Executed

### 8.1 Existing Regression Tests (R01-R21)

The existing regression test suite at
`server/src/tests/regression/calculationRegressionTest.js` covers:

| Group | Tests | Coverage |
|-------|-------|----------|
| Calculation Totals | R01-R03 | Stage summary, dashboard totals, result fields |
| Top Earner | R04-R05 | Dashboard top agents, sort order |
| Approval Counts | R06-R08 | Stage counts, bulk approve validation, single approve |
| Export Behavior | R09-R10 | Programs list, integration status |
| Additive API Safety | R11-R18 | All 7 new APIs, totals unchanged after additive calls |
| Payout Flow | R19-R21 | Initiate payment validation, mark-paid validation, preview |

### 8.2 Enhanced Regression Test (created as part of this audit)

The enhanced regression test at the same path now includes:
- **Baseline value assertions** from seeded Jan 2026 program data
- **Exact total verification**: pool, self incentive, override, DRAFT count
- **Top earner verification**: AGT-JR-005 with 34,800
- **Gate-failed count**: exactly 1 (AGT-JR-004)
- **Additive isolation checks**: verify adjustments don't modify base fields
- **Status distribution checks**: before/after additive operations
- **Export eligible count verification**

### 8.3 SQL Query Audit Script (created as part of this audit)

Manual audit script at
`server/src/tests/regression/calculationQueryAudit.sql` provides:
- Base result totals per program/period
- Status distribution counts
- Gate pass/fail counts
- Export eligible record counts
- Adjusted vs base total comparison
- Unexpected status change detection

---

## 9. Findings Summary

### Destructive SQL Changes — **NONE FOUND**

| Check | Result |
|-------|--------|
| UPDATE/DELETE against `ins_incentive_results` from new routes | **SAFE** — only `reviewAdjustments.js` batch-approve (mirrors existing logic) |
| Joins altering result totals | **SAFE** — no new JOINs modify result sums |
| Changes to status semantics | **SAFE** — no new status values introduced |
| Changes to approval filters | **SAFE** — WHERE clauses identical to existing |
| Changes to export source data | **SAFE** — export query unchanged |
| Trigger/stored procedure impact | **SAFE** — no triggers or procedures modified |
| Migration modifying existing core tables | **SAFE** — 006_additive_tables.sql is CREATE TABLE only |

### Core Table Impact Analysis

| Table | New Routes Read | New Routes Write | Impact |
|-------|----------------|------------------|--------|
| `ins_policy_transactions` | ❌ Not read by new routes | ❌ Not written | **SAFE** |
| `ins_persistency_data` | ❌ Not read by new routes | ❌ Not written | **SAFE** |
| `ins_agent_kpi_summary` | ✅ Read by reviewAdjustments (display only) | ❌ Not written | **SAFE** |
| `ins_incentive_results` | ✅ Read by reviewAdjustments, executiveSummary | ✅ Status UPDATE by batch-approve | **SAFE** (mirrors existing approval logic) |
| `ins_incentive_rates` | ❌ Not read by new routes | ❌ Not written | **SAFE** |
| `ins_mlm_override_rates` | ❌ Not read by new routes | ❌ Not written | **SAFE** |

### Additive Table Isolation Verification

| Table | Modified by Engine | Joined in Export | Joined in Approval WHERE | Impact on Calculations |
|-------|-------------------|------------------|--------------------------|----------------------|
| `incentive_adjustments` | ❌ NO | ❌ NO | ❌ NO | **NONE** |
| `incentive_review_actions` | ❌ NO | ❌ NO | ❌ NO | **NONE** |
| `operational_exceptions` | ❌ NO | ❌ NO | ❌ NO | **NONE** |
| `notification_events` | ❌ NO | ❌ NO | ❌ NO | **NONE** |

---

## 10. Final Verdict

### ✅ No Calculation Impact

The calculation engine (`insuranceCalcEngine.js`) and stored procedure
(`compute_agent_kpi.sql`) have **zero references** to any additive table.
The KPI computation pipeline reads exclusively from `ins_policy_transactions`,
`ins_persistency_data`, `ins_incentive_rates`, `ins_products`,
`ins_persistency_gates`, `ins_agents`, and `ins_mlm_override_rates`.
Results are written to `ins_incentive_results` via UPSERT. None of these
paths are touched by the new features.

### ✅ No Approval Impact

The DRAFT → APPROVED → INITIATED → PAID pipeline remains structurally
unchanged. The new batch-approve in `reviewAdjustments.js` uses the **identical
WHERE clause** as the existing bulk-approve, with the additional safety of
checking for held results. No route bypasses the approval gate check
(`persistency_gate_passed = TRUE`).

### ✅ No Export Impact

The Oracle AP and SAP FICO export queries (`fetchExportRows`) use
`r.total_incentive` from `ins_incentive_results` with status filter
`IN ('APPROVED', 'INITIATED')`. No additive table is joined or referenced
in the export path. The `markResultsInitiated()` function is unchanged.

### Files Inspected

1. `server/src/engine/insuranceCalcEngine.js` — calculation engine (177 lines)
2. `server/src/engine/calculateIncentive.js` — calculation orchestrator
3. `server/src/routes/calculate.js` — calculation trigger routes
4. `server/src/routes/incentiveResults.js` — approval/payout routes (~800 lines)
5. `server/src/routes/integration/export.js` — Oracle/SAP export (545 lines)
6. `server/src/routes/integration/status.js` — integration health
7. `server/src/routes/integration/penta.js` — Penta inbound
8. `server/src/routes/reviewAdjustments.js` — NEW: review adjustments
9. `server/src/routes/exceptionLog.js` — NEW: exception log
10. `server/src/routes/executiveSummary.js` — NEW: executive summary
11. `server/src/routes/systemStatus.js` — NEW: system status
12. `server/src/routes/notifications.js` — NEW: notifications
13. `server/src/routes/orgDomainMapping.js` — NEW: org domain mapping
14. `server/src/routes/kpiConfig.js` — NEW: KPI config
15. `server/src/routes/programs.js` — extended with preview endpoint
16. `server/src/routes/policyTransactions.js` — policy data ingestion
17. `server/src/routes/persistencyData.js` — persistency data upload
18. `server/src/routes/incentiveRates.js` — rate master data
19. `server/src/routes/dashboard.js` — dashboard aggregation
20. `server/src/routes/leaderboard.js` — leaderboard display
21. `server/src/routes/payouts.js` — payout rules CRUD
22. `server/src/routes/performance.js` — performance data
23. `server/src/db/functions/compute_agent_kpi.sql` — stored procedure
24. `server/src/db/migrations/001_master_schema.sql` — master schema
25. `server/src/db/migrations/002_insurance_schema.sql` — insurance schema
26. `server/src/db/migrations/003_integration_schema.sql` — integration schema
27. `server/src/db/migrations/006_additive_tables.sql` — additive tables
28. `server/src/db/seeds/003_program_seed.sql` — seed data
29. `server/index.js` — route registration
30. `server/src/tests/regression/calculationRegressionTest.js` — regression tests
31. `server/src/tests/e2e/fullFlowTest.js` — end-to-end tests

### Recommended Manual Smoke Tests

1. Run calculation for Jan 2026 program and verify totals match seeded values
2. Verify AGT-JR-005 remains top earner with total_incentive = 34,800
3. Verify AGT-JR-004 is gate-failed (persistency_gate_passed = false)
4. Approve a DRAFT result, verify status changes to APPROVED only
5. Insert an adjustment via reviewAdjustments, re-read the result → `nb_incentive` unchanged
6. Hold a result, attempt batch-approve → verify held result is excluded
7. Release the held result, batch-approve → verify it now gets approved
8. Run Oracle AP export, verify CSV uses `total_incentive` (not adjusted)
9. Run SAP FICO export, verify same behavior
10. Mark exported results as PAID, verify `payout_disbursement_log` entry
11. Verify exception resolution does not change any incentive result status
12. Verify notification mark-read does not change any business data

---

**Calculation engine and payout flow remain structurally unchanged.
All new features are additive and do not alter base incentive math.**
