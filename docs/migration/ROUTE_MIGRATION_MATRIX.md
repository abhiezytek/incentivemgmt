# Route Migration Matrix

> Maps every Node.js route to its target .NET controller/action.
> Priority: P1 = Wave 1 (read-only), P2 = Wave 2 (config), P3 = Wave 3 (workflow), P4 = Wave 4 (calc/export/integration)
>
> **Wave 1 Status**: ✅ = Migrated to .NET | ⬜ = Not yet migrated
> **Wave 2 Status**: 🔵 = Migrated in Wave 2
> **Wave 3 Status**: 🟢 = Migrated in Wave 3
> **Wave 4 Status**: 🟠 = Migrated in Wave 4

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
| `kpis.js` | GET | `/api/kpis` | List KPIs | `DataController` | `GetKpis()` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | GET | `/api/kpis/:id` | Get KPI with milestones | `DataController` | `GetKpiById(int id)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | POST | `/api/kpis` | Create KPI | `DataController` | `CreateKpi(...)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | PUT | `/api/kpis/:id` | Update KPI | `DataController` | `UpdateKpi(int id, ...)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | DELETE | `/api/kpis/:id` | Delete KPI + milestones | `DataController` | `DeleteKpi(int id)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | GET | `/api/kpis/:kpiId/milestones` | List milestones | `DataController` | `GetMilestones(int kpiId)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | POST | `/api/kpis/:kpiId/milestones` | Create milestone | `DataController` | `CreateMilestone(int kpiId, ...)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | PUT | `/api/kpis/:kpiId/milestones/:mid` | Update milestone | `DataController` | `UpdateMilestone(int kpiId, int mid, ...)` | P4 | 🟠 Migrated Wave 4 |
| `kpis.js` | DELETE | `/api/kpis/:kpiId/milestones/:mid` | Delete milestone | `DataController` | `DeleteMilestone(int kpiId, int mid)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | GET | `/api/payouts` | List payout rules | `PayoutsController` | `GetAll()` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | GET | `/api/payouts/:id` | Get rule with slabs | `PayoutsController` | `GetById(int id)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | POST | `/api/payouts` | Create payout rule | `PayoutsController` | `Create(...)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | PUT | `/api/payouts/:id` | Update payout rule | `PayoutsController` | `Update(int id, ...)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | DELETE | `/api/payouts/:id` | Delete rule + slabs | `PayoutsController` | `Delete(int id)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | GET | `/api/payouts/:ruleId/slabs` | List slabs | `PayoutsController` | `GetSlabs(int ruleId)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | POST | `/api/payouts/:ruleId/slabs` | Create slab | `PayoutsController` | `CreateSlab(int ruleId, ...)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | PUT | `/api/payouts/:ruleId/slabs/:slabId` | Update slab | `PayoutsController` | `UpdateSlab(int ruleId, int slabId, ...)` | P4 | 🟠 Migrated Wave 4 |
| `payouts.js` | DELETE | `/api/payouts/:ruleId/slabs/:slabId` | Delete slab | `PayoutsController` | `DeleteSlab(int ruleId, int slabId)` | P4 | 🟠 Migrated Wave 4 |
| `groups.js` | GET | `/api/groups` | List user groups | `DataController` | `GetGroups()` | P4 | 🟠 Migrated Wave 4 |
| `groups.js` | GET | `/api/groups/:id` | Get group | `DataController` | `GetGroupById(int id)` | P4 | 🟠 Migrated Wave 4 |
| `groups.js` | POST | `/api/groups` | Create group | `DataController` | `CreateGroup(...)` | P4 | 🟠 Migrated Wave 4 |
| `groups.js` | PUT | `/api/groups/:id` | Update group | `DataController` | `UpdateGroup(int id, ...)` | P4 | 🟠 Migrated Wave 4 |
| `groups.js` | DELETE | `/api/groups/:id` | Delete group | `DataController` | `DeleteGroup(int id)` | P4 | 🟠 Migrated Wave 4 |
| `derivedVariables.js` | GET | `/api/derived-variables` | List derived variables | `DataController` | `GetDerivedVariables()` | P4 | 🟠 Migrated Wave 4 |
| `derivedVariables.js` | POST | `/api/derived-variables` | Create derived variable | `DataController` | `CreateDerivedVariable(...)` | P4 | 🟠 Migrated Wave 4 |

## Data / Read Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `agents.js` | GET | `/api/agents` | List agents (filter: channel, region, status) | `DataController` | `GetAgents(...)` | P4 | 🟠 Migrated Wave 4 |
| `agents.js` | POST | `/api/agents/upload` | Bulk CSV upload | `UploadController` | `UploadAgents(IFormFile)` | P4 | 🟠 Migrated Wave 4 |
| `policyTransactions.js` | GET | `/api/policy-transactions` | List transactions (paginated) | `DataController` | `GetPolicyTransactions(...)` | P4 | 🟠 Migrated Wave 4 |
| `policyTransactions.js` | POST | `/api/policy-transactions/upload` | Bulk CSV upload | `UploadController` | `UploadPolicyTransactions(IFormFile)` | P4 | 🟠 Migrated Wave 4 |
| `persistencyData.js` | GET | `/api/persistency-data` | List persistency data | `DataController` | `GetPersistencyData(...)` | P4 | 🟠 Migrated Wave 4 |
| `persistencyData.js` | POST | `/api/persistency-data/upload` | Bulk CSV upload | `UploadController` | `UploadPersistency(IFormFile)` | P4 | 🟠 Migrated Wave 4 |
| `products.js` | GET | `/api/products` | List products | `DataController` | `GetProducts(...)` | P4 | 🟠 Migrated Wave 4 |
| `products.js` | POST | `/api/products/upload` | Bulk CSV upsert | `UploadController` | `UploadProducts(IFormFile)` | P4 | 🟠 Migrated Wave 4 |
| `incentiveRates.js` | GET | `/api/incentive-rates` | List rates (joined with channels) | `DataController` | `GetIncentiveRates(...)` | P4 | 🟠 Migrated Wave 4 |
| `incentiveRates.js` | POST | `/api/incentive-rates/upload` | Bulk CSV upload | `UploadController` | `UploadIncentiveRates(IFormFile)` | P4 | 🟠 Migrated Wave 4 |
| `performance.js` | GET | `/api/performance` | List performance data | `DataController` | `GetPerformance(...)` | P4 | 🟠 Migrated Wave 4 |
| `performance.js` | POST | `/api/performance` | Create single row | `DataController` | `CreatePerformance(...)` | P4 | 🟠 Migrated Wave 4 |
| `performance.js` | POST | `/api/performance/upload` | Bulk CSV upload | `UploadController` | `UploadPerformance(IFormFile)` | P4 | 🟠 Migrated Wave 4 |

## Upload Routes (Centralized)

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|----------|-------|
| `upload.js` | POST | `/api/upload/policy-transactions` | CSV upload | `UploadController` | P4 | 🟠 Migrated Wave 4 |
| `upload.js` | POST | `/api/upload/agents` | CSV upload | `UploadController` | P4 | 🟠 Migrated Wave 4 |
| `upload.js` | POST | `/api/upload/persistency` | CSV upload | `UploadController` | P4 | 🟠 Migrated Wave 4 |
| `upload.js` | POST | `/api/upload/incentive-rates` | CSV upload | `UploadController` | P4 | 🟠 Migrated Wave 4 |

## Dashboard & Analytics Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `dashboard.js` | GET | `/api/dashboard/summary` | 7-section dashboard | `DataController` | `GetDashboardSummary(...)` | P4 | 🟠 Migrated Wave 4 |
| `executiveSummary.js` | GET | `/api/dashboard/executive-summary` | Executive KPI cards | `DashboardController` | `GetExecutiveSummary()` | P1 | ✅ Migrated Wave 1 |
| `leaderboard.js` | GET | `/api/leaderboard` | Agent ranking | `DataController` | `GetLeaderboard(...)` | P4 | 🟠 Migrated Wave 4 |

## Workflow Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `calculate.js` | POST | `/api/calculate/run` | Bulk calculation | `CalculationController` | `RunBulk(...)` | P4 | 🟠 Migrated Wave 4 — engine logic |
| `calculate.js` | GET | `/api/calculate/results` | Get calc results | `CalculationController` | `GetResults(...)` | P4 | 🟠 Migrated Wave 4 |
| `calculate.js` | POST | `/api/calculate/:pid/:uid/:period` | Single calc | `CalculationController` | `RunSingle(...)` | P4 | 🟠 Migrated Wave 4 — engine logic |
| `incentiveResults.js` | GET | `/api/incentive-results/stage-summary` | Stage counts | `IncentiveResultsController` | `GetStageSummary(...)` | P4 | 🟠 Migrated Wave 4 |
| `incentiveResults.js` | GET | `/api/incentive-results/summary` | Aggregated summary | `IncentiveResultsController` | `GetSummary(...)` | P4 | 🟠 Migrated Wave 4 |
| `incentiveResults.js` | GET | `/api/incentive-results` | List results | `IncentiveResultsController` | `GetAll(...)` | P4 | 🟠 Migrated Wave 4 |
| `incentiveResults.js` | POST | `/api/incentive-results/bulk-approve` | Batch approve | `IncentiveResultsController` | `BulkApprove(...)` | P4 | 🟠 Migrated Wave 4 — DRAFT→APPROVED, gate check |
| `incentiveResults.js` | POST | `/api/incentive-results/initiate-payment` | Initiate payment | `IncentiveResultsController` | `InitiatePayment(...)` | P4 | 🟠 Migrated Wave 4 — APPROVED→INITIATED |
| `incentiveResults.js` | POST | `/api/incentive-results/mark-paid` | Mark paid | `IncentiveResultsController` | `MarkPaid(...)` | P4 | 🟠 Migrated Wave 4 — INITIATED→PAID |
| `incentiveResults.js` | POST | `/api/incentive-results/:id/approve` | Single approve | `IncentiveResultsController` | `ApproveSingle(int id, ...)` | P4 | 🟠 Migrated Wave 4 |
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
| `auth/systemToken.js` | POST | `/api/auth/system-token` | Issue system JWT | `AuthController` | `GetSystemToken(...)` | P4 | 🟠 Stub — userAuth placeholder parity |

## Integration Routes

| Node Route File | HTTP Method | Endpoint | Purpose | Target .NET Controller | Target Action | Priority | Notes |
|-----------------|-------------|----------|---------|----------------------|---------------|----------|-------|
| `integration/penta.js` | POST | `/api/integration/penta/heartbeat` | Penta health check | `IntegrationController` | `PentaHeartbeat()` | P4 | 🟠 Migrated Wave 4 |
| `integration/penta.js` | POST | `/api/integration/penta/policy-data` | Receive policy data | `IntegrationController` | `ReceivePolicyData(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/lifeasia.js` | POST | `/api/integration/lifeasia/notify` | File notification | `IntegrationController` | `LifeAsiaNotify(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/lifeasia.js` | GET | `/api/integration/lifeasia/last-file` | Last processed file | `IntegrationController` | `GetLastFile()` | P4 | 🟠 Migrated Wave 4 |
| `integration/export.js` | POST | `/api/integration/export/oracle-financials` | Oracle AP export | `ExportController` | `ExportOracleFinancials(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/export.js` | POST | `/api/integration/export/sap-fico` | SAP FICO export | `ExportController` | `ExportSapFico(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/export.js` | GET | `/api/integration/export/history` | Export history | `ExportController` | `GetHistory(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | GET | `/api/integration/status` | Integration health | `IntegrationController` | `GetStatus()` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | GET | `/api/integration/file-log` | File processing log | `IntegrationController` | `GetFileLog(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | GET | `/api/integration/audit-log` | Audit trail | `IntegrationController` | `GetAuditLog(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | GET | `/api/integration/failed-records` | Failed records | `IntegrationController` | `GetFailedRecords(...)` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | POST | `/api/integration/failed-records/:id/skip` | Skip failed record | `IntegrationController` | `SkipFailedRecord(int id)` | P4 | 🟠 Migrated Wave 4 |
| `integration/status.js` | POST | `/api/integration/trigger/sftp-poll` | Trigger SFTP poll | `IntegrationController` | `TriggerSftpPoll()` | P4 | 🟠 Trigger only — SFTP client deferred |
| `integration/status.js` | POST | `/api/integration/trigger/hierarchy-sync` | Trigger hierarchy sync | `IntegrationController` | `TriggerHierarchySync()` | P4 | 🟠 Trigger only — HTTP client deferred |
| `integration/status.js` | POST | `/api/integration/trigger/reprocess` | Reprocess failed records | `IntegrationController` | `TriggerReprocess(...)` | P4 | 🟠 Migrated Wave 4 |

## Background Jobs (Non-HTTP)

| Node File | Purpose | Target .NET Service | Priority | Notes |
|-----------|---------|-------------------|----------|-------|
| `jobs/sftpPoller.js` | SFTP file polling (Life Asia) | `SftpPollerJob : IJob` (Quartz) | P4 | Complex: SFTP + CSV parse + bulk upsert |
| `jobs/hierarchySync.js` | Hierarchy API sync | `HierarchySyncJob : IJob` (Quartz) | P4 | Complex: HTTP + delta sync + hierarchy rebuild |

---

## Summary by Priority

| Priority | Description | Route Count | Complexity |
|----------|-------------|-------------|------------|
| **P1** | Read-only endpoints | ~35 | Low — straightforward queries | ✅/🟠 All migrated |
| **P2** | Config/CRUD endpoints + uploads | ~30 | Medium — validation, CSV parsing | 🔵/🟠 All migrated |
| **P3** | Workflow endpoints (approve, hold, payment) | ~10 | Medium-High — status transitions, business rules | 🟢/🟠 All migrated |
| **P4** | Calculation, export, integration, jobs | ~12 + 2 jobs | High — engine logic, external systems | 🟠 All migrated (jobs deferred to triggers) |

### Overall Migration Status: ✅ ALL WAVES COMPLETE
- Wave 1: ✅ 7 endpoints migrated
- Wave 2: 🔵 8 endpoints migrated
- Wave 3: 🟢 10 endpoints migrated
- Wave 4: 🟠 50+ endpoints migrated
- **Total: 75+ endpoints across 15 controllers**
