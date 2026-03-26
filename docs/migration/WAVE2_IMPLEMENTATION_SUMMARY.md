# Wave 2 Implementation Summary

> Documents what was implemented in Wave 2 of the Node.js → .NET 10 backend migration.
> Wave 2 = Configuration/Setup endpoints (programs CRUD + status, KPI config).

---

## Endpoints Migrated in Wave 2

### Programs Controller (Extended)

| Endpoint | HTTP | Purpose | Status |
|----------|------|---------|--------|
| `GET /api/programs/:id/summary` | GET | Program summary with KPI/payout/agent counts | ✅ New |
| `POST /api/programs` | POST | Create program | ✅ New |
| `PUT /api/programs/:id` | PUT | Update program (filters protected fields) | ✅ New |
| `PATCH /api/programs/:id/status` | PATCH | Status transition with business rules | ✅ New |
| `DELETE /api/programs/:id` | DELETE | Delete program | ✅ New |

### KPI Config Controller (New)

| Endpoint | HTTP | Purpose | Status |
|----------|------|---------|--------|
| `GET /api/kpi-config/registry` | GET | Full KPI registry with milestones + derived vars | ✅ New |
| `POST /api/kpi-config/:id/validate` | POST | Validate KPI config (milestones, links) | ✅ New |
| `GET /api/kpi-config/:id/summary` | GET | KPI summary with slabs + qualifying rules | ✅ New |

All endpoints support both `/api/` and `/api/v1/` route prefixes.

---

## Files Created

| File | Layer | Purpose |
|------|-------|---------|
| `Api/Controllers/KpiConfigController.cs` | API | KPI Config endpoints (registry, validate, summary) |
| `Application/Abstractions/Repositories/IKpiConfigRepository.cs` | Application | Repository interface for KPI config |
| `Infrastructure/Persistence/Repositories/KpiConfigRepository.cs` | Infrastructure | Dapper repository for KPI config |
| `Infrastructure/Persistence/Sql/KpiConfigSql.cs` | Infrastructure | SQL constants for KPI config queries |
| `tests/Incentive.IntegrationTests/Wave2EndpointTests.cs` | Tests | 30 integration tests for Wave 2 |
| `docs/migration/WAVE2_ROUTE_SCOPE.md` | Docs | Route scope documentation |
| `docs/migration/WAVE2_IMPLEMENTATION_SUMMARY.md` | Docs | This file |
| `docs/migration/WAVE2_PARITY_NOTES.md` | Docs | Response parity documentation |
| `docs/migration/WAVE2_VALIDATION_PARITY.md` | Docs | Validation parity documentation |

## Files Updated

| File | Layer | Changes |
|------|-------|---------|
| `Api/Controllers/ProgramsController.cs` | API | Added POST, PUT, PATCH /status, DELETE, GET /summary |
| `Application/Abstractions/Repositories/IProgramsRepository.cs` | Application | Added summary, overlap, KPI/payout count methods |
| `Infrastructure/Persistence/Repositories/ProgramsRepository.cs` | Infrastructure | Implemented summary, overlap, count methods |
| `Infrastructure/Persistence/Sql/ProgramsSql.cs` | Infrastructure | Added summary/status validation SQL constants |
| `Infrastructure/Extensions/InfrastructureServiceCollectionExtensions.cs` | Infrastructure | Registered IKpiConfigRepository |

---

## Repository Classes

| Interface | Implementation | Wave |
|-----------|---------------|------|
| `IDashboardRepository` | `DashboardRepository` | Wave 1 |
| `ISystemStatusRepository` | `SystemStatusRepository` | Wave 1 |
| `INotificationsRepository` | `NotificationsRepository` | Wave 1 |
| `IOrgDomainMappingRepository` | `OrgDomainMappingRepository` | Wave 1 |
| `IProgramsRepository` | `ProgramsRepository` | Wave 1 + Extended in Wave 2 |
| **`IKpiConfigRepository`** | **`KpiConfigRepository`** | **Wave 2** |

---

## Business Logic Preserved

### Program Status Transitions
Exact parity with Node.js `PATCH /api/programs/:id/status`:
1. Status must be `DRAFT`, `ACTIVE`, or `CLOSED` → error VAL_003
2. Program must exist → error VAL_006
3. Cannot transition CLOSED → ACTIVE → error BUS_001
4. When activating:
   - No overlapping active programs in same channel/date range → error BUS_002
   - Must have KPI definitions → error BUS_007
   - Must have payout rules → error BUS_006

### Program Update
- Protected fields filtered: `id`, `created_at`, `created_by`
- At least one updatable field required → error VAL_001

### KPI Validation
- Checks program existence and status
- Validates milestone range continuity (gap detection)
- Checks payout slab linkage

---

## Endpoints Still in Node.js Only

| Category | Endpoints | Wave |
|----------|-----------|------|
| KPI CRUD | GET/POST/PUT/DELETE /api/kpis | Wave 2+ |
| Payout CRUD | GET/POST/PUT/DELETE /api/payouts | Wave 2+ |
| Groups | GET/POST/PUT/DELETE /api/groups | Wave 2+ |
| Derived Variables | GET/POST /api/derived-variables | Wave 2+ |
| Upload | POST /api/upload/* | Wave 3 |
| Calculation | POST /api/calculate/* | Wave 4 |
| Incentive Results | GET/POST /api/incentive-results/* | Wave 3 |
| Review Adjustments | GET/POST /api/review-adjustments/* | Wave 3 |
| Exception Log | GET/POST /api/exception-log/* | Wave 3 |
| Integration | All /api/integration/* | Wave 4 |
| Leaderboard | GET /api/leaderboard | Wave 1+ |
| Auth | POST /api/auth/system-token | Wave 2+ |

---

## Test Summary

30 integration tests added in `Wave2EndpointTests.cs`:
- Programs Summary: 3 tests (status, v1 route, shape validation)
- Programs Create: 2 tests (201 response, v1 route)
- Programs Update: 3 tests (success, empty body validation, not found)
- Programs Status Update: 3 tests (invalid status, missing status, v1 route)
- Programs Delete: 2 tests (not found, v1 route)
- KPI Config Registry: 3 tests (status, v1 route, shape validation)
- KPI Config Validate: 4 tests (success, v1 route, not found, shape validation)
- KPI Config Summary: 4 tests (success, v1 route, not found, shape validation)
- Routing Parity: 6 theory tests (GET + POST routes accessible)
