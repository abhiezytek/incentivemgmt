# UI Redesign Execution Plan

> Insurance Incentive Management System — Prototype-Inspired Redesign Strategy

---

## 1. Current Application Structure

### Client (React 18 + Vite + Redux Toolkit + Tailwind CSS v4)

| Route | Page Component | Sidebar Group |
|-------|---------------|---------------|
| `/` | `Dashboard` | PROGRAMS |
| `/admin/plans` | `AdminPlanListing` | PROGRAMS |
| `/plans/create` | `CreatePlan` (5-step wizard) | — |
| `/data/upload` | `UploadCenter` | DATA |
| `/data/variables` | `DerivedVariables` | DATA |
| `/incentive/breakdown` | `IncentiveBreakdown` | INCENTIVES |
| `/incentive/leaderboard` | `Leaderboard` | INCENTIVES |
| `/payout/disbursement` | `PayoutDisbursement` | PAYOUTS |
| `/team/performance` | `TeamPerformance` | ADMIN |
| `/integration/dashboard` | `IntegrationDashboard` | ADMIN |

**Page count:** 20 files across 4 sub-folders (root, CreatePlan, DataManagement, Integration)  
**Component count:** 9 files (AppShell + 8 reusable UI components in `ui/`)

### Server (Node.js + Express + PostgreSQL — raw SQL)

| Category | Count |
|----------|-------|
| Route files | 21 (including `integration/*` and `auth/*`) |
| Middleware | 3 (`userAuth`, `systemAuth`, `maskResponse`) |
| Calculation engines | 2 (`calculateIncentive.js`, `insuranceCalcEngine.js`) |
| Background jobs | 2 (`sftpPoller`, `hierarchySync`) |
| DB migrations | 7 |
| DB tables | ~42 |

### Sidebar Navigation Groups (current)

```
PROGRAMS   → Dashboard, Plan Listing
DATA       → Upload Center, Derived Variables
INCENTIVES → Breakdown, Leaderboard
PAYOUTS    → Disbursement
ADMIN      → Integration Monitor
```

---

## 2. Target Prototype-Inspired Structure

### New Module Map

| # | Module | Description |
|---|--------|-------------|
| 1 | **Dashboard** | Executive KPI summary, trend charts, quick actions |
| 2 | **KPI Config** | KPI definitions, milestones, derived variables |
| 3 | **Scheme Management** | Program CRUD, plan builder wizard, rate tables, payout rules |
| 4 | **Review & Adjustments** | Incentive results review, manual adjustments, batch approval |
| 5 | **Exception Log** | Data quality exceptions, calculation anomalies, failed records |
| 6 | **Org & Domain Mapping** | Agent hierarchy, region/branch mapping, channel config |
| 7 | **Integration Monitor / System Status** | SFTP/API health, audit logs, file processing, manual triggers |
| 8 | **Notifications** | Alerts, reminders, workflow notifications |
| 9 | **Payout Disbursement** | Export pipeline, SAP/Oracle file generation, payment tracking |
| 10 | **Settings** | System config, user management, feature flags, masking rules |

### Proposed Sidebar Navigation

```
OVERVIEW       → Dashboard
CONFIGURATION  → KPI Config, Scheme Management, Org & Domain Mapping
OPERATIONS     → Review & Adjustments, Exception Log
PAYOUTS        → Payout Disbursement
MONITORING     → Integration Monitor, Notifications
ADMIN          → Settings
```

---

## 3. Old-to-New Screen Mapping

| Current Route | Current Page | New Module | Action |
|---------------|-------------|------------|--------|
| `/` | Dashboard | **Dashboard** | Redesign UI; expand KPI cards |
| `/admin/plans` | AdminPlanListing | **Scheme Management** | Rename & redesign listing |
| `/plans/create` | CreatePlan wizard | **Scheme Management** | Embed wizard inside new module |
| `/data/upload` | UploadCenter | **Org & Domain Mapping** (agents, products) + **Scheme Management** (rates) | Split uploads by domain |
| `/data/variables` | DerivedVariables | **KPI Config** | Move into KPI module |
| `/incentive/breakdown` | IncentiveBreakdown | **Review & Adjustments** | Redesign as review table |
| `/incentive/leaderboard` | Leaderboard | **Dashboard** (widget) or standalone | Merge into dashboard or keep |
| `/payout/disbursement` | PayoutDisbursement | **Payout Disbursement** | Redesign; add export controls |
| `/team/performance` | TeamPerformance | **Dashboard** (tab) or **Review & Adjustments** | Consolidate |
| `/integration/dashboard` | IntegrationDashboard | **Integration Monitor** | Redesign; add notifications link |
| *(new)* | — | **KPI Config** | New page for KPI CRUD |
| *(new)* | — | **Exception Log** | New page; read from existing tables |
| *(new)* | — | **Org & Domain Mapping** | New page; read existing agent/region tables |
| *(new)* | — | **Notifications** | New page; requires additive backend |
| *(new)* | — | **Settings** | New page; read/write `system_config` |

---

## 4. Modules That Are UI-Only Changes

These modules require **no backend changes** — they consume existing API endpoints.

| Module | Reason |
|--------|--------|
| **Dashboard** | Existing `GET /api/v1/dashboard/summary` provides all data; only layout/chart changes |
| **Scheme Management** | Existing CRUD endpoints for programs, KPIs, payout rules, rates are sufficient |
| **Payout Disbursement** | Existing `GET /api/v1/incentive-results/*`, export endpoints, and `outbound_file_log` cover all needs |
| **Integration Monitor** | Existing status, audit-log, file-log, trigger endpoints are sufficient |
| **Leaderboard** (if kept) | Existing `GET /api/v1/leaderboard` is sufficient |

---

## 5. Modules Requiring Additive APIs

| Module | New Endpoints Needed | Existing Logic Reused |
|--------|---------------------|-----------------------|
| **KPI Config** | `GET/POST/PUT /api/v1/kpi-config` (thin wrapper combining `kpi_definitions` + `kpi_milestones` + `derived_variables`) | Reads/writes existing tables |
| **Review & Adjustments** | `POST /api/v1/review-adjustments` (create adjustment record), `GET /api/v1/review-adjustments` (list), `GET /api/v1/review-adjustments/audit-trail` | Wraps existing `incentive_results` + new additive table |
| **Exception Log** | `GET /api/v1/exceptions` (aggregates failed records from `file_processing_log`, `stg_*` tables, calculation errors) | Read-only across existing tables |
| **Org & Domain Mapping** | `GET/PUT /api/v1/org-mapping/agents`, `GET/PUT /api/v1/org-mapping/regions`, `GET/PUT /api/v1/org-mapping/channels` | Thin wrappers around `ins_agents`, `ins_regions`, `channels` |
| **Notifications** | `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/preferences` | New — no existing notification system |
| **Settings** | `GET/PUT /api/v1/settings` (wraps `system_config`), `GET/PUT /api/v1/settings/masking`, `GET /api/v1/settings/feature-flags` | Reads/writes existing `system_config` table |

---

## 6. Modules Requiring Additive Tables

| Module | New Table(s) | Purpose | Existing Tables Affected |
|--------|-------------|---------|--------------------------|
| **Review & Adjustments** | `review_adjustments` | Store manual adjustment entries with reason, amount delta, adjustor, timestamp, linked `incentive_result_id` | None modified; joins to `incentive_results` / `ins_incentive_results` |
| **Review & Adjustments** | `review_adjustment_audit` | Immutable audit log of every adjustment action | None modified |
| **Notifications** | `notifications` | Store notification records (type, recipient, message, read_at, created_at) | None modified |
| **Notifications** | `notification_preferences` | Per-user notification channel preferences | None modified |
| **Exception Log** | *(no new table)* | Reads from existing `file_processing_log`, `stg_policy_transactions`, `stg_agent_master`, `integration_audit_log` | None modified |
| **Settings** | *(no new table)* | Uses existing `system_config` | None modified; additive rows only |

**Total new tables: 4** (all additive — zero modification to existing tables)

---

## 7. Modules That Must Not Affect Calculation Math

| Module | Guardrail |
|--------|-----------|
| **ALL modules** | `calculateIncentive.js` and `insuranceCalcEngine.js` must remain untouched |
| **Review & Adjustments** | Adjustments are stored in a **separate** `review_adjustments` table; they do NOT modify `incentive_results.total_incentive` or `ins_incentive_results.total_incentive` |
| **KPI Config** | KPI definition changes apply to future calculation runs only; historical results are immutable |
| **Scheme Management** | Program/rate/slab edits apply prospectively; no recalculation of closed periods unless explicitly triggered |
| **Dashboard** | Read-only; displays existing calculated data |
| **Payout Disbursement** | Status transitions only (APPROVED → INITIATED → PAID); amounts are never modified |
| **Exception Log** | Read-only aggregate view |

### Protected Files (DO NOT MODIFY)

```
server/src/engine/calculateIncentive.js   — Generic calculation engine
server/src/engine/insuranceCalcEngine.js   — Insurance-specific engine
server/src/db/functions/compute_agent_kpi.sql — KPI aggregation function
```

---

## 8. Regression Risks

| Risk | Severity | Trigger | Mitigation |
|------|----------|---------|------------|
| Sidebar/route restructuring breaks deep links | Medium | Route path changes | Keep old routes as redirects for 2 releases |
| Redux store shape changes break components | Medium | API response restructuring | Version API responses; keep `apiSlice.js` backward-compatible |
| New adjustment records misinterpreted as official results | High | Review & Adjustments module | Use separate table; add `is_adjustment` flag if joined |
| KPI Config edits retroactively affect historical results | High | Schema changes to `kpi_definitions` | Add `effective_from` / `effective_to` columns; never update in-place |
| New middleware or route ordering breaks existing API contracts | Medium | Express route registration changes | Add new routes after existing ones; keep `/api/v1/` prefix stable |
| Integration payload contracts accidentally modified | High | Refactoring export routes | Lock `integration/export.js` and `integration/penta.js` behind code review gates |
| Notification queries slow down main transaction path | Medium | Notification triggers in hot paths | Use async event emitter or background job; never inline in calc |
| Settings page exposes dangerous config edits | High | `system_config` write access | Whitelist editable keys; read-only for critical keys |

---

## 9. Phased Rollout Plan

### Phase 1 — Foundation (Week 1–2)
- [ ] Update `AppShell.jsx` sidebar to new navigation groups
- [ ] Create route scaffolding for all 10 modules
- [ ] Redesign **Dashboard** page (UI-only; existing API)
- [ ] Redesign **Payout Disbursement** page (UI-only; existing API)
- [ ] Redesign **Integration Monitor** page (UI-only; existing API)

### Phase 2 — Configuration Modules (Week 3–4)
- [ ] Build **KPI Config** page (merge `DerivedVariables` + new KPI CRUD)
- [ ] Build **Scheme Management** page (merge `AdminPlanListing` + `CreatePlan`)
- [ ] Build **Org & Domain Mapping** page (new UI; additive API wrappers)
- [ ] Add additive API endpoints for KPI Config and Org mapping

### Phase 3 — Operations & Review (Week 5–6)
- [ ] Build **Review & Adjustments** page
- [ ] Create `review_adjustments` + `review_adjustment_audit` tables (migration)
- [ ] Add additive API for review adjustments
- [ ] Build **Exception Log** page (read-only aggregation)
- [ ] Add `GET /api/v1/exceptions` endpoint

### Phase 4 — Notifications & Settings (Week 7–8)
- [ ] Create `notifications` + `notification_preferences` tables (migration)
- [ ] Build **Notifications** module (UI + API)
- [ ] Build **Settings** page (wraps `system_config`)
- [ ] Wire notification triggers into approval workflow (additive)

### Phase 5 — Polish & Cutover (Week 9–10)
- [ ] End-to-end regression testing
- [ ] Old route redirects for backward compatibility
- [ ] Remove deprecated page components (soft-delete; keep in repo)
- [ ] Update Swagger/OpenAPI spec for new endpoints
- [ ] Update Postman collection
- [ ] Documentation refresh

---

## 10. Backward Compatibility Approach

### API Compatibility

| Strategy | Detail |
|----------|--------|
| **Versioned routes** | All new endpoints registered under `/api/v1/`; existing endpoints unchanged |
| **No breaking changes** | Existing request/response schemas remain identical |
| **Additive fields only** | New optional fields may be added to responses; no field removal |
| **Dual registration** | Both `/api/v1/` and `/api/` prefixes continue to work (existing pattern in `server/index.js`) |

### UI Compatibility

| Strategy | Detail |
|----------|--------|
| **Old route redirects** | Old paths (e.g., `/admin/plans`) redirect to new paths (e.g., `/schemes`) for 2 release cycles |
| **Feature flags** | New modules can be hidden behind `system_config` feature flags during rollout |
| **Component reuse** | Existing `ui/` components remain available; new components are additive |
| **Design tokens** | Existing Tailwind theme tokens in `design-system.css` remain; new tokens are additive |

### Database Compatibility

| Strategy | Detail |
|----------|--------|
| **No DDL on existing tables** | Zero ALTER/DROP on production tables |
| **Additive migrations only** | New tables in new migration files (006+) |
| **Foreign keys to existing PKs** | New tables reference existing IDs but never modify referenced rows |
| **Rollback-safe** | Every new migration has a corresponding DROP IF EXISTS rollback |

### Integration Compatibility

| Strategy | Detail |
|----------|--------|
| **Payload contracts frozen** | SAP FICO, Oracle AP, Penta, Life Asia CSV/JSON formats unchanged |
| **Export routes locked** | `integration/export.js` is read-only during redesign |
| **System auth unchanged** | `systemAuth.js` middleware untouched |
| **Audit logging preserved** | `integration_audit_log` schema unchanged |
