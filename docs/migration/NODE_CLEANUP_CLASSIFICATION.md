# Node.js Cleanup Classification

> Classification of all Node.js backend files for post-cutover cleanup.
> Categories: KEEP, DISABLE NOW, DISABLE AFTER STABILIZATION, DELETE AFTER VERIFICATION

---

## Classification Rules

| Category | Meaning | Timeline |
|----------|---------|----------|
| **KEEP** | Still needed (frontend tooling, reference) | Indefinite |
| **DISABLE NOW** | No longer needed, safe to disable immediately | Day 0 |
| **DISABLE AFTER STABILIZATION** | Disable after 7-14 days of .NET stability | Day 7-14 |
| **DELETE AFTER VERIFICATION** | Delete after 30 days of confirmed .NET operation | Day 30+ |

---

## Route Files (`server/src/routes/`)

| Node File | Purpose | .NET Replacement | Action | Risk | Delete Now? |
|---|---|---|---|---|---|
| `programs.js` | Program CRUD + workflows | `ProgramsController` | DISABLE AFTER STABILIZATION | Low | No |
| `kpis.js` | KPI CRUD + milestones | `DataController` | DISABLE AFTER STABILIZATION | Low | No |
| `kpiConfig.js` | KPI registry/validate/summary | `KpiConfigController` | DISABLE AFTER STABILIZATION | Low | No |
| `payouts.js` | Payout rules + slabs CRUD | `PayoutsController` | DISABLE AFTER STABILIZATION | Low | No |
| `calculate.js` | Calculation engine routes | `CalculationController` | DISABLE AFTER STABILIZATION | Low | No |
| `incentiveResults.js` | Results + approve/pay pipeline | `IncentiveResultsController` | DISABLE AFTER STABILIZATION | Low | No |
| `reviewAdjustments.js` | Review workflow (7 actions) | `ReviewAdjustmentsController` | DISABLE AFTER STABILIZATION | Low | No |
| `exceptionLog.js` | Exception management | `ExceptionLogController` | DISABLE AFTER STABILIZATION | Low | No |
| `upload.js` | Centralized upload routes | `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `dashboard.js` | Dashboard summary | `DashboardController` | DISABLE AFTER STABILIZATION | Low | No |
| `executiveSummary.js` | Executive KPI cards | `DashboardController` | DISABLE AFTER STABILIZATION | Low | No |
| `systemStatus.js` | System health | `SystemStatusController` | DISABLE AFTER STABILIZATION | Low | No |
| `notifications.js` | Notification management | `NotificationsController` | DISABLE AFTER STABILIZATION | Low | No |
| `orgDomainMapping.js` | Org mapping | `OrgDomainMappingController` | DISABLE AFTER STABILIZATION | Low | No |
| `agents.js` | Agent data + CSV upload | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `products.js` | Product data + CSV upsert | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `incentiveRates.js` | Rate data + CSV upload | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `performance.js` | Performance data + upload | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `policyTransactions.js` | Transaction data + upload | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `persistencyData.js` | Persistency CSV upload | `DataController` + `UploadController` | DISABLE AFTER STABILIZATION | Low | No |
| `derivedVariables.js` | Derived variable CRUD | `DataController` | DISABLE AFTER STABILIZATION | Low | No |
| `groups.js` | User group management | `DataController` | DISABLE AFTER STABILIZATION | Low | No |
| `leaderboard.js` | Agent ranking | `DataController` | DISABLE AFTER STABILIZATION | Low | No |
| `auth/systemToken.js` | System JWT issuance | `AuthController` | DISABLE AFTER STABILIZATION | Low | No |
| `integration/penta.js` | Penta API integration | `IntegrationController` | DISABLE AFTER STABILIZATION | Low | No |
| `integration/lifeasia.js` | LifeAsia integration | `IntegrationController` | DISABLE AFTER STABILIZATION | Low | No |
| `integration/export.js` | Oracle/SAP export | `ExportController` | DISABLE AFTER STABILIZATION | Low | No |
| `integration/status.js` | Integration status/triggers | `IntegrationController` | DISABLE AFTER STABILIZATION | Low | No |

---

## Middleware (`server/src/middleware/`)

| Node File | Purpose | .NET Replacement | Action |
|---|---|---|---|
| `userAuth.js` | User auth (placeholder) | JWT Bearer + [Authorize] | DISABLE AFTER STABILIZATION |
| `systemAuth.js` | System-to-system JWT | AuthController system-token | DISABLE AFTER STABILIZATION |
| `maskResponse.js` | Policy number masking | .NET middleware | DISABLE AFTER STABILIZATION |
| `errorHandler.js` | Error response formatting | ApiExceptionMiddleware | DISABLE AFTER STABILIZATION |

---

## Engine (`server/src/engine/`)

| Node File | Purpose | .NET Replacement | Action |
|---|---|---|---|
| `insuranceCalcEngine.js` | Calculation engine | `CalculationService` | DISABLE AFTER STABILIZATION |

---

## Database (`server/src/db/`)

| Node File | Purpose | .NET Replacement | Action |
|---|---|---|---|
| `pool.js` | DB connection pool | `DbConnectionFactory` | DISABLE AFTER STABILIZATION |
| `migrations/` | Schema migrations | (same DB, no .NET migration needed) | KEEP (for reference) |

---

## Jobs (`server/src/jobs/`)

| Node File | Purpose | .NET Replacement | Action |
|---|---|---|---|
| `sftpPoller.js` | SFTP file polling | Deferred (trigger endpoint) | DISABLE AFTER STABILIZATION |
| `hierarchySync.js` | Hierarchy API sync | Deferred (trigger endpoint) | DISABLE AFTER STABILIZATION |

---

## Entry Point

| Node File | Purpose | Action |
|---|---|---|
| `server/index.js` | Express app + route registration | DISABLE AFTER STABILIZATION |
| `server/package.json` | Dependencies | KEEP (for reference) |

---

## Summary

| Category | File Count |
|----------|-----------|
| DISABLE AFTER STABILIZATION | 35+ |
| KEEP (reference) | 2 (package.json, migrations) |
| DELETE AFTER VERIFICATION | 35+ (after 30 days) |
