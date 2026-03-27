# Final Route Ownership Matrix

> Comprehensive view of all API endpoint groups showing ownership transfer from Node.js to .NET 10.
> Status as of March 2026 — all business routes migrated to .NET.

---

## Route Ownership Summary

| # | Endpoint Group | Endpoint Count | Wave | Parity Status | Auth Status (.NET) | Owner | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Programs (CRUD/status/summary/preview) | 8 | Wave 1+2 | ✅ Full | `[Authorize]` + ConfigManagers for writes | **.NET** | Status transition rules preserved |
| 2 | KPI Config (registry/validate/summary) | 3 | Wave 2 | ✅ Full | `[Authorize(Roles = ConfigManagers)]` | **.NET** | Validation parity confirmed |
| 3 | Dashboard (executive-summary + summary) | 2 | Wave 1+4 | ✅ Full | `[Authorize]` | **.NET** | 7-section dashboard preserved |
| 4 | System Status (summary) | 1 | Wave 1 | ✅ Full | `[Authorize(Roles = AdminOrOps)]` | **.NET** | Health check data |
| 5 | Notifications (list/read/mark-all-read) | 3 | Wave 1 | ✅ Full | `[Authorize]` | **.NET** | — |
| 6 | Org Domain Mapping | 1 | Wave 1 | ✅ Full | `[Authorize(Roles = AdminOrOps)]` | **.NET** | — |
| 7 | Review Adjustments (7 workflow actions) | 7 | Wave 3 | ✅ Full | `[Authorize(Roles = WorkflowActors)]` | **.NET** | Additive-only design |
| 8 | Exception Log (list/detail/resolve) | 3 | Wave 3 | ✅ Full | `[Authorize(Roles = AdminOrOps)]` | **.NET** | — |
| 9 | Uploads (6 CSV upload endpoints) | 6 | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | 20MB limit, validation parity |
| 10 | Calculation (bulk/single/results) | 3 | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | Engine logic preserved |
| 11 | Incentive Results (7 status endpoints) | 7 | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | DRAFT→APPROVED→INITIATED→PAID |
| 12 | Export (Oracle AP/SAP FICO/history) | 3 | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | CSV format parity |
| 13 | Payouts (rules + slabs CRUD) | 9 | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | — |
| 14 | Integration (Penta/LifeAsia/status/triggers) | 11 | Wave 4 | ✅ Full | `[Authorize]` / systemAuth | **.NET** | SFTP trigger-only |
| 15 | Data (agents/products/groups/etc.) | 15+ | Wave 4 | ✅ Full | `[Authorize]` | **.NET** | — |
| 16 | Auth (login/me/system-token) | 3 | Auth | ✅ Enhanced | Public (login) + `[Authorize]` (me) | **.NET** | .NET AHEAD of Node |
| 17 | Health Check | 1 | — | ✅ Full | Public | **Both** | `/api/health` |
| 18 | Background Jobs (SFTP/hierarchy) | 0 HTTP | — | ⚠️ Deferred | N/A | **Deferred** | Trigger endpoints available |

---

## Totals

| Metric | Count |
|--------|-------|
| **Total Endpoint Groups** | 18 |
| **Total HTTP Endpoints** | 75+ |
| **.NET Owned** | 75+ (100% of business endpoints) |
| **Node Owned** | 0 business endpoints |
| **Full Parity** | 16 groups |
| **Enhanced (beyond Node)** | 1 group (Auth) |
| **Deferred** | 1 group (Background Jobs) |
| **Blockers** | 0 |

---

## Node.js Route File → .NET Controller Mapping

| Node Route File | .NET Controller | Status |
|---|---|---|
| `routes/programs.js` | `ProgramsController` | ✅ Replaced |
| `routes/kpiConfig.js` | `KpiConfigController` | ✅ Replaced |
| `routes/dashboard.js` | `DashboardController` | ✅ Replaced |
| `routes/executiveSummary.js` | `DashboardController` | ✅ Replaced |
| `routes/systemStatus.js` | `SystemStatusController` | ✅ Replaced |
| `routes/notifications.js` | `NotificationsController` | ✅ Replaced |
| `routes/orgDomainMapping.js` | `OrgDomainMappingController` | ✅ Replaced |
| `routes/reviewAdjustments.js` | `ReviewAdjustmentsController` | ✅ Replaced |
| `routes/exceptionLog.js` | `ExceptionLogController` | ✅ Replaced |
| `routes/upload.js` | `UploadController` (Wave 4) | ✅ Replaced |
| `routes/calculate.js` | `CalculationController` (Wave 4) | ✅ Replaced |
| `routes/incentiveResults.js` | `IncentiveResultsController` (Wave 4) | ✅ Replaced |
| `routes/payouts.js` | `PayoutsController` (Wave 4) | ✅ Replaced |
| `routes/kpis.js` | `DataController` (Wave 4) | ✅ Replaced |
| `routes/groups.js` | `DataController` (Wave 4) | ✅ Replaced |
| `routes/agents.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/products.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/incentiveRates.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/performance.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/policyTransactions.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/persistencyData.js` | `DataController` + `UploadController` (Wave 4) | ✅ Replaced |
| `routes/derivedVariables.js` | `DataController` (Wave 4) | ✅ Replaced |
| `routes/leaderboard.js` | `DataController` (Wave 4) | ✅ Replaced |
| `routes/auth/systemToken.js` | `AuthController` | ✅ Replaced |
| `routes/integration/penta.js` | `IntegrationController` (Wave 4) | ✅ Replaced |
| `routes/integration/lifeasia.js` | `IntegrationController` (Wave 4) | ✅ Replaced |
| `routes/integration/export.js` | `ExportController` (Wave 4) | ✅ Replaced |
| `routes/integration/status.js` | `IntegrationController` (Wave 4) | ✅ Replaced |
