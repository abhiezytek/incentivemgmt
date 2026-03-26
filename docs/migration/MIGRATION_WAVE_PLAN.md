# Migration Wave Plan

> Defines the recommended order for migrating Node.js routes to .NET 10.
> Each wave is self-contained and independently deployable.

---

## Wave 1: Read-Only Endpoints (~35 endpoints)

### What
All GET endpoints that return data without side effects.

### Why First
- **Zero risk to existing behavior** — read-only queries can run in parallel with Node.js
- **Fastest to implement** — straightforward SQL → Dapper mapping
- **Validates infrastructure** — proves the DB connection, CORS, JSON serialization, Swagger, and route matching work correctly
- **Enables A/B testing** — can compare Node.js and .NET responses byte-for-byte
- **Builds confidence** — team sees working .NET endpoints before touching workflow logic

### Endpoints

| Controller | Endpoints |
|------------|-----------|
| `ProgramsController` | GET `/programs`, GET `/programs/:id`, GET `/programs/:id/summary` |
| `KpisController` | GET `/kpis`, GET `/kpis/:id`, GET `/kpis/:id/milestones` |
| `PayoutsController` | GET `/payouts`, GET `/payouts/:id`, GET `/payouts/:id/slabs` |
| `GroupsController` | GET `/groups`, GET `/groups/:id` |
| `DerivedVariablesController` | GET `/derived-variables` |
| `AgentsController` | GET `/agents` |
| `PolicyTransactionsController` | GET `/policy-transactions` |
| `PersistencyDataController` | GET `/persistency-data` |
| `ProductsController` | GET `/products` |
| `IncentiveRatesController` | GET `/incentive-rates` |
| `PerformanceController` | GET `/performance` |
| `CalculateController` | GET `/calculate/results` |
| `IncentiveResultsController` | GET `/incentive-results`, GET `/incentive-results/stage-summary`, GET `/incentive-results/summary` |
| `ReviewAdjustmentsController` | GET `/review-adjustments`, GET `/review-adjustments/:id`, GET `/review-adjustments/:id/audit` |
| `DashboardController` | GET `/dashboard/summary`, GET `/dashboard/executive-summary` |
| `LeaderboardController` | GET `/leaderboard` |
| `ExceptionLogController` | GET `/exception-log`, GET `/exception-log/:id` |
| `NotificationsController` | GET `/notifications` |
| `SystemStatusController` | GET `/system-status/summary` |
| `OrgDomainMappingController` | GET `/org-domain-mapping` |
| `KpiConfigController` | GET `/kpi-config/registry`, GET `/kpi-config/:id/summary` |
| `IntegrationStatusController` | GET `/integration/status`, GET `/integration/file-log`, GET `/integration/audit-log`, GET `/integration/failed-records` |
| `IntegrationExportController` | GET `/integration/export/history` |

### Acceptance Criteria
- [ ] All GET responses match Node.js byte-for-byte (JSON structure, field names, types, nulls)
- [ ] Policy number masking works identically
- [ ] JSONB fields (calc_breakdown, nb_by_product) deserialize correctly
- [ ] Pagination parameters work identically (limit, offset)
- [ ] Query filters match Node.js behavior
- [ ] Swagger UI shows all endpoints with correct schemas
- [ ] Health endpoint returns `{ "status": "ok" }`

### Estimated Complexity: LOW

---

## Wave 2: Config & CRUD Endpoints (~30 endpoints)

### What
Create, update, and delete operations for configuration entities. Plus file uploads and auth.

### Why Second
- **Config changes are reversible** — if something goes wrong, data can be fixed
- **No cascading side effects** — creating a KPI doesn't trigger calculations
- **Validates write path** — proves Dapper INSERT/UPDATE/DELETE, CSV parsing, bulk insert
- **Auth endpoint required** — system token generation needed for Wave 4 integrations

### Endpoints

| Controller | Endpoints |
|------------|-----------|
| `ProgramsController` | POST, PUT, PATCH /status, DELETE |
| `KpisController` | POST, PUT, DELETE, POST milestones, PUT milestones, DELETE milestones |
| `PayoutsController` | POST, PUT, DELETE, POST slabs, PUT slabs, DELETE slabs |
| `GroupsController` | POST, PUT, DELETE, member CRUD |
| `DerivedVariablesController` | POST |
| `PerformanceController` | POST, POST /upload |
| `UploadController` | POST /policy-transactions, POST /agents, POST /persistency, POST /incentive-rates |
| `AgentsController` | POST /upload |
| `PolicyTransactionsController` | POST /upload |
| `PersistencyDataController` | POST /upload |
| `ProductsController` | POST /upload |
| `IncentiveRatesController` | POST /upload |
| `NotificationsController` | POST /:id/read, POST /mark-all-read |
| `KpiConfigController` | POST /:id/validate |
| `AuthController` | POST /system-token |

### Acceptance Criteria
- [ ] CRUD operations match Node.js (same SQL, same validations)
- [ ] Status transitions enforce same rules (DRAFT→ACTIVE→CLOSED)
- [ ] CSV upload validates same required columns
- [ ] Bulk insert uses same deduplication logic
- [ ] Error codes match (VAL_001, BUS_001, etc.)
- [ ] File size limit (20MB) enforced
- [ ] System token JWT matches Node.js format (client_id, type, expiry)

### Estimated Complexity: MEDIUM

---

## Wave 3: Workflow Endpoints (~10 endpoints)

### What
Approval pipeline, payment initiation, adjustments, holds, exception resolution.

### Why Third
- **State transitions are irreversible** — APPROVED cannot go back to DRAFT
- **Business rules are complex** — gate checks, hold logic, skip counting
- **Requires thorough testing** — must match Node.js behavior exactly
- **Dependencies on Wave 1/2** — needs working read endpoints to verify

### Endpoints

| Controller | Endpoints | Key Logic |
|------------|-----------|-----------|
| `IncentiveResultsController` | POST /bulk-approve | Skip held, skip gate_failed, count correctly |
| `IncentiveResultsController` | POST /initiate-payment | APPROVED → INITIATED |
| `IncentiveResultsController` | POST /mark-paid | INITIATED → PAID |
| `IncentiveResultsController` | POST /:id/approve | Single DRAFT → APPROVED |
| `ReviewAdjustmentsController` | POST /:id/adjust | Additive adjustment |
| `ReviewAdjustmentsController` | POST /:id/hold | Virtual HOLD status |
| `ReviewAdjustmentsController` | POST /:id/release | Clear HOLD |
| `ReviewAdjustmentsController` | POST /batch-approve | Delegates with held check |
| `ExceptionLogController` | POST /:id/resolve | OPEN → RESOLVED/DISMISSED |
| `IntegrationStatusController` | POST /failed-records/:id/skip | Mark as SKIPPED |

### Acceptance Criteria
- [ ] Status pipeline matches exactly (DRAFT→APPROVED→INITIATED→PAID)
- [ ] Bulk approve skip counts match (`approved`, `skipped_held`, `skipped_gate_failed`)
- [ ] Persistency gate check uses same field and threshold comparison
- [ ] Virtual HOLD detection logic matches (latest HOLD without subsequent RELEASE)
- [ ] Additive adjustments never modify base `ins_incentive_results` fields
- [ ] Exception status transitions match (OPEN→INVESTIGATING→RESOLVED|DISMISSED)

### Estimated Complexity: MEDIUM-HIGH

---

## Wave 4: Calculation, Export & Integration (~12 endpoints + 2 jobs)

### What
Calculation engines, export file generation, inbound integrations, background jobs.

### Why Last
- **Highest risk** — calculation engine is the core business logic
- **External dependencies** — SFTP, Penta API, hierarchy API
- **Side effects** — calculations write results, exports transition status
- **Requires regression testing** — baseline values must match exactly (R01-R36 tests)

### Endpoints

| Controller | Endpoints | Key Logic |
|------------|-----------|-----------|
| `CalculateController` | POST /run | Bulk calculation (both engines) |
| `CalculateController` | POST /:pid/:uid/:period | Single calculation |
| `IntegrationExportController` | POST /oracle-financials | CSV generation + APPROVED→INITIATED |
| `IntegrationExportController` | POST /sap-fico | CSV generation + APPROVED→INITIATED |
| `IntegrationPentaController` | POST /heartbeat | System auth + audit |
| `IntegrationPentaController` | POST /policy-data | Staging + validation |
| `IntegrationLifeAsiaController` | POST /notify | Webhook + audit |
| `IntegrationLifeAsiaController` | GET /last-file | System auth |
| `IntegrationStatusController` | POST /trigger/sftp-poll | Launch background job |
| `IntegrationStatusController` | POST /trigger/hierarchy-sync | Launch background job |
| `IntegrationStatusController` | POST /trigger/reprocess | Re-process staging |

### Background Jobs

| Job | Implementation | Schedule |
|-----|---------------|----------|
| `SftpPollerJob` | Quartz.NET IJob | Daily (configurable) |
| `HierarchySyncJob` | Quartz.NET IJob | 21:00 UTC daily |

### Acceptance Criteria
- [ ] Regression tests R01-R36 pass with identical baseline values
- [ ] Milestone matching logic produces same results (boundary comparisons)
- [ ] Slab evaluation with VARIABLE/FIXED calc_type matches
- [ ] Persistency gate cascade (order, break semantics) matches
- [ ] MLM override levels match (relative hierarchy level)
- [ ] JSONB calc_breakdown structure matches exactly
- [ ] Oracle AP CSV format matches (DD-MON-YYYY dates, column order)
- [ ] SAP FICO CSV format matches (DD.MM.YYYY dates, column order)
- [ ] SFTP poller handles AS400 date format (DDMMYYYY→YYYY-MM-DD)
- [ ] Hierarchy sync builds same hierarchy_path strings
- [ ] Export transitions status to INITIATED

### Estimated Complexity: HIGH-CRITICAL

---

## Wave Summary

| Wave | Endpoints | Complexity | Duration Est. | Key Risk |
|------|-----------|------------|---------------|----------|
| **Wave 1** | ~35 GET | Low | — | JSON parity |
| **Wave 2** | ~30 POST/PUT/DELETE | Medium | — | Validation parity |
| **Wave 3** | ~10 workflow | Medium-High | — | Status transition parity |
| **Wave 4** | ~12 + 2 jobs | High-Critical | — | Calculation parity |

### Dependencies
```
Wave 1 → Wave 2 → Wave 3 → Wave 4
                ↘ Wave 4 (auth endpoint from Wave 2 needed)
```

### Rollback Strategy
Each wave can be rolled back by removing the Node.js proxy rule and restoring the original route handler. No database changes are needed since both Node.js and .NET use the same database.
