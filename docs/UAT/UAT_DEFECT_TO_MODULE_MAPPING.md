# UAT Defect-to-Module Mapping — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## Purpose

When a UAT defect is logged, use this matrix to quickly identify all impacted code, data, tests, and stakeholders for the affected module.

---

## Module Mapping Matrix

### 1. Login / Authentication

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/auth/systemToken.js` |
| **Frontend Pages** | Login page (within App.jsx auth flow) |
| **DB Tables** | `users`, `user_sessions`, `api_clients` |
| **Tests to Rerun** | T01–T05 (login/session E2E tests) |
| **Business Owner** | Technology Lead |
| **Cross-Impact** | All modules depend on auth. A login defect blocks everything. |

---

### 2. Dashboard

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/dashboard.js`, `server/src/routes/executiveSummary.js` |
| **Frontend Pages** | `client/src/pages/Dashboard.jsx` |
| **DB Tables** | `ins_incentive_results` (read), `incentive_programs` (read), `ins_agents` (read) |
| **Tests to Rerun** | T06–T10 (dashboard E2E tests) |
| **Business Owner** | Operations Lead |
| **Cross-Impact** | Read-only aggregation. Defects here do not affect calculations but may indicate data issues. |

---

### 3. KPI Config

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/kpiConfig.js` |
| **Frontend Pages** | `client/src/pages/KPIConfig/index.jsx`, `client/src/components/kpi-config/KPIRegistryTable.jsx`, `client/src/components/kpi-config/FormulaArchitect.jsx`, `client/src/components/kpi-config/KPIDetailPanel.jsx` |
| **DB Tables** | `kpi_definitions`, `kpi_milestones`, `payout_rules`, `payout_slabs`, `payout_qualifying_rules` |
| **Tests to Rerun** | T11–T14 (KPI config E2E tests) |
| **Business Owner** | Business Owner |
| **Cross-Impact** | KPI definitions feed into scheme management and calculation. Changes here could affect future calculations (but not current seeded data). |

---

### 4. Scheme Management

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/programs.js` (includes `/:id/preview`) |
| **Frontend Pages** | `client/src/pages/SchemeManagement/index.jsx` (4-step wizard) |
| **DB Tables** | `incentive_programs`, `kpi_definitions`, `payout_rules`, `payout_slabs` |
| **Tests to Rerun** | T15–T19 (scheme management E2E tests) |
| **Business Owner** | Business Owner |
| **Cross-Impact** | Programs must exist before calculation can run. Defects in create/publish affect downstream flows. |

---

### 5. Calculation Engine

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/calculate.js` |
| **Engine Files** | `server/src/engine/insuranceCalcEngine.js` (177 lines), `server/src/engine/calculateIncentive.js` |
| **Frontend Pages** | Triggered from Scheme Management preview or admin actions |
| **DB Tables Read** | `ins_agent_kpi_summary`, `ins_incentive_rates`, `ins_products`, `ins_persistency_gates`, `ins_agents`, `ins_mlm_override_rates` |
| **DB Tables Written** | `ins_incentive_results` (UPSERT only) |
| **Tests to Rerun** | R01–R36 (full regression) + T01–T46 (full E2E) |
| **Business Owner** | Business Owner + Finance Lead |
| **Cross-Impact** | 🔴 **HIGHEST RISK.** Every downstream module depends on correct calculation. Any change here requires full regression. |

---

### 6. Review & Adjustments

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/reviewAdjustments.js` (7 endpoints) |
| **Frontend Pages** | `client/src/pages/ReviewAdjustments.jsx` (detail + adjustment drawers) |
| **DB Tables** | `ins_incentive_results` (read + status update), `incentive_adjustments` (read/write), `incentive_review_actions` (audit write) |
| **Tests to Rerun** | T20–T30 (review/approval E2E tests) + R20–R30 (adjustment isolation regression) |
| **Business Owner** | Operations Lead |
| **Cross-Impact** | Status changes here flow into export eligibility. Manual adjustments are stored separately and must NOT modify base values. |

---

### 7. Approval Workflow

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/reviewAdjustments.js` (approve/bulk-approve endpoints) |
| **Frontend Pages** | `client/src/pages/ReviewAdjustments.jsx` (approve buttons) |
| **DB Tables** | `ins_incentive_results` (status: DRAFT → APPROVED), `incentive_review_actions` (audit) |
| **Tests to Rerun** | T20–T30 (approval E2E) + export tests T35–T40 |
| **Business Owner** | Operations Lead + Finance Lead |
| **Cross-Impact** | 🔴 **HIGH RISK.** Approval controls what gets exported and paid. Gate-failed agents must remain blocked. |

---

### 8. Exception Log

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/exceptionLog.js` (3 endpoints) |
| **Frontend Pages** | `client/src/pages/ExceptionLog.jsx` (paginated) |
| **DB Tables** | `operational_exceptions` (read/write) |
| **Tests to Rerun** | T31–T33 (exception log E2E tests) |
| **Business Owner** | Operations Lead |
| **Cross-Impact** | Additive table only — isolated from calculation engine. No impact on amounts or approvals. |

---

### 9. Org & Domain Mapping

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/orgDomainMapping.js` (1 endpoint) |
| **Frontend Pages** | `client/src/pages/OrgDomainMapping.jsx` (4 grouped views) |
| **DB Tables** | `ins_agents` (read), `ins_regions` (read), `channels` (read) |
| **Tests to Rerun** | T34 (org mapping E2E test) |
| **Business Owner** | Operations Lead |
| **Cross-Impact** | Read-only views. No write operations. Low risk. |

---

### 10. System Status

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/systemStatus.js` (1 endpoint) |
| **Frontend Pages** | `client/src/pages/SystemStatus.jsx` |
| **DB Tables** | Database connection check (no specific table) |
| **Tests to Rerun** | T35 (system status E2E test) |
| **Business Owner** | Technology Lead |
| **Cross-Impact** | Diagnostic only. No data modification. |

---

### 11. Notifications

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/notifications.js` (3 endpoints) |
| **Frontend Pages** | `client/src/pages/Notifications.jsx` |
| **DB Tables** | `notification_events` (read/write) |
| **Tests to Rerun** | T36–T38 (notification E2E tests) |
| **Business Owner** | Operations Lead |
| **Cross-Impact** | Additive table only — isolated from calculation engine. No impact on amounts or approvals. |

---

### 12. Payout Disbursement

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/payouts.js` |
| **Frontend Pages** | `client/src/pages/PayoutDisbursement.jsx` |
| **DB Tables** | `ins_incentive_results` (status: INITIATED → PAID), `payout_disbursement_log` (write) |
| **Tests to Rerun** | T40–T43 (payout E2E tests) |
| **Business Owner** | Finance Lead |
| **Cross-Impact** | 🔴 **HIGH RISK.** Final step in the pipeline. Must only pay INITIATED records. Status must be one-way. |

---

### 13. Oracle / SAP Export

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/integration/export.js` |
| **Frontend Pages** | Export triggered from Review & Adjustments or Payout pages |
| **DB Tables** | `ins_incentive_results` (read approved/initiated), `outbound_file_log` (write), `ins_agents` (read) |
| **Tests to Rerun** | T35–T40 (export E2E tests) + verify record count = 19 |
| **Business Owner** | Finance Lead |
| **Cross-Impact** | 🔴 **HIGH RISK.** Export is the financial output. Record counts and amounts must match approved values exactly. Gate-failed AGT-JR-004 must be excluded. |

---

### 14. Integrations

| Aspect | Details |
|--------|---------|
| **Route Files** | `server/src/routes/integration/lifeasia.js`, `server/src/routes/integration/penta.js`, `server/src/routes/integration/status.js` |
| **Frontend Pages** | `client/src/pages/Integration/` (IntegrationDashboard) |
| **DB Tables** | `integration_audit_log` (write), `stg_agent_master` (read/write), `stg_policy_transactions` (read/write) |
| **Tests to Rerun** | T44–T46 (integration E2E tests) |
| **Business Owner** | Technology Lead |
| **Cross-Impact** | Staging tables feed into KPI summary. Errors here could affect future calculations but not current seeded results. |

---

## Quick-Reference: Risk by Module

| Risk Level | Modules |
|------------|---------|
| 🔴 Critical | Calculation Engine, Approval Workflow, Oracle/SAP Export, Payout Disbursement |
| 🟡 Medium | Review & Adjustments, Scheme Management, KPI Config, Login/Auth, Integrations |
| 🟢 Low | Dashboard, Exception Log, Notifications, Org Mapping, System Status |

---

## Quick-Reference: Test Suites

| Test Suite | File | Count | Command |
|-----------|------|-------|---------|
| E2E Tests | `server/src/tests/e2e/fullFlowTest.js` | 46 (T01–T46) | `cd server && node src/tests/e2e/fullFlowTest.js` |
| Regression Tests | `server/src/tests/regression/calculationRegressionTest.js` | 36 (R01–R36) | `cd server && node src/tests/regression/calculationRegressionTest.js` |

Both require a running server at `http://localhost:5000/api` (or set `BASE_URL` environment variable).

---

## Quick-Reference: Additive Tables (Isolated from Calculation)

These 4 tables were added by migration `006_additive_tables.sql` and have **zero references** in the calculation engine:

| Table | Used By | Safe to Change? |
|-------|---------|----------------|
| `incentive_adjustments` | Review & Adjustments | ✅ Yes — separate from calculated values |
| `incentive_review_actions` | Audit trail (all modules) | ✅ Yes — write-only audit log |
| `operational_exceptions` | Exception Log | ✅ Yes — isolated |
| `notification_events` | Notifications | ✅ Yes — isolated |

**Rule:** Defects in additive-table modules do NOT require calculation regression testing.

---

## Notification Matrix: Who to Notify

| Module | Notify on Defect | Notify on Fix |
|--------|-----------------|---------------|
| Calculation Engine | QA Lead + Business Owner + Finance Lead | All stakeholders |
| Approval Workflow | QA Lead + Operations Lead + Finance Lead | QA Lead + Operations Lead |
| Export | QA Lead + Finance Lead | QA Lead + Finance Lead |
| Payout | QA Lead + Finance Lead | QA Lead + Finance Lead |
| Login / Auth | QA Lead + Technology Lead | QA Lead |
| All other modules | QA Lead | QA Lead |

---

**Prepared by:** ___________________________  **Date:** ____________
