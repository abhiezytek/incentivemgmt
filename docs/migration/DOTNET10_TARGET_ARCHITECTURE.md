# .NET 10 Target Architecture

> Defines the layered solution structure for the incentive management backend.
> Maps every current Node.js module into the new structure.

---

## 1. Solution Structure

```
backend-dotnet/
├── IncentiveManagement.sln
├── src/
│   ├── Incentive.Api/                    ← ASP.NET Core Web API (host)
│   │   ├── Controllers/
│   │   │   ├── ProgramsController.cs
│   │   │   ├── KpisController.cs
│   │   │   ├── PayoutsController.cs
│   │   │   ├── CalculateController.cs
│   │   │   ├── GroupsController.cs
│   │   │   ├── IncentiveResultsController.cs
│   │   │   ├── LeaderboardController.cs
│   │   │   ├── DashboardController.cs
│   │   │   ├── PerformanceController.cs
│   │   │   ├── DerivedVariablesController.cs
│   │   │   ├── PolicyTransactionsController.cs
│   │   │   ├── AgentsController.cs
│   │   │   ├── PersistencyDataController.cs
│   │   │   ├── ProductsController.cs
│   │   │   ├── IncentiveRatesController.cs
│   │   │   ├── UploadController.cs
│   │   │   ├── ReviewAdjustmentsController.cs
│   │   │   ├── ExceptionLogController.cs
│   │   │   ├── NotificationsController.cs
│   │   │   ├── SystemStatusController.cs
│   │   │   ├── OrgDomainMappingController.cs
│   │   │   ├── KpiConfigController.cs
│   │   │   ├── AuthController.cs
│   │   │   └── Integration/
│   │   │       ├── PentaController.cs
│   │   │       ├── LifeAsiaController.cs
│   │   │       ├── ExportController.cs
│   │   │       └── IntegrationStatusController.cs
│   │   ├── Middleware/
│   │   │   ├── ExceptionHandlerMiddleware.cs
│   │   │   ├── MaskResponseMiddleware.cs
│   │   │   └── SystemAuthMiddleware.cs
│   │   ├── Filters/
│   │   │   └── UserAuthFilter.cs
│   │   ├── Extensions/
│   │   │   ├── ServiceCollectionExtensions.cs
│   │   │   └── ApplicationBuilderExtensions.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   └── Incentive.Api.csproj
│   │
│   ├── Incentive.Application/            ← Business logic / use cases
│   │   ├── Services/
│   │   │   ├── CalculateIncentiveService.cs      ← from engine/calculateIncentive.js
│   │   │   ├── InsuranceCalcEngineService.cs      ← from engine/insuranceCalcEngine.js
│   │   │   ├── IncentiveResultService.cs          ← approval/payment workflow
│   │   │   ├── ReviewAdjustmentService.cs         ← hold/release/adjust logic
│   │   │   ├── ProgramService.cs                  ← status transitions
│   │   │   ├── UploadService.cs                   ← CSV parse + bulk insert
│   │   │   ├── ExportService.cs                   ← Oracle/SAP CSV generation
│   │   │   └── DashboardService.cs                ← aggregation queries
│   │   ├── Interfaces/
│   │   │   ├── ICalculateIncentiveService.cs
│   │   │   ├── IInsuranceCalcEngineService.cs
│   │   │   ├── IIncentiveResultService.cs
│   │   │   ├── IReviewAdjustmentService.cs
│   │   │   ├── IProgramService.cs
│   │   │   ├── IUploadService.cs
│   │   │   ├── IExportService.cs
│   │   │   └── IDashboardService.cs
│   │   ├── Dto/
│   │   │   ├── Requests/
│   │   │   │   ├── CreateProgramRequest.cs
│   │   │   │   ├── UpdateProgramRequest.cs
│   │   │   │   ├── ChangeStatusRequest.cs
│   │   │   │   ├── BulkApproveRequest.cs
│   │   │   │   ├── AdjustmentRequest.cs
│   │   │   │   ├── CalculateRunRequest.cs
│   │   │   │   └── SystemTokenRequest.cs
│   │   │   └── Responses/
│   │   │       ├── CalculationResultResponse.cs
│   │   │       ├── DashboardSummaryResponse.cs
│   │   │       ├── StageSummaryResponse.cs
│   │   │       ├── BulkApproveResponse.cs
│   │   │       └── ExportResponse.cs
│   │   ├── Validators/
│   │   │   ├── ProgramValidator.cs
│   │   │   ├── KpiValidator.cs
│   │   │   └── UploadValidator.cs
│   │   └── Incentive.Application.csproj
│   │
│   ├── Incentive.Domain/                 ← Domain models / enums / constants
│   │   ├── Enums/
│   │   │   ├── ProgramStatus.cs           (DRAFT, ACTIVE, CLOSED)
│   │   │   ├── IncentiveStatus.cs         (DRAFT, APPROVED, INITIATED, PAID)
│   │   │   ├── ExceptionStatus.cs         (OPEN, INVESTIGATING, RESOLVED, DISMISSED)
│   │   │   ├── MilestoneFunction.cs       (LEFT_INCLUSIVE_BETWEEN, BETWEEN, GTE, LTE)
│   │   │   ├── SlabOperator.cs            (GTE, LTE, BETWEEN, EQ)
│   │   │   ├── IncentiveOperator.cs       (MULTIPLY, FLAT, PERCENTAGE_OF)
│   │   │   ├── RateType.cs                (PERCENTAGE_OF_PREMIUM, FLAT_PER_POLICY, PERCENTAGE_OF_APE)
│   │   │   ├── GateConsequence.cs         (BLOCK_INCENTIVE, REDUCE_BY_PCT, CLAWBACK_PCT)
│   │   │   └── TransactionType.cs         (NEW_BUSINESS, RENEWAL)
│   │   ├── Constants/
│   │   │   ├── ErrorCodes.cs              ← from utils/errorCodes.js
│   │   │   └── PersistencyMonths.cs       (13, 25, 37, 49, 61)
│   │   ├── Exceptions/
│   │   │   ├── ApiException.cs
│   │   │   ├── BusinessRuleException.cs
│   │   │   └── ValidationException.cs
│   │   └── Incentive.Domain.csproj
│   │
│   └── Incentive.Infrastructure/          ← Data access, external services
│       ├── Data/
│       │   ├── DbConnectionFactory.cs     ← from db/pool.js
│       │   ├── QueryHelper.cs             ← from db/queryHelper.js
│       │   └── DapperTypeHandlers.cs      (JSONB ↔ C# type handlers)
│       ├── Repositories/
│       │   ├── ProgramRepository.cs
│       │   ├── KpiRepository.cs
│       │   ├── PayoutRepository.cs
│       │   ├── AgentRepository.cs
│       │   ├── IncentiveResultRepository.cs
│       │   └── IntegrationRepository.cs
│       ├── ExternalServices/
│       │   ├── SftpService.cs             ← from jobs/sftpPoller.js (SFTP connection only)
│       │   ├── HierarchyApiClient.cs      ← from jobs/hierarchySync.js (HTTP calls only)
│       │   └── PentaApiClient.cs
│       ├── BackgroundJobs/
│       │   ├── SftpPollerJob.cs           ← Quartz IJob from jobs/sftpPoller.js
│       │   └── HierarchySyncJob.cs        ← Quartz IJob from jobs/hierarchySync.js
│       ├── Utils/
│       │   ├── CsvParserUtil.cs           ← from utils/csvParser.js
│       │   ├── BulkInsertUtil.cs          ← from utils/bulkInsert.js
│       │   └── DataMaskUtil.cs            ← from utils/dataMask.js
│       └── Incentive.Infrastructure.csproj
│
├── tests/
│   ├── Incentive.IntegrationTests/        ← HTTP-level tests (equivalent to e2e/fullFlowTest.js)
│   │   ├── ProgramsTests.cs
│   │   ├── CalculationTests.cs
│   │   ├── ApprovalWorkflowTests.cs
│   │   ├── ExportTests.cs
│   │   ├── IntegrationTests.cs
│   │   └── Incentive.IntegrationTests.csproj
│   │
│   └── Incentive.RegressionTests/         ← Value-level tests (equivalent to calculationRegressionTest.js)
│       ├── BaselineValueTests.cs
│       ├── AdditiveIsolationTests.cs
│       ├── StatusDistributionTests.cs
│       └── Incentive.RegressionTests.csproj
│
└── database/                              ← Shared database assets (same as server/src/db/)
    ├── migrations/
    │   ├── 001_master_schema.sql
    │   ├── 002_insurance_schema.sql
    │   ├── 002_add_team_override_pct.sql
    │   ├── 003_integration_schema.sql
    │   ├── 003_payout_disbursement_log.sql
    │   ├── 004_staging_tables.sql
    │   ├── 005_outbound_file_log.sql
    │   └── 006_additive_tables.sql
    ├── functions/
    │   └── compute_agent_kpi.sql
    └── seeds/
        ├── 001_master_seed.sql
        ├── 002_agents_seed.sql
        └── 003_program_seed.sql
```

---

## 2. Node.js Module → .NET Layer Mapping

| Node.js Module | .NET Layer | .NET Location | Notes |
|----------------|-----------|---------------|-------|
| `server/index.js` | Api | `Program.cs` + `Extensions/` | Route registration, middleware, DI |
| `routes/*.js` | Api | `Controllers/` | Thin controllers delegating to Application services |
| `engine/calculateIncentive.js` | Application | `Services/CalculateIncentiveService.cs` | Core business logic |
| `engine/insuranceCalcEngine.js` | Application | `Services/InsuranceCalcEngineService.cs` | Insurance-specific calc |
| `middleware/systemAuth.js` | Api | `Middleware/SystemAuthMiddleware.cs` | JWT + api_clients ACL |
| `middleware/userAuth.js` | Api | `Filters/UserAuthFilter.cs` | Placeholder (passthrough) |
| `middleware/maskResponse.js` | Api | `Middleware/MaskResponseMiddleware.cs` | PII masking |
| `db/pool.js` | Infrastructure | `Data/DbConnectionFactory.cs` | Npgsql connection |
| `db/queryHelper.js` | Infrastructure | `Data/QueryHelper.cs` | Dapper CRUD helpers |
| `utils/errorCodes.js` | Domain | `Constants/ErrorCodes.cs` | Error definitions |
| `utils/dataMask.js` | Infrastructure | `Utils/DataMaskUtil.cs` | Policy masking algorithm |
| `utils/csvParser.js` | Infrastructure | `Utils/CsvParserUtil.cs` | CsvHelper parsing |
| `utils/bulkInsert.js` | Infrastructure | `Utils/BulkInsertUtil.cs` | UNNEST-based inserts |
| `config/swagger.js` | Api | `Program.cs` (Swashbuckle) | OpenAPI spec |
| `jobs/sftpPoller.js` | Infrastructure | `BackgroundJobs/SftpPollerJob.cs` | Quartz.NET scheduled job |
| `jobs/hierarchySync.js` | Infrastructure | `BackgroundJobs/HierarchySyncJob.cs` | Quartz.NET scheduled job |
| `routes/auth/systemToken.js` | Api + Application | `Controllers/AuthController.cs` + auth service | JWT issuance |
| `routes/integration/*.js` | Api + Application | `Controllers/Integration/` + services | External system integration |
| `db/migrations/*` | Shared | `database/migrations/` | PostgreSQL DDL (shared with Node) |
| `db/seeds/*` | Shared | `database/seeds/` | Reference data |
| `db/functions/*` | Shared | `database/functions/` | PL/pgSQL functions |

---

## 3. Project References

```
Incentive.Api
  → Incentive.Application
  → Incentive.Infrastructure

Incentive.Application
  → Incentive.Domain

Incentive.Infrastructure
  → Incentive.Domain
  → Incentive.Application (for interfaces)

Incentive.IntegrationTests
  → Incentive.Api (via WebApplicationFactory)

Incentive.RegressionTests
  → Incentive.Api (via WebApplicationFactory or HTTP client)
```

---

## 4. Key NuGet Packages

| Package | Layer | Purpose |
|---------|-------|---------|
| `Npgsql` | Infrastructure | PostgreSQL ADO.NET provider |
| `Dapper` | Infrastructure | Micro-ORM for SQL queries |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | Api | JWT authentication |
| `Swashbuckle.AspNetCore` | Api | OpenAPI / Swagger UI |
| `CsvHelper` | Infrastructure | CSV parsing |
| `SSH.NET` | Infrastructure | SFTP file operations |
| `Quartz` + `Quartz.Extensions.Hosting` | Infrastructure | Background job scheduling |
| `BCrypt.Net-Next` | Application | Password hashing (system token) |
| `System.Text.Json` | All | JSON serialization |

---

## 5. Configuration Strategy

| Node.js Source | .NET Target | Notes |
|----------------|-------------|-------|
| `process.env.DB_*` | `ConnectionStrings:DefaultConnection` in appsettings | Single connection string |
| `process.env.JWT_SECRET` | `Jwt:Secret` in appsettings | User JWT (future) |
| `process.env.SYSTEM_JWT_SECRET` | `Jwt:SystemSecret` in appsettings | System JWT signing |
| `process.env.SFTP_*` | `Sftp:Host/Port/Username/Password/BasePath` | Structured config section |
| `process.env.HIERARCHY_API_*` | `Integration:Hierarchy:*` | External API config |
| `process.env.PENTA_*` | `Integration:Penta:*` | External API config |
| `process.env.SAP_COMPANY_CODE` | `Integration:Export:SapCompanyCode` | Export config |
| `process.env.ORACLE_OPERATING_UNIT` | `Integration:Export:OracleOperatingUnit` | Export config |

Secrets in production should use `dotnet user-secrets` or environment variables — never committed to appsettings.json.

---

## 6. Coexistence Strategy

During migration, Node.js and .NET will coexist:

```
React Client (Vite dev / built)
    ↓ HTTP /api/*
Node.js Express Server (port 5000)
    ↓ Proxy selected routes to .NET
.NET API Server (port 5001)
    ↓ PostgreSQL
Database
```

1. Node.js remains the frontend-facing server on port 5000
2. As routes are migrated to .NET, Node.js proxies those routes to port 5001
3. When all routes are migrated, React client points directly to .NET
4. Node.js is reduced to `vite preview` / dev-server only

### Route Proxy Pattern (in Node.js index.js)
```javascript
import { createProxyMiddleware } from 'http-proxy-middleware';

// Migrated routes → forward to .NET
app.use('/api/v1/programs', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
}));
```

This allows **incremental migration** without breaking the React client.
