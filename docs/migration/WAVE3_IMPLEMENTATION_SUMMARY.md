# Wave 3 Implementation Summary

> Documents what was implemented in Wave 3 of the Node.js → .NET 10 backend migration.
> Wave 3 = Workflow & operational action endpoints.

## Endpoints Migrated (10 total)

### Review & Adjustments Controller (7 endpoints)

| Endpoint | HTTP | .NET Controller Method | Status |
|----------|------|----------------------|--------|
| `GET /api/review-adjustments` | GET | `ReviewAdjustmentsController.GetList()` | ✅ Migrated |
| `GET /api/review-adjustments/:id` | GET | `ReviewAdjustmentsController.GetDetail()` | ✅ Migrated |
| `POST /api/review-adjustments/:id/adjust` | POST | `ReviewAdjustmentsController.Adjust()` | ✅ Migrated |
| `POST /api/review-adjustments/:id/hold` | POST | `ReviewAdjustmentsController.Hold()` | ✅ Migrated |
| `POST /api/review-adjustments/:id/release` | POST | `ReviewAdjustmentsController.Release()` | ✅ Migrated |
| `POST /api/review-adjustments/batch-approve` | POST | `ReviewAdjustmentsController.BatchApprove()` | ✅ Migrated |
| `GET /api/review-adjustments/:id/audit` | GET | `ReviewAdjustmentsController.GetAuditTrail()` | ✅ Migrated |

### Exception Log Controller (3 endpoints)

| Endpoint | HTTP | .NET Controller Method | Status |
|----------|------|----------------------|--------|
| `GET /api/exception-log` | GET | `ExceptionLogController.GetList()` | ✅ Migrated |
| `GET /api/exception-log/:id` | GET | `ExceptionLogController.GetDetail()` | ✅ Migrated |
| `POST /api/exception-log/:id/resolve` | POST | `ExceptionLogController.Resolve()` | ✅ Migrated |

All endpoints support dual routing: `/api/` and `/api/v1/`.

## Files Created

| File | Layer | Purpose |
|------|-------|---------|
| `Controllers/ReviewAdjustmentsController.cs` | API | 7 review/adjustment endpoints |
| `Controllers/ExceptionLogController.cs` | API | 3 exception log endpoints |
| `Abstractions/Repositories/IReviewAdjustmentsRepository.cs` | Application | Repository interface |
| `Abstractions/Repositories/IExceptionLogRepository.cs` | Application | Repository interface |
| `Features/ReviewAdjustments/ReviewDtos.cs` | Application | DTOs for review responses |
| `Features/ExceptionLog/ExceptionDtos.cs` | Application | DTOs for exception responses |
| `Persistence/Repositories/ReviewAdjustmentsRepository.cs` | Infrastructure | Dapper implementation |
| `Persistence/Repositories/ExceptionLogRepository.cs` | Infrastructure | Dapper implementation |
| `Persistence/Sql/ReviewAdjustmentsSql.cs` | Infrastructure | SQL constants |
| `Persistence/Sql/ExceptionLogSql.cs` | Infrastructure | SQL constants |
| `Wave3EndpointTests.cs` | Tests | 40+ integration tests |

## Files Updated

| File | Change |
|------|--------|
| `InfrastructureServiceCollectionExtensions.cs` | Registered Wave 3 repositories |

## Repository Classes

| Interface | Implementation | Tables |
|-----------|---------------|--------|
| `IReviewAdjustmentsRepository` | `ReviewAdjustmentsRepository` | ins_incentive_results, incentive_adjustments, incentive_review_actions, ins_agents, channels, ins_regions, incentive_programs, ins_agent_kpi_summary |
| `IExceptionLogRepository` | `ExceptionLogRepository` | operational_exceptions |

## Business Rules Preserved

### Review & Adjustments
- **Additive adjustments**: Inserts into `incentive_adjustments`, never modifies `ins_incentive_results.total_incentive`
- **HOLD is virtual**: Detected via EXISTS on un-released HOLD adjustments, not stored in status column
- **Cannot adjust PAID**: Returns BUS_003 error
- **Batch approve excludes held**: Held results are detected and excluded before UPDATE
- **Batch approve excludes gate-failed**: WHERE persistency_gate_passed = TRUE
- **Audit trail**: All actions recorded in `incentive_review_actions` with actor, action, details
- **LATERAL JOIN aggregation**: Adjustment totals and hold counts computed per-row using LATERAL JOIN

### Exception Log
- **Additive resolution**: Only updates `operational_exceptions` table
- **No incentive impact**: Exception resolution does NOT change incentive result status
- **Idempotent resolution**: Cannot re-resolve already RESOLVED/DISMISSED exceptions
- **Status validation**: Only RESOLVED or DISMISSED accepted (VAL_003)
- **Summary cards unfiltered**: Summary always shows global counts regardless of filters

## Endpoints Still in Node.js Only

| Category | Endpoints | Target Wave |
|----------|-----------|-------------|
| KPI/Payout CRUD | GET/POST/PUT/DELETE /api/kpis, /api/payouts | Wave 2+ |
| Groups CRUD | GET/POST/PUT/DELETE /api/groups | Wave 2+ |
| Derived Variables | GET/POST /api/derived-variables | Wave 2+ |
| Upload/Import | POST /api/upload/* | Wave 4 |
| Calculation | POST /api/calculate/* | Wave 4 |
| Incentive Results | GET/POST /api/incentive-results/* | Wave 4 |
| Integration | All /api/integration/* | Wave 4 |
| Export/Mark-paid | POST /api/incentive-results/export, mark-paid | Wave 4 |
| Auth | POST /api/auth/system-token | Wave 4 |

## Test Coverage

40+ integration tests in `Wave3EndpointTests.cs`:
- Review list: 5 tests (basic, v1, filters, HOLD filter, shape validation)
- Review detail: 3 tests (basic, v1, shape validation)
- Adjust: 3 tests (missing amount validation, valid body, success shape)
- Hold: 2 tests (basic, held shape)
- Release: 1 test (basic)
- Batch approve: 4 tests (missing ids, empty ids, valid ids, shape)
- Audit: 2 tests (basic, shape)
- Exception list: 4 tests (basic, v1, filters, shape)
- Exception detail: 2 tests (basic, v1)
- Exception resolve: 3 tests (invalid status, valid resolve, dismiss)
- Routing parity: 16 theory tests (GET + POST routes accessible)
