# Wave 1 Implementation Summary

> .NET 10 migration — Wave 1: Read-only endpoints
> Completed: $(date)

---

## What Was Migrated

### Endpoints (7 total, 5 GET + 2 POST)

| Endpoint | Method | Controller | Auth | Status |
|----------|--------|-----------|------|--------|
| `/api/dashboard/executive-summary` | GET | DashboardController | None | ✅ Migrated |
| `/api/system-status/summary` | GET | SystemStatusController | userAuth (placeholder) | ✅ Migrated |
| `/api/notifications` | GET | NotificationsController | userAuth (placeholder) | ✅ Migrated |
| `/api/notifications/{id}/read` | POST | NotificationsController | userAuth (placeholder) | ✅ Migrated |
| `/api/notifications/mark-all-read` | POST | NotificationsController | userAuth (placeholder) | ✅ Migrated |
| `/api/org-domain-mapping` | GET | OrgDomainMappingController | userAuth (placeholder) | ✅ Migrated |
| `/api/programs/{id}/preview` | GET | ProgramsController | None | ✅ Migrated |

All endpoints also register their `/api/v1/` prefixed route for backward compatibility.

### Architecture Layers

| Layer | Files Created | Purpose |
|-------|---------------|---------|
| **Api/Controllers** | 5 controllers | HTTP endpoint handling |
| **Application/Abstractions** | 5 repository interfaces | Contracts for data access |
| **Application/Features** | 5 DTO files | Response shape definitions |
| **Infrastructure/Persistence/Sql** | 5 SQL constant files | Parameterized queries |
| **Infrastructure/Persistence/Repositories** | 5 repository implementations | Dapper data access |
| **Tests** | 1 test file (27 tests) | Integration/shape tests |

---

## What Remains in Node.js

All Node.js routes remain active and untouched. The .NET backend runs on a separate port (5144) and does not replace or proxy any Node.js routes.

### Node routes NOT migrated in Wave 1:
- Programs CRUD (POST, PUT, PATCH /status, DELETE)
- Programs GET /summary
- KPIs, Payouts, Groups, Derived Variables (CRUD)
- Agents, Products, Persistency Data, Policy Transactions, Incentive Rates (list + upload)
- Performance data
- Upload endpoints
- Calculation execution
- Incentive Results (approval, payment, export)
- Review Adjustments
- Exception Log
- KPI Config
- Integration (Penta, Life Asia, export, status)
- Leaderboard
- Dashboard (basic summary from dashboard.js)
- Auth system token

---

## Files Created

### Controllers
- `backend-dotnet/src/Incentive.Api/Controllers/DashboardController.cs`
- `backend-dotnet/src/Incentive.Api/Controllers/SystemStatusController.cs`
- `backend-dotnet/src/Incentive.Api/Controllers/NotificationsController.cs`
- `backend-dotnet/src/Incentive.Api/Controllers/OrgDomainMappingController.cs`

### Application Layer
- `backend-dotnet/src/Incentive.Application/Abstractions/Repositories/IDashboardRepository.cs`
- `backend-dotnet/src/Incentive.Application/Abstractions/Repositories/ISystemStatusRepository.cs`
- `backend-dotnet/src/Incentive.Application/Abstractions/Repositories/INotificationsRepository.cs`
- `backend-dotnet/src/Incentive.Application/Abstractions/Repositories/IOrgDomainMappingRepository.cs`
- `backend-dotnet/src/Incentive.Application/Abstractions/Repositories/IProgramsRepository.cs`
- `backend-dotnet/src/Incentive.Application/Features/Dashboard/ExecutiveSummaryResponse.cs`
- `backend-dotnet/src/Incentive.Application/Features/SystemStatus/SystemStatusSummaryResponse.cs`
- `backend-dotnet/src/Incentive.Application/Features/Notifications/NotificationListResponse.cs`
- `backend-dotnet/src/Incentive.Application/Features/OrgDomainMapping/OrgDomainMappingResponse.cs`
- `backend-dotnet/src/Incentive.Application/Features/Programs/ProgramPreviewResponse.cs`

### Infrastructure Layer
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Sql/DashboardSql.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Sql/SystemStatusSql.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Sql/NotificationsSql.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Sql/OrgDomainMappingSql.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Sql/ProgramsSql.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Repositories/DashboardRepository.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Repositories/SystemStatusRepository.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Repositories/NotificationsRepository.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Repositories/OrgDomainMappingRepository.cs`
- `backend-dotnet/src/Incentive.Infrastructure/Persistence/Repositories/ProgramsRepository.cs`

### Tests
- `backend-dotnet/tests/Incentive.IntegrationTests/Wave1EndpointTests.cs` (27 tests)

### Files Updated
- `backend-dotnet/src/Incentive.Api/Controllers/ProgramsController.cs` — added preview endpoint
- `backend-dotnet/src/Incentive.Infrastructure/Extensions/InfrastructureServiceCollectionExtensions.cs` — DI registration for Wave 1 repos

---

## TODO Before Wave 2

1. **User Auth**: Implement real `userAuth` middleware in .NET when the login system is added (currently a placeholder matching Node.js behavior)
2. **MaskResponse**: Implement the response masking middleware if PII masking is required in .NET responses
3. **Date Formatting**: The dashboard `recentActivity[].time` field uses a slightly different locale format in .NET vs Node.js (see WAVE1_PARITY_NOTES.md)
4. **JSON Key Casing**: .NET uses `snake_case` (via System.Text.Json `SnakeCaseLower` policy), which matches Node.js DB column names but differs from the Node.js response keys that use `camelCase` for DTO-level fields
5. **`mark-all-read` Return Value**: Node.js returns `result.length` from UPDATE which is always 0 for Dapper's `ExecuteAsync` (see WAVE1_PARITY_NOTES.md)
