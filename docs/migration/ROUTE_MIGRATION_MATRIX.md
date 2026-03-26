# Route Migration Matrix

> Maps every Node.js route to its target .NET controller/action.
> Priority: P1 = Wave 1 (read-only), P2 = Wave 2 (config), P3 = Wave 3 (workflow), P4 = Wave 4 (calc/export/integration)
>
> **Wave 1 Status**: ✅ = Migrated to .NET | ⬜ = Not yet migrated
> **Wave 2 Status**: 🔵 = Migrated in Wave 2
> **Wave 3 Status**: 🟢 = Migrated in Wave 3

---

## Core Business Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `programs.js` | GET | `/api/programs` | List all programs | `ProgramsController` | `GetAll()` | P1 | ✅ Migrated Wave 1 |
| `programs.js` | GET | `/api/programs/:id` | Get single program | `ProgramsController` | `GetById(int id)` | P1 | ✅ Migrated Wave 1 |
| `programs.js` | GET | `/api/programs/:id/summary` | Program summary with KPIs/payouts/results | `ProgramsController` | `GetSummary(int id)` | P1 | 🔵 Migrated Wave 2 |
| `programs.js` | GET | `/api/programs/:id/preview` | Calculation preview | `ProgramsController` | `GetPreview(int id)` | P2 | ✅ Migrated Wave 1 |
| `programs.js` | POST | `/api/programs` | Create program | `ProgramsController` | `Create(Dictionary body)` | P2 | 🔵 Migrated Wave 2 |
| `programs.js` | PUT | `/api/programs/:id` | Update program | `ProgramsController` | `Update(int id, Dictionary body)` | P2 | 🔵 Migrated Wave 2 |
| `programs.js` | PATCH | `/api/programs/:id/status` | Change status (DRAFT→ACTIVE→CLOSED) | `ProgramsController` | `UpdateStatus(int id, Dictionary body)` | P2 | 🔵 Migrated Wave 2 |
| `programs.js` | DELETE | `/api/programs/:id` | Delete program | `ProgramsController` | `Delete(int id)` | P2 | 🔵 Migrated Wave 2 |
| `kpis.js` | GET | `/api/kpis` | List KPIs | `KpisController` | `GetAll()` | P1 | Read-only |
| `kpis.js` | GET | `/api/kpis/:id` | Get KPI with milestones | `KpisController` | `GetById(int id)` | P1 | Read-only |
| `kpis.js` | POST | `/api/kpis` | Create KPI | `KpisController` | `Create(CreateKpiRequest)` | P2 | Config write |
| `kpis.js` | PUT | `/api/kpis/:id` | Update KPI | `KpisController` | `Update(int id, UpdateKpiRequest)` | P2 | Config write |
| `kpis.js` | DELETE | `/api/kpis/:id` | Delete KPI + milestones | `KpisController` | `Delete(int id)` | P2 | Cascades to milestones |
| `kpis.js` | GET | `/api/kpis/:kpiId/milestones` | List milestones | `KpisController` | `GetMilestones(int kpiId)` | P1 | Read-only |
| `kpis.js` | POST | `/api/kpis/:kpiId/milestones` | Create milestone | `KpisController` | `CreateMilestone(int kpiId, ...)` | P2 | Config write |
| `kpis.js` | PUT | `/api/kpis/:kpiId/milestones/:mid` | Update milestone | `KpisController` | `UpdateMilestone(int kpiId, int mid, ...)` | P2 | Config write |
| `kpis.js` | DELETE | `/api/kpis/:kpiId/milestones/:mid` | Delete milestone | `KpisController` | `DeleteMilestone(int kpiId, int mid)` | P2 | Config write |
| `payouts.js` | GET | `/api/payouts` | List payout rules | `PayoutsController` | `GetAll()` | P1 | Read-only |
| `payouts.js` | GET | `/api/payouts/:id` | Get rule with slabs | `PayoutsController` | `GetById(int id)` | P1 | Read-only |
| `payouts.js` | POST | `/api/payouts` | Create payout rule | `PayoutsController` | `Create(CreatePayoutRequest)` | P2 | Config write |
| `payouts.js` | PUT | `/api/payouts/:id` | Update payout rule | `PayoutsController` | `Update(int id, ...)` | P2 | Config write |
| `payouts.js` | DELETE | `/api/payouts/:id` | Delete rule + slabs | `PayoutsController` | `Delete(int id)` | P2 | Cascades to slabs |
| `payouts.js` | GET | `/api/payouts/:ruleId/slabs` | List slabs | `PayoutsController` | `GetSlabs(int ruleId)` | P1 | Read-only |
| `payouts.js` | POST | `/api/payouts/:ruleId/slabs` | Create slab | `PayoutsController` | `CreateSlab(int ruleId, ...)` | P2 | Config write |
| `payouts.js` | PUT | `/api/payouts/:ruleId/slabs/:slabId` | Update slab | `PayoutsController` | `UpdateSlab(int ruleId, int slabId, ...)` | P2 | Config write |
| `payouts.js` | DELETE | `/api/payouts/:ruleId/slabs/:slabId` | Delete slab | `PayoutsController` | `DeleteSlab(int ruleId, int slabId)` | P2 | Config write |
| `groups.js` | GET | `/api/groups` | List user groups | `GroupsController` | `GetAll()` | P1 | Read-only |
| `groups.js` | GET | `/api/groups/:id` | Get group | `GroupsController` | `GetById(int id)` | P1 | Read-only |
| `groups.js` | POST | `/api/groups` | Create group | `GroupsController` | `Create(...)` | P2 | Config write |
| `groups.js` | PUT | `/api/groups/:id` | Update group | `GroupsController` | `Update(int id, ...)` | P2 | Config write |
| `groups.js` | DELETE | `/api/groups/:id` | Delete group | `GroupsController` | `Delete(int id)` | P2 | Config write |
| `derivedVariables.js` | GET | `/api/derived-variables` | List derived variables | `DerivedVariablesController` | `GetAll()` | P1 | Read-only |
| `derivedVariables.js` | POST | `/api/derived-variables` | Create derived variable | `DerivedVariablesController` | `Create(...)` | P2 | Config write |

## Data / Read Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `agents.js` | GET | `/api/agents` | List agents (filter: channel, region, status) | `AgentsController` | `GetAll(...)` | P1 | Read-only, filtered |
| `agents.js` | POST | `/api/agents/upload` | Bulk CSV upload | `AgentsController` | `Upload(IFormFile)` | P2 | Code→ID resolution, hierarchy rebuild |
| `policyTransactions.js` | GET | `/api/policy-transactions` | List transactions (paginated) | `PolicyTransactionsController` | `GetAll(...)` | P1 | Read-only |
| `policyTransactions.js` | POST | `/api/policy-transactions/upload` | Bulk CSV upload | `PolicyTransactionsController` | `Upload(IFormFile)` | P2 | Date validation, duplicate check |
| `persistencyData.js` | GET | `/api/persistency-data` | List persistency data | `PersistencyDataController` | `GetAll(...)` | P1 | Read-only |
| `persistencyData.js` | POST | `/api/persistency-data/upload` | Bulk CSV upload | `PersistencyDataController` | `Upload(IFormFile)` | P2 | Month validation [13,25,37,49,61] |
| `products.js` | GET | `/api/products` | List products | `ProductsController` | `GetAll(...)` | P1 | Read-only |
| `products.js` | POST | `/api/products/upload` | Bulk CSV upsert | `ProductsController` | `Upload(IFormFile)` | P2 | ON CONFLICT product_code |
| `incentiveRates.js` | GET | `/api/incentive-rates` | List rates (joined with channels) | `IncentiveRatesController` | `GetAll(...)` | P1 | Read-only |
| `incentiveRates.js` | POST | `/api/incentive-rates/upload` | Bulk CSV upload | `IncentiveRatesController` | `Upload(IFormFile)` | P2 | Channel code resolution |
| `performance.js` | GET | `/api/performance` | List performance data | `PerformanceController` | `GetAll(...)` | P1 | Read-only |
| `performance.js` | POST | `/api/performance` | Create single row | `PerformanceController` | `Create(...)` | P2 | Single insert |
| `performance.js` | POST | `/api/performance/upload` | Bulk CSV upload | `PerformanceController` | `Upload(IFormFile)` | P2 | Transactional |

## Upload Routes (Centralized)

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|----------|-------|
| `upload.js` | POST | `/api/upload/policy-transactions` | CSV upload | `UploadController` | P2 | Duplicate detection, date validation |
| `upload.js` | POST | `/api/upload/agents` | CSV upload | `UploadController` | P2 | Code→ID resolution |
| `upload.js` | POST | `/api/upload/persistency` | CSV upload | `UploadController` | P2 | Month validation |
| `upload.js` | POST | `/api/upload/incentive-rates` | CSV upload | `UploadController` | P2 | Product code validation |

## Dashboard & Analytics Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `dashboard.js` | GET | `/api/dashboard/summary` | 7-section dashboard | `DashboardController` | `GetSummary(...)` | P1 | Complex aggregation query |
| `executiveSummary.js` | GET | `/api/dashboard/executive-summary` | Executive KPI cards | `DashboardController` | `GetExecutiveSummary()` | P1 | ✅ Migrated Wave 1 |
| `leaderboard.js` | GET | `/api/leaderboard` | Agent ranking | `LeaderboardController` | `Get(...)` | P1 | Read-only, filtered |

## Workflow Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `calculate.js` | POST | `/api/calculate/run` | Bulk calculation | `CalculateController` | `RunBulk(...)` | P4 | Highest risk — engine logic |
| `calculate.js` | GET | `/api/calculate/results` | Get calc results | `CalculateController` | `GetResults(...)` | P1 | Read-only |
| `calculate.js` | POST | `/api/calculate/:pid/:uid/:period` | Single calc | `CalculateController` | `RunSingle(...)` | P4 | Engine logic |
| `incentiveResults.js` | GET | `/api/incentive-results/stage-summary` | Stage counts | `IncentiveResultsController` | `GetStageSummary(...)` | P1 | Read-only |
| `incentiveResults.js` | GET | `/api/incentive-results/summary` | Aggregated summary | `IncentiveResultsController` | `GetSummary(...)` | P1 | Read-only |
| `incentiveResults.js` | GET | `/api/incentive-results` | List results | `IncentiveResultsController` | `GetAll(...)` | P1 | Read-only, paginated |
| `incentiveResults.js` | POST | `/api/incentive-results/bulk-approve` | Batch approve | `IncentiveResultsController` | `BulkApprove(...)` | P3 | DRAFT→APPROVED, gate check |
| `incentiveResults.js` | POST | `/api/incentive-results/initiate-payment` | Initiate payment | `IncentiveResultsController` | `InitiatePayment(...)` | P3 | APPROVED→INITIATED |
| `incentiveResults.js` | POST | `/api/incentive-results/mark-paid` | Mark paid | `IncentiveResultsController` | `MarkPaid(...)` | P3 | INITIATED→PAID |
| `incentiveResults.js` | POST | `/api/incentive-results/:id/approve` | Single approve | `IncentiveResultsController` | `ApproveSingle(int id, ...)` | P3 | DRAFT→APPROVED |
| `reviewAdjustments.js` | GET | `/api/review-adjustments` | List for review | `ReviewAdjustmentsController` | `GetList(...)` | P3 | 🟢 Migrated Wave 3 |
| `reviewAdjustments.js` | GET | `/api/review-adjustments/:id` | Get detail + adjustments | `ReviewAdjustmentsController` | `GetDetail(int id)` | P3 | 🟢 Migrated Wave 3 |
| `reviewAdjustments.js` | POST | `/api/review-adjustments/:id/adjust` | Apply adjustment | `ReviewAdjustmentsController` | `Adjust(int id, ...)` | P3 | 🟢 Migrated Wave 3, additive-only |
| `reviewAdjustments.js` | POST | `/api/review-adjustments/:id/hold` | Hold result | `ReviewAdjustmentsController` | `Hold(int id, ...)` | P3 | 🟢 Migrated Wave 3, virtual HOLD |
| `reviewAdjustments.js` | POST | `/api/review-adjustments/:id/release` | Release hold | `ReviewAdjustmentsController` | `Release(int id, ...)` | P3 | 🟢 Migrated Wave 3 |
| `reviewAdjustments.js` | POST | `/api/review-adjustments/batch-approve` | Batch approve | `ReviewAdjustmentsController` | `BatchApprove(...)` | P3 | 🟢 Migrated Wave 3 |
| `reviewAdjustments.js` | GET | `/api/review-adjustments/:id/audit` | Audit trail | `ReviewAdjustmentsController` | `GetAuditTrail(int id)` | P3 | 🟢 Migrated Wave 3 |

## Admin / Config Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `exceptionLog.js` | GET | `/api/exception-log` | List exceptions | `ExceptionLogController` | `GetList(...)` | P3 | 🟢 Migrated Wave 3 |
| `exceptionLog.js` | GET | `/api/exception-log/:id` | Get exception detail | `ExceptionLogController` | `GetDetail(int id)` | P3 | 🟢 Migrated Wave 3 |
| `exceptionLog.js` | POST | `/api/exception-log/:id/resolve` | Resolve exception | `ExceptionLogController` | `Resolve(int id, ...)` | P3 | 🟢 Migrated Wave 3 |
| `notifications.js` | GET | `/api/notifications` | List notifications | `NotificationsController` | `GetAll(...)` | P1 | ✅ Migrated Wave 1 |
| `notifications.js` | POST | `/api/notifications/:id/read` | Mark read | `NotificationsController` | `MarkRead(int id)` | P2 | ✅ Migrated Wave 1 |
| `notifications.js` | POST | `/api/notifications/mark-all-read` | Mark all read | `NotificationsController` | `MarkAllRead()` | P2 | ✅ Migrated Wave 1 |
| `systemStatus.js` | GET | `/api/system-status/summary` | System health | `SystemStatusController` | `GetSummary()` | P1 | ✅ Migrated Wave 1 |
| `orgDomainMapping.js` | GET | `/api/org-domain-mapping` | Org mapping view | `OrgDomainMappingController` | `Get(...)` | P1 | ✅ Migrated Wave 1 |
| `kpiConfig.js` | GET | `/api/kpi-config/registry` | KPI registry | `KpiConfigController` | `GetRegistry()` | P1 | 🔵 Migrated Wave 2 |
| `kpiConfig.js` | POST | `/api/kpi-config/:id/validate` | Validate KPI | `KpiConfigController` | `Validate(int id)` | P2 | 🔵 Migrated Wave 2 |
| `kpiConfig.js` | GET | `/api/kpi-config/:id/summary` | KPI summary | `KpiConfigController` | `GetSummary(int id)` | P1 | 🔵 Migrated Wave 2 |

## Auth Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `auth/systemToken.js` | POST | `/api/auth/system-token` | Issue system JWT | `AuthController` | `GetSystemToken(...)` | P2 | bcrypt verify, JWT issue |

## Integration Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `integration/penta.js` | POST | `/api/integration/penta/heartbeat` | Penta health check | `IntegrationPentaController` | `Heartbeat()` | P4 | systemAuth |
| `integration/penta.js` | POST | `/api/integration/penta/policy-data` | Receive policy data | `IntegrationPentaController` | `ReceivePolicyData(...)` | P4 | Staging + audit |
| `integration/lifeasia.js` | POST | `/api/integration/lifeasia/notify` | File notification | `IntegrationLifeAsiaController` | `Notify(...)` | P4 | systemAuth |
| `integration/lifeasia.js` | GET | `/api/integration/lifeasia/last-file` | Last processed file | `IntegrationLifeAsiaController` | `GetLastFile()` | P4 | systemAuth |
| `integration/export.js` | POST | `/api/integration/export/oracle-financials` | Oracle AP export | `IntegrationExportController` | `ExportOracleFinancials(...)` | P4 | CSV generation, status transition |
| `integration/export.js` | POST | `/api/integration/export/sap-fico` | SAP FICO export | `IntegrationExportController` | `ExportSapFico(...)` | P4 | CSV generation, status transition |
| `integration/export.js` | GET | `/api/integration/export/history` | Export history | `IntegrationExportController` | `GetHistory(...)` | P1 | Read-only |
| `integration/status.js` | GET | `/api/integration/status` | Integration health | `IntegrationStatusController` | `GetStatus()` | P1 | Read-only |
| `integration/status.js` | GET | `/api/integration/file-log` | File processing log | `IntegrationStatusController` | `GetFileLog(...)` | P1 | Read-only |
| `integration/status.js` | GET | `/api/integration/audit-log` | Audit trail | `IntegrationStatusController` | `GetAuditLog(...)` | P1 | Read-only |
| `integration/status.js` | GET | `/api/integration/failed-records` | Failed records | `IntegrationStatusController` | `GetFailedRecords(...)` | P1 | Read-only |
| `integration/status.js` | POST | `/api/integration/failed-records/:id/skip` | Skip failed record | `IntegrationStatusController` | `SkipFailedRecord(int id)` | P3 | Status update |
| `integration/status.js` | POST | `/api/integration/trigger/sftp-poll` | Trigger SFTP poll | `IntegrationStatusController` | `TriggerSftpPoll()` | P4 | Launches background job |
| `integration/status.js` | POST | `/api/integration/trigger/hierarchy-sync` | Trigger hierarchy sync | `IntegrationStatusController` | `TriggerHierarchySync()` | P4 | Launches background job |
| `integration/status.js` | POST | `/api/integration/trigger/reprocess` | Reprocess failed records | `IntegrationStatusController` | `TriggerReprocess(...)` | P4 | Staging reprocessing |

## Background Jobs (Non-HTTP)

| Node File | Purpose | Target .NET Service | Priority | Notes |
|-----------|---------|-------------------|----------|-------|
| `jobs/sftpPoller.js` | SFTP file polling (Life Asia) | `SftpPollerJob : IJob` (Quartz) | P4 | Complex: SFTP + CSV parse + bulk upsert |
| `jobs/hierarchySync.js` | Hierarchy API sync | `HierarchySyncJob : IJob` (Quartz) | P4 | Complex: HTTP + delta sync + hierarchy rebuild |

---

## Summary by Priority

| Priority | Description | Route Count | Complexity |
|----------|-------------|-------------|------------|
| **P1** | Read-only endpoints | ~35 | Low — straightforward queries |
| **P2** | Config/CRUD endpoints + uploads | ~30 | Medium — validation, CSV parsing |
| **P3** | Workflow endpoints (approve, hold, payment) | ~10 | Medium-High — status transitions, business rules |
| **P4** | Calculation, export, integration, jobs | ~12 + 2 jobs | High — engine logic, external systems |
