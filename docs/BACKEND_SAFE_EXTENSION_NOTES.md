# Backend Safe Extension Notes

> Classification of every proposed new API endpoint and database table for the prototype-inspired redesign.

---

## Classification Legend

| Tag | Meaning |
|-----|---------|
| **READ** | Reads existing tables only; no writes |
| **WRAP** | Thin wrapper around existing business logic or queries |
| **ADDITIVE-WRITE** | Writes to a NEW table (never modifies existing tables) |
| **ADDITIVE-READ** | Reads from a NEW table created by this redesign |

### Risk Levels

| Level | Meaning |
|-------|---------|
| 🟢 **None** | Zero risk to existing functionality |
| 🟡 **Low** | Minimal risk; limited to new code paths |
| 🟠 **Medium** | Could affect adjacent features if misconfigured |
| 🔴 **High** | Directly adjacent to calculation or approval logic; requires careful isolation |

---

## New API Endpoints

### 1. KPI Config — Composite View

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/kpi-config` |
| **Classification** | READ, WRAP |
| **Tables read** | `kpi_definitions`, `kpi_milestones`, `derived_variables` |
| **Tables written** | None |
| **Existing logic reused** | Combines queries from `kpis.js` and `derivedVariables.js` |
| **Regression risk** | 🟢 None — read-only aggregation |
| **Dependency** | Existing `kpi_definitions` and `derived_variables` table schemas |
| **Priority** | Can defer to Phase 2 |

---

### 2. KPI Config — Composite Write

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/kpi-config` |
| **Classification** | WRAP |
| **Tables read** | `kpi_definitions` (for validation) |
| **Tables written** | `kpi_definitions`, `kpi_milestones` (existing tables via existing queries) |
| **Existing logic reused** | Delegates to existing `POST /api/v1/kpis` and milestone creation logic |
| **Regression risk** | 🟡 Low — wrapper only; validate that existing `kpis.js` insert logic is called, not duplicated |
| **Dependency** | `kpis.js` route handlers |
| **Priority** | Can defer to Phase 2 |

---

### 3. Review Adjustments — Create

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/review-adjustments` |
| **Classification** | ADDITIVE-WRITE |
| **Tables read** | `incentive_results` or `ins_incentive_results` (to validate the target result exists and fetch original amount) |
| **Tables written** | `review_adjustments` (NEW), `review_adjustment_audit` (NEW) |
| **Existing logic reused** | None — entirely new logic |
| **Regression risk** | 🔴 High — must never UPDATE existing `incentive_results` rows |
| **Dependency** | New `review_adjustments` table must exist first |
| **Priority** | **Must implement** in Phase 3 |

#### Guardrails

- INSERT only into `review_adjustments`; no UPDATE/DELETE on `incentive_results`
- Adjustment stores: `incentive_result_id`, `amount_delta`, `reason`, `adjusted_by`, `adjusted_at`, `status` (PENDING/APPROVED/REJECTED)
- Original `total_incentive` is NEVER modified
- Display total at read time: `original_total + SUM(approved adjustments)`

---

### 4. Review Adjustments — List

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/review-adjustments` |
| **Classification** | ADDITIVE-READ |
| **Tables read** | `review_adjustments` (NEW), `incentive_results` (JOIN for context) |
| **Tables written** | None |
| **Existing logic reused** | None |
| **Regression risk** | 🟢 None — read-only on new table |
| **Dependency** | New `review_adjustments` table |
| **Priority** | Must implement in Phase 3 (paired with create endpoint) |

---

### 5. Review Adjustments — Audit Trail

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/review-adjustments/audit-trail` |
| **Classification** | ADDITIVE-READ |
| **Tables read** | `review_adjustment_audit` (NEW) |
| **Tables written** | None |
| **Existing logic reused** | None |
| **Regression risk** | 🟢 None — read-only on new table |
| **Dependency** | New `review_adjustment_audit` table |
| **Priority** | Can defer to Phase 3 |

---

### 6. Exception Log — Aggregated View

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/exceptions` |
| **Classification** | READ |
| **Tables read** | `file_processing_log`, `stg_policy_transactions`, `stg_agent_master`, `integration_audit_log` |
| **Tables written** | None |
| **Existing logic reused** | Reuses query patterns from `integration/status.js` (failed-records) |
| **Regression risk** | 🟢 None — read-only aggregation |
| **Dependency** | Existing staging and audit tables |
| **Priority** | Can defer to Phase 3 |

#### Performance Note

Query across multiple tables may be slow. Recommend:
- Date-range filter (required parameter)
- Pagination (limit/offset)
- Optional source filter (`?source=PENTA&status=FAILED`)

---

### 7. Org & Domain Mapping — Agent List

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/org-mapping/agents` |
| **Classification** | READ, WRAP |
| **Tables read** | `ins_agents`, `ins_regions`, `channels` |
| **Tables written** | None |
| **Existing logic reused** | Extends query patterns from `agents.js` |
| **Regression risk** | 🟢 None — read-only |
| **Dependency** | Existing `ins_agents` table |
| **Priority** | Can defer to Phase 2 |

---

### 8. Org & Domain Mapping — Update Agent

| Field | Value |
|-------|-------|
| **Endpoint** | `PUT /api/v1/org-mapping/agents/:id` |
| **Classification** | WRAP |
| **Tables read** | `ins_agents` (for validation) |
| **Tables written** | `ins_agents` (existing table — UPDATE only non-calc fields: branch_code, region_id, status) |
| **Existing logic reused** | None — new update logic, but on existing table |
| **Regression risk** | 🟠 Medium — editing `hierarchy_path` or `parent_agent_id` affects MLM calculations |
| **Dependency** | Existing `ins_agents` table |
| **Priority** | Can defer to Phase 2 |

#### Guardrails

- Whitelist updatable fields: `branch_code`, `region_id`, `status`, `license_expiry`
- `hierarchy_path` and `parent_agent_id` edits require separate approval flow
- Log all changes to `integration_audit_log` with `source_system = 'MANUAL'`

---

### 9. Org & Domain Mapping — Regions

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/org-mapping/regions` |
| **Classification** | READ |
| **Tables read** | `ins_regions` |
| **Tables written** | None |
| **Existing logic reused** | Simple SELECT query |
| **Regression risk** | 🟢 None |
| **Dependency** | Existing `ins_regions` table |
| **Priority** | Can defer to Phase 2 |

---

### 10. Org & Domain Mapping — Channels

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/org-mapping/channels` |
| **Classification** | READ |
| **Tables read** | `channels` |
| **Tables written** | None |
| **Existing logic reused** | Simple SELECT query |
| **Regression risk** | 🟢 None |
| **Dependency** | Existing `channels` table |
| **Priority** | Can defer to Phase 2 |

---

### 11. Notifications — List

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/notifications` |
| **Classification** | ADDITIVE-READ |
| **Tables read** | `notifications` (NEW) |
| **Tables written** | None |
| **Existing logic reused** | None |
| **Regression risk** | 🟢 None — new table only |
| **Dependency** | New `notifications` table |
| **Priority** | Can defer to Phase 4 |

---

### 12. Notifications — Mark Read

| Field | Value |
|-------|-------|
| **Endpoint** | `PATCH /api/v1/notifications/:id/read` |
| **Classification** | ADDITIVE-WRITE |
| **Tables read** | `notifications` (NEW) |
| **Tables written** | `notifications` (NEW — UPDATE `is_read` flag) |
| **Existing logic reused** | None |
| **Regression risk** | 🟢 None — operates on new table only |
| **Dependency** | New `notifications` table |
| **Priority** | Can defer to Phase 4 |

---

### 13. Notifications — Preferences

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/notifications/preferences` |
| **Classification** | ADDITIVE-WRITE |
| **Tables read** | `notification_preferences` (NEW) |
| **Tables written** | `notification_preferences` (NEW) |
| **Existing logic reused** | None |
| **Regression risk** | 🟢 None — new table only |
| **Dependency** | New `notification_preferences` table |
| **Priority** | Can defer to Phase 4 |

---

### 14. Settings — Read All

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/settings` |
| **Classification** | READ, WRAP |
| **Tables read** | `system_config` |
| **Tables written** | None |
| **Existing logic reused** | Query pattern exists in `integration/status.js` for individual keys |
| **Regression risk** | 🟢 None — read-only |
| **Dependency** | Existing `system_config` table |
| **Priority** | Can defer to Phase 4 |

---

### 15. Settings — Update Key

| Field | Value |
|-------|-------|
| **Endpoint** | `PUT /api/v1/settings/:key` |
| **Classification** | WRAP |
| **Tables read** | `system_config` (for validation) |
| **Tables written** | `system_config` (existing table — UPDATE `config_value` for whitelisted keys) |
| **Existing logic reused** | None — new write logic on existing table |
| **Regression risk** | 🟠 Medium — editing certain keys (e.g., SFTP config) could disrupt integrations |
| **Dependency** | Existing `system_config` table |
| **Priority** | Can defer to Phase 4 |

#### Guardrails

- Whitelist of editable keys: `POLICY_MASK_ENABLED`, `POLICY_MASK_PATTERN`, `HIERARCHY_SYNC_CRON`, `SFTP_POLL_CRON`
- Sensitive keys (`*_SECRET`, `*_PASSWORD`) are NEVER exposed or editable
- All changes logged with old_value, new_value, changed_by, changed_at

---

### 16. Settings — Masking Config

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/v1/settings/masking` |
| **Classification** | READ |
| **Tables read** | `system_config` (keys: `POLICY_MASK_ENABLED`, `POLICY_MASK_PATTERN`) |
| **Tables written** | None |
| **Existing logic reused** | `dataMask.js` → `shouldMask()` reads same keys |
| **Regression risk** | 🟢 None — read-only |
| **Dependency** | Existing `system_config` table |
| **Priority** | Can defer to Phase 4 |

---

## New Database Tables

### Table 1 — `review_adjustments`

| Field | Value |
|-------|-------|
| **Classification** | ADDITIVE-WRITE |
| **Purpose** | Store manual incentive adjustment records |
| **Regression risk** | 🔴 High — adjacent to incentive result data |
| **Dependency** | FK to `incentive_results.id` or `ins_incentive_results.id` |
| **Priority** | **Must implement** in Phase 3 |

```sql
CREATE TABLE review_adjustments (
    id              SERIAL PRIMARY KEY,
    result_id       INTEGER NOT NULL,          -- FK to incentive_results or ins_incentive_results
    result_table    VARCHAR(50) NOT NULL,       -- 'incentive_results' or 'ins_incentive_results'
    adjustment_type VARCHAR(30) NOT NULL,       -- 'INCREASE', 'DECREASE', 'OVERRIDE_COMPONENT'
    component       VARCHAR(50),               -- which component: 'nb_incentive', 'renewal', 'override', etc.
    original_amount NUMERIC(15,2) NOT NULL,
    adjusted_amount NUMERIC(15,2) NOT NULL,
    amount_delta    NUMERIC(15,2) NOT NULL,     -- adjusted - original (can be negative)
    reason          TEXT NOT NULL,
    adjusted_by     INTEGER NOT NULL,           -- FK to users.id
    adjusted_at     TIMESTAMP DEFAULT NOW(),
    status          VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by     INTEGER,
    approved_at     TIMESTAMP,
    program_id      INTEGER,
    period_start    DATE,
    period_end      DATE
);
```

#### Safety Rules
- This table is INSERT-only from the application perspective (no UPDATE on existing rows except status transitions)
- Original `incentive_results` row is NEVER modified
- The `amount_delta` is computed and stored at creation time

---

### Table 2 — `review_adjustment_audit`

| Field | Value |
|-------|-------|
| **Classification** | ADDITIVE-WRITE |
| **Purpose** | Immutable audit log for every adjustment action |
| **Regression risk** | 🟢 None — append-only log |
| **Dependency** | FK to `review_adjustments.id` |
| **Priority** | **Must implement** in Phase 3 |

```sql
CREATE TABLE review_adjustment_audit (
    id              SERIAL PRIMARY KEY,
    adjustment_id   INTEGER NOT NULL,          -- FK to review_adjustments.id
    action          VARCHAR(30) NOT NULL,       -- 'CREATED', 'APPROVED', 'REJECTED', 'ESCALATED'
    performed_by    INTEGER NOT NULL,           -- FK to users.id
    performed_at    TIMESTAMP DEFAULT NOW(),
    old_status      VARCHAR(20),
    new_status      VARCHAR(20),
    notes           TEXT
);
```

#### Safety Rules
- No UPDATE or DELETE allowed on this table
- Application code must INSERT only

---

### Table 3 — `notifications`

| Field | Value |
|-------|-------|
| **Classification** | ADDITIVE-WRITE |
| **Purpose** | Store in-app notifications |
| **Regression risk** | 🟢 None — completely new, isolated feature |
| **Dependency** | FK to `users.id` |
| **Priority** | Can defer to Phase 4 |

```sql
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    recipient_id    INTEGER NOT NULL,           -- FK to users.id
    type            VARCHAR(50) NOT NULL,       -- 'APPROVAL_REQUIRED', 'EXPORT_READY', 'INTEGRATION_FAILED', 'ADJUSTMENT_CREATED'
    title           VARCHAR(200) NOT NULL,
    message         TEXT,
    reference_type  VARCHAR(50),               -- 'incentive_result', 'file_processing_log', etc.
    reference_id    INTEGER,                   -- ID in the referenced table
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    read_at         TIMESTAMP
);
```

---

### Table 4 — `notification_preferences`

| Field | Value |
|-------|-------|
| **Classification** | ADDITIVE-WRITE |
| **Purpose** | Per-user notification preferences |
| **Regression risk** | 🟢 None — completely new, isolated feature |
| **Dependency** | FK to `users.id` |
| **Priority** | Can defer to Phase 4 |

```sql
CREATE TABLE notification_preferences (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,    -- FK to users.id
    approval_alerts BOOLEAN DEFAULT TRUE,
    export_alerts   BOOLEAN DEFAULT TRUE,
    integration_alerts BOOLEAN DEFAULT TRUE,
    exception_alerts BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Endpoint Priority Summary

| # | Endpoint | Classification | Risk | Priority |
|---|----------|---------------|------|----------|
| 1 | `GET /api/v1/kpi-config` | READ, WRAP | 🟢 | Defer (Phase 2) |
| 2 | `POST /api/v1/kpi-config` | WRAP | 🟡 | Defer (Phase 2) |
| 3 | `POST /api/v1/review-adjustments` | ADDITIVE-WRITE | 🔴 | **Must** (Phase 3) |
| 4 | `GET /api/v1/review-adjustments` | ADDITIVE-READ | 🟢 | **Must** (Phase 3) |
| 5 | `GET /api/v1/review-adjustments/audit-trail` | ADDITIVE-READ | 🟢 | Defer (Phase 3) |
| 6 | `GET /api/v1/exceptions` | READ | 🟢 | Defer (Phase 3) |
| 7 | `GET /api/v1/org-mapping/agents` | READ, WRAP | 🟢 | Defer (Phase 2) |
| 8 | `PUT /api/v1/org-mapping/agents/:id` | WRAP | 🟠 | Defer (Phase 2) |
| 9 | `GET /api/v1/org-mapping/regions` | READ | 🟢 | Defer (Phase 2) |
| 10 | `GET /api/v1/org-mapping/channels` | READ | 🟢 | Defer (Phase 2) |
| 11 | `GET /api/v1/notifications` | ADDITIVE-READ | 🟢 | Defer (Phase 4) |
| 12 | `PATCH /api/v1/notifications/:id/read` | ADDITIVE-WRITE | 🟢 | Defer (Phase 4) |
| 13 | `POST /api/v1/notifications/preferences` | ADDITIVE-WRITE | 🟢 | Defer (Phase 4) |
| 14 | `GET /api/v1/settings` | READ, WRAP | 🟢 | Defer (Phase 4) |
| 15 | `PUT /api/v1/settings/:key` | WRAP | 🟠 | Defer (Phase 4) |
| 16 | `GET /api/v1/settings/masking` | READ | 🟢 | Defer (Phase 4) |

### Table Priority Summary

| # | Table | Classification | Risk | Priority |
|---|-------|---------------|------|----------|
| 1 | `review_adjustments` | ADDITIVE-WRITE | 🔴 | **Must** (Phase 3) |
| 2 | `review_adjustment_audit` | ADDITIVE-WRITE | 🟢 | **Must** (Phase 3) |
| 3 | `notifications` | ADDITIVE-WRITE | 🟢 | Defer (Phase 4) |
| 4 | `notification_preferences` | ADDITIVE-WRITE | 🟢 | Defer (Phase 4) |

---

## Files That Must NOT Be Modified

These files are frozen during the redesign. Any change to them requires separate architectural approval.

| File | Reason |
|------|--------|
| `server/src/engine/calculateIncentive.js` | Core generic calculation engine |
| `server/src/engine/insuranceCalcEngine.js` | Insurance-specific calculation engine |
| `server/src/db/functions/compute_agent_kpi.sql` | KPI aggregation SQL function |
| `server/src/routes/integration/export.js` | SAP FICO / Oracle AP export — payload contract frozen |
| `server/src/routes/integration/penta.js` | Penta inbound API — payload contract frozen |
| `server/src/routes/integration/lifeasia.js` | Life Asia webhook — payload contract frozen |
| `server/src/middleware/systemAuth.js` | System-to-system authentication |
| `server/src/utils/dataMask.js` | PII masking logic |

---

## Migration File Naming Convention

New migrations should follow the existing numbering scheme:

```
006_review_adjustments.sql      — Phase 3
007_notifications.sql           — Phase 4
```

Each migration must include:
- `CREATE TABLE IF NOT EXISTS` for idempotency
- Corresponding indexes for query performance
- A rollback section (`-- ROLLBACK: DROP TABLE IF EXISTS ...`)

---

## Implementation Status (Actual)

> Updated after code implementation — reflects what was actually built.

### APIs Added

| Endpoint | Method | Route File | Status |
|----------|--------|------------|--------|
| `/api/review-adjustments` | GET | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/:id` | GET | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/:id/adjust` | POST | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/:id/hold` | POST | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/:id/release` | POST | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/batch-approve` | POST | `reviewAdjustments.js` | ✅ Implemented |
| `/api/review-adjustments/:id/audit` | GET | `reviewAdjustments.js` | ✅ Implemented |
| `/api/exception-log` | GET | `exceptionLog.js` | ✅ Implemented |
| `/api/exception-log/:id` | GET | `exceptionLog.js` | ✅ Implemented |
| `/api/exception-log/:id/resolve` | POST | `exceptionLog.js` | ✅ Implemented |
| `/api/dashboard/executive-summary` | GET | `executiveSummary.js` | ✅ Implemented |
| `/api/system-status/summary` | GET | `systemStatus.js` | ✅ Implemented |
| `/api/notifications` | GET | `notifications.js` | ✅ Implemented |
| `/api/notifications/:id/read` | POST | `notifications.js` | ✅ Implemented |
| `/api/notifications/mark-all-read` | POST | `notifications.js` | ✅ Implemented |
| `/api/org-domain-mapping` | GET | `orgDomainMapping.js` | ✅ Implemented |
| `/api/kpi-config/registry` | GET | `kpiConfig.js` | ✅ Implemented |
| `/api/kpi-config/:id/validate` | POST | `kpiConfig.js` | ✅ Implemented |
| `/api/kpi-config/:id/summary` | GET | `kpiConfig.js` | ✅ Implemented |
| `/api/programs/:id/preview` | GET | `programs.js` | ✅ Implemented |

### Migrations Added

| File | Tables |
|------|--------|
| `006_additive_tables.sql` | `incentive_adjustments`, `incentive_review_actions`, `operational_exceptions`, `notification_events` |

### Existing Routes Preserved

All 20+ existing route files are unchanged. The following route registrations in `server/index.js` remain intact:
- `/api/upload`, `/api/programs`, `/api/kpis`, `/api/payouts`, `/api/calculate`
- `/api/groups`, `/api/incentive-results`, `/api/leaderboard`, `/api/dashboard`
- `/api/performance`, `/api/derived-variables`, `/api/policy-transactions`
- `/api/agents`, `/api/persistency-data`, `/api/products`, `/api/incentive-rates`
- `/api/auth`, `/api/integration/*`

### Tables NOT Modified

- `ins_policy_transactions` — untouched
- `ins_persistency_data` — untouched
- `ins_agent_kpi_summary` — untouched
- `ins_incentive_results` — untouched (adjustments stored separately)
- `ins_incentive_rates` — untouched
- `ins_mlm_override_rates` — untouched

### Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| New tables fail to create | Low | All use `CREATE TABLE IF NOT EXISTS` |
| Adjustment sums incorrectly included in payouts | Medium | Adjustments are in separate table; payout export queries read `ins_incentive_results` only |
| Executive summary query performance | Low | Reuses existing indexed queries; no new JOINs on large tables |
| Hold status conflicts with approval flow | Medium | Hold is a virtual status in `incentive_adjustments`; DRAFT→APPROVED pipeline in `ins_incentive_results` is unaffected |

### Manual Post-Change Verification Checklist

- [ ] Run `006_additive_tables.sql` migration
- [ ] Verify `GET /api/health` returns 200
- [ ] Verify `GET /api/dashboard/summary` returns existing data
- [ ] Verify `GET /api/incentive-results` returns existing results
- [ ] Verify `POST /api/incentive-results/bulk-approve` works
- [ ] Verify `POST /api/integration/export/sap-fico` works
- [ ] Verify `GET /api/review-adjustments` returns 200
- [ ] Verify `GET /api/exception-log` returns 200
- [ ] Verify `GET /api/dashboard/executive-summary` returns kpiCards
- [ ] Run E2E test suite: `node src/tests/e2e/fullFlowTest.js`
- [ ] Run regression test: `node src/tests/regression/calculationRegressionTest.js`
