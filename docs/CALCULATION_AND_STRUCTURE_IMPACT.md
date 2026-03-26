# Calculation and Structure Impact Analysis

> Per-module impact assessment for the Insurance Incentive Management System prototype-inspired redesign.

---

## Governing Principles

> These principles apply to **every** module listed below.

- **Calculation formulas remain unchanged.** The files `calculateIncentive.js`, `insuranceCalcEngine.js`, and `compute_agent_kpi.sql` are frozen and must not be edited.
- **Existing incentive result math remains unchanged.** Values stored in `incentive_results.total_incentive`, `ins_incentive_results.total_incentive`, and all sub-fields (NB, renewal, persistency, clawback, overrides) are never recomputed retroactively by the redesign.
- **Existing approval workflow remains unchanged unless wrapped.** The DRAFT → APPROVED → INITIATED → PAID pipeline in `incentiveResults.js` is preserved. New review/adjustment capabilities are additive wrappers around the existing status transitions.
- **Review adjustments are additive, not destructive.** Manual adjustments are recorded in a new `review_adjustments` table. They never overwrite the original calculated amounts in `incentive_results` or `ins_incentive_results`.
- **Prototype-inspired redesign is primarily a UX/workflow enhancement.** The redesign reorganizes navigation, consolidates screens, and introduces new read-only views. Backend changes are limited to additive API endpoints and additive database tables.

---

## Module 1 — Dashboard

| Dimension | Impact |
|-----------|--------|
| **UI impact** | Full page redesign. New layout with expanded KPI stat cards, trend sparklines, quick-action buttons, and optional leaderboard widget. Replaces current `Dashboard.jsx`. |
| **API impact** | None. Existing `GET /api/v1/dashboard/summary` provides all required data. May add optional query params (e.g., `?period=`) but no new endpoints. |
| **DB impact** | None. Read-only queries against existing tables. |
| **Calculation engine impact** | None. Dashboard reads pre-calculated results only. |
| **Approval flow impact** | None. May display stage-summary counts (DRAFT/APPROVED/INITIATED/PAID) from existing endpoint. |
| **Integration impact** | None. |
| **Regression risk** | Low. UI-only change. Risk limited to chart library updates or Redux selector changes. |
| **Mitigation** | Snapshot existing dashboard API responses as regression fixtures. |

---

## Module 2 — KPI Config

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page combining current `DerivedVariables.jsx` functionality with a new KPI definitions CRUD interface. Replaces `/data/variables` route. |
| **API impact** | Additive. New composite endpoint `GET /api/v1/kpi-config` that joins `kpi_definitions` + `kpi_milestones` + `derived_variables` for a unified view. Write operations reuse existing `POST/PUT /api/v1/kpis` and `POST/PUT /api/v1/derived-variables`. |
| **DB impact** | None. Reads/writes existing `kpi_definitions`, `kpi_milestones`, `derived_variables` tables. No schema changes. |
| **Calculation engine impact** | **None.** KPI definitions feed into the calculation engine at runtime. Editing a KPI definition affects *future* calculation runs only. Historical `incentive_results` rows are immutable. |
| **Approval flow impact** | None. |
| **Integration impact** | None. |
| **Regression risk** | Medium. If KPI definitions are edited carelessly, future calculations produce different results. This is expected business behavior, not a regression. |
| **Mitigation** | Add `effective_from`/`effective_to` dating on KPI definitions to prevent accidental retroactive changes. Validate on the UI that date ranges do not overlap with closed periods. |

---

## Module 3 — Scheme Management

| Dimension | Impact |
|-----------|--------|
| **UI impact** | Consolidates `AdminPlanListing.jsx` and `CreatePlan/` wizard into a single module. Redesigned listing with filters, status badges, and inline actions. Wizard steps remain conceptually the same. |
| **API impact** | None. Existing CRUD endpoints for `programs`, `kpis`, `payouts`, `payout_slabs`, `incentive_rates`, `user_groups`, `group_members` are sufficient. |
| **DB impact** | None. All scheme data lives in existing tables. |
| **Calculation engine impact** | **None.** Scheme configuration is input to the engine. Engine reads these tables at calc time. No engine code changes. |
| **Approval flow impact** | None. Program status (DRAFT/ACTIVE/CLOSED) management is unchanged. |
| **Integration impact** | None. |
| **Regression risk** | Low. UI reshuffling only. Risk: wizard step ordering or validation logic drift. |
| **Mitigation** | Preserve existing wizard step components (`Step1_PlanDetails`, `Step3_UserGroups`, `Step4_KPIRules`, `Step5_PayoutRules`). Wrap in new shell; do not rewrite form logic. |

---

## Module 4 — Review & Adjustments

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page replacing `IncentiveBreakdown.jsx`. Adds tabular review interface with per-agent drill-down, adjustment entry form, and audit trail panel. |
| **API impact** | **Additive.** New endpoints: `POST /api/v1/review-adjustments` (create), `GET /api/v1/review-adjustments` (list), `GET /api/v1/review-adjustments/audit-trail` (audit). Existing `GET /api/v1/incentive-results` and approval endpoints are unchanged. |
| **DB impact** | **Additive.** Two new tables: `review_adjustments` (adjustment records) and `review_adjustment_audit` (immutable audit log). No changes to existing `incentive_results` or `ins_incentive_results`. |
| **Calculation engine impact** | **None.** Adjustments are stored separately. The engine never reads from `review_adjustments`. The adjusted total for payout is computed at read time: `display_total = incentive_results.total_incentive + SUM(review_adjustments.amount_delta)`. |
| **Approval flow impact** | Additive. A new "adjustment approval" sub-flow may be added (PENDING_REVIEW → APPROVED_ADJUSTMENT → APPLIED). This does NOT replace the existing DRAFT → APPROVED → INITIATED → PAID pipeline. |
| **Integration impact** | Minimal. SAP/Oracle export may optionally include adjustment amounts as a separate line item. Export CSV format is not changed; an additive column may be appended. |
| **Regression risk** | **High.** Misimplementation could corrupt incentive totals or bypass approval controls. |
| **Mitigation** | (1) Adjustments stored in separate table with FK to `incentive_result_id`. (2) Original calculated amount is NEVER updated. (3) Adjustment approval is a separate workflow. (4) Audit table is append-only (no UPDATE/DELETE). (5) Integration exports clearly separate original vs. adjusted amounts. |

---

## Module 5 — Exception Log

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page. Aggregated view of data quality issues, failed file records, staging validation errors, and calculation anomalies. |
| **API impact** | **Additive.** New read-only endpoint: `GET /api/v1/exceptions` that aggregates from `file_processing_log` (status=FAILED), `stg_policy_transactions` (stg_status=INVALID), `stg_agent_master` (stg_status=INVALID), and `integration_audit_log` (status=FAILED). |
| **DB impact** | None. Reads existing tables only. No new tables required. |
| **Calculation engine impact** | **None.** Read-only view of pre-existing error data. |
| **Approval flow impact** | None. |
| **Integration impact** | None. Reads existing integration audit/file logs. |
| **Regression risk** | Low. Read-only aggregation. Risk: slow queries on large `stg_*` tables. |
| **Mitigation** | Add database indexes on `stg_status` columns if not already present. Use pagination and date-range filters on the API. |

---

## Module 6 — Org & Domain Mapping

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page. Unified interface for viewing/editing agent hierarchy, region/branch assignments, and channel configuration. Replaces portions of `UploadCenter.jsx` (agent/product uploads) and `UploadAgents.jsx`. |
| **API impact** | **Additive.** New wrapper endpoints: `GET /api/v1/org-mapping/agents` (paginated agent list with hierarchy), `PUT /api/v1/org-mapping/agents/:id` (update agent details), `GET /api/v1/org-mapping/regions`, `GET /api/v1/org-mapping/channels`. These wrap existing table queries. |
| **DB impact** | None. Reads/writes existing `ins_agents`, `ins_regions`, `channels` tables. |
| **Calculation engine impact** | **None.** Agent hierarchy data (`hierarchy_path`, `parent_agent_id`) is read by the engine at calc time. Editing hierarchy affects future MLM override calculations only. |
| **Approval flow impact** | None. |
| **Integration impact** | None. Agent master data continues to flow in from Penta API and Life Asia SFTP. Manual edits via Org Mapping are additive corrections. |
| **Regression risk** | Medium. Incorrect hierarchy edits could affect MLM override calculations. |
| **Mitigation** | (1) Add `hierarchy_updated_at` timestamp tracking. (2) Validate hierarchy_path consistency on save. (3) Log all manual edits to `integration_audit_log` with source=MANUAL. |

---

## Module 7 — Integration Monitor / System Status

| Dimension | Impact |
|-----------|--------|
| **UI impact** | Redesign of existing `IntegrationDashboard.jsx`. Enhanced layout with tabbed sections: Status Overview, File Log, Audit Log, Failed Records, Manual Triggers. |
| **API impact** | None. Existing endpoints: `GET /api/v1/integration/status`, `/file-log`, `/audit-log`, `/failed-records`, `POST /trigger/*`. |
| **DB impact** | None. Reads existing `integration_audit_log`, `file_processing_log`, `system_config`. |
| **Calculation engine impact** | **None.** |
| **Approval flow impact** | None. |
| **Integration impact** | None. Monitoring is read-only. Manual triggers call existing job logic. |
| **Regression risk** | Low. UI-only redesign of existing functionality. |
| **Mitigation** | Preserve all existing trigger endpoint URLs. Test manual SFTP poll and hierarchy sync triggers post-redesign. |

---

## Module 8 — Notifications

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page. Notification center with list view, filters by type (approval, exception, integration), and mark-as-read. Optional bell icon in top bar. |
| **API impact** | **Additive.** New endpoints: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/preferences`. |
| **DB impact** | **Additive.** Two new tables: `notifications` (id, type, recipient_user_id, title, message, is_read, created_at) and `notification_preferences` (user_id, channel, enabled). |
| **Calculation engine impact** | **None.** Notifications are triggered as side effects of existing workflow events (approval, export, failed integration). They do not affect calculation logic. |
| **Approval flow impact** | Additive. Approval events emit notifications. The approval logic itself is unchanged. Notification dispatch is a post-commit hook, not inline. |
| **Integration impact** | Additive. Integration failures may trigger notification records. Integration payload contracts are unchanged. |
| **Regression risk** | Medium. If notification triggers are added inline to approval/calc hot paths, performance could degrade. |
| **Mitigation** | (1) Use async event emitter pattern (not synchronous inline calls). (2) Notifications are fire-and-forget; failures do not roll back business transactions. (3) Feature-flag the entire notification module. |

---

## Module 9 — Payout Disbursement

| Dimension | Impact |
|-----------|--------|
| **UI impact** | Redesign of existing `PayoutDisbursement.jsx`. Enhanced pipeline view (DRAFT → APPROVED → INITIATED → PAID) with batch actions, export buttons, and outbound file log. |
| **API impact** | None. Existing endpoints: `GET /api/v1/incentive-results/stage-summary`, `POST /approve-batch`, `POST /integration/export/sap-fico`, `POST /integration/export/oracle-financials`. |
| **DB impact** | None. Reads `incentive_results`, `ins_incentive_results`, `outbound_file_log`. |
| **Calculation engine impact** | **None.** Payout module only transitions status and triggers exports. Amounts are read-only at this stage. |
| **Approval flow impact** | None. Preserves existing 4-stage pipeline. UI redesign does not alter status transition logic. |
| **Integration impact** | None. SAP FICO and Oracle AP export CSV formats are unchanged. |
| **Regression risk** | Low. UI-only redesign. Risk: batch approval button might call wrong endpoint. |
| **Mitigation** | Integration test: verify batch-approve + export flow produces identical CSV output before and after redesign. |

---

## Module 10 — Settings

| Dimension | Impact |
|-----------|--------|
| **UI impact** | New page. Admin interface for `system_config` entries, PII masking rules, feature flags, and user management. |
| **API impact** | **Additive.** New endpoints: `GET /api/v1/settings` (read all config), `PUT /api/v1/settings/:key` (update whitelisted keys), `GET /api/v1/settings/masking` (read masking config). |
| **DB impact** | None. Reads/writes existing `system_config` table. Additive rows only (e.g., new feature flag keys). No schema changes. |
| **Calculation engine impact** | **None.** `system_config` is not read by the calculation engine. |
| **Approval flow impact** | None. |
| **Integration impact** | Indirect. Changing `POLICY_MASK_ENABLED` affects response masking. Changing SFTP config keys could affect polling. These are existing operational controls, not new risks. |
| **Regression risk** | **High** if dangerous keys are exposed for editing (e.g., `SFTP_PASSWORD`, `JWT_SECRET`). |
| **Mitigation** | (1) Whitelist editable keys (only safe operational keys). (2) Sensitive keys are read-only in UI. (3) All config changes logged with who/when/old-value/new-value. (4) Require admin role for Settings access. |

---

## Impact Summary Matrix

| Module | UI | API | DB | Calc Engine | Approval | Integration | Risk |
|--------|-----|-----|----|-------------|----------|-------------|------|
| Dashboard | ♻️ Redesign | ✅ No change | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟢 Low |
| KPI Config | 🆕 New | ➕ Additive | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟡 Medium |
| Scheme Management | ♻️ Redesign | ✅ No change | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟢 Low |
| Review & Adjustments | 🆕 New | ➕ Additive | ➕ Additive | ✅ No change | ➕ Additive | ➕ Optional | 🔴 High |
| Exception Log | 🆕 New | ➕ Additive | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟢 Low |
| Org & Domain Mapping | 🆕 New | ➕ Additive | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟡 Medium |
| Integration Monitor | ♻️ Redesign | ✅ No change | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟢 Low |
| Notifications | 🆕 New | ➕ Additive | ➕ Additive | ✅ No change | ➕ Additive | ✅ No change | 🟡 Medium |
| Payout Disbursement | ♻️ Redesign | ✅ No change | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟢 Low |
| Settings | 🆕 New | ➕ Additive | ✅ No change | ✅ No change | ✅ No change | ✅ No change | 🟡 Medium |

**Legend:** ✅ No change | ♻️ Redesign existing | ➕ Additive | 🆕 New
