# Node.js Backend Inventory

> Generated as part of .NET 10 migration planning pass.
> Source of truth: `server/` directory — all paths relative to repository root.

---

## 1. Server Entry Point

| File | Purpose |
|------|---------|
| `server/index.js` | Express app bootstrap, route registration, middleware stack, background job startup |
| `server/package.json` | Dependencies: express 4.21, pg 8.13, jsonwebtoken, multer, csv-parse, node-cron, ssh2-sftp-client, bcryptjs, swagger-jsdoc/swagger-ui-express |

### Middleware Stack (applied in order)
1. `cors()` — open CORS (all origins)
2. `express.json()` — JSON body parsing
3. `maskResponse` — PII policy-number masking (skips export paths)

### Server Startup Side Effects
- `startSftpPollers()` — cron-based SFTP file polling (Life Asia AS400)
- `startHierarchySync()` — cron-based hierarchy API sync

---

## 2. Route Files — Complete List

### 2.1 Core Business Routes (no auth middleware on mount)

| Route File | Mount Path (v1) | Mount Path (unversioned) | Endpoints |
|------------|-----------------|--------------------------|-----------|
| `routes/programs.js` | `/api/v1/programs` | `/api/programs` | GET /, GET /:id, POST /, PUT /:id, PATCH /:id/status, DELETE /:id, GET /:id/summary, GET /:id/preview |
| `routes/kpis.js` | `/api/v1/kpis` | `/api/kpis` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id, GET /:id/milestones, POST /:id/milestones, PUT /:id/milestones/:mid, DELETE /:id/milestones/:mid |
| `routes/payouts.js` | `/api/v1/payouts` | `/api/payouts` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id, GET /:id/slabs, POST /:id/slabs, PUT /:id/slabs/:sid, DELETE /:id/slabs/:sid |
| `routes/calculate.js` | `/api/v1/calculate` | `/api/calculate` | POST /run, GET /results, POST /:programId/:userId/:period |
| `routes/groups.js` | `/api/v1/groups` | `/api/groups` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id, member CRUD |
| `routes/incentiveResults.js` | `/api/v1/incentive-results` | `/api/incentive-results` | GET /stage-summary, GET /summary, GET /, POST /bulk-approve, POST /initiate-payment, POST /mark-paid, POST /:id/approve |
| `routes/leaderboard.js` | `/api/v1/leaderboard` | `/api/leaderboard` | GET / |
| `routes/dashboard.js` | `/api/v1/dashboard` | `/api/dashboard` | GET /summary |
| `routes/performance.js` | `/api/v1/performance` | `/api/performance` | GET /, POST /, POST /upload |
| `routes/derivedVariables.js` | `/api/v1/derived-variables` | `/api/derived-variables` | GET /, POST / |
| `routes/policyTransactions.js` | `/api/v1/policy-transactions` | `/api/policy-transactions` | GET /, POST /upload |
| `routes/agents.js` | `/api/v1/agents` | `/api/agents` | GET /, POST /upload |
| `routes/persistencyData.js` | `/api/v1/persistency-data` | `/api/persistency-data` | GET /, POST /upload |
| `routes/products.js` | `/api/v1/products` | `/api/products` | GET /, POST /upload |
| `routes/incentiveRates.js` | `/api/v1/incentive-rates` | `/api/incentive-rates` | GET /, POST /upload |
| `routes/upload.js` | `/api/v1/upload` | `/api/upload` | POST /policy-transactions, POST /agents, POST /persistency, POST /incentive-rates |

### 2.2 Routes Protected by `userAuth` Middleware

| Route File | Mount Path (v1) | Endpoints |
|------------|-----------------|-----------|
| `routes/reviewAdjustments.js` | `/api/v1/review-adjustments` | GET /, GET /:id, POST /:id/adjust, POST /:id/hold, POST /:id/release, POST /batch-approve, GET /:id/audit |
| `routes/exceptionLog.js` | `/api/v1/exception-log` | GET /, GET /:id, POST /:id/resolve |
| `routes/executiveSummary.js` | `/api/v1/dashboard` | GET /executive-summary |
| `routes/systemStatus.js` | `/api/v1/system-status` | GET /summary |
| `routes/notifications.js` | `/api/v1/notifications` | GET /, POST /:id/read, POST /mark-all-read |
| `routes/orgDomainMapping.js` | `/api/v1/org-domain-mapping` | GET / |
| `routes/kpiConfig.js` | `/api/v1/kpi-config` | GET /registry, POST /:id/validate, GET /:id/summary |

### 2.3 Routes Protected by `systemAuth` Middleware

| Route File | Mount Path (v1) | Endpoints |
|------------|-----------------|-----------|
| `routes/integration/penta.js` | `/api/v1/integration/penta` | POST /heartbeat, POST /policy-data |
| `routes/integration/lifeasia.js` | `/api/v1/integration/lifeasia` | POST /notify, GET /last-file |

### 2.4 Routes Protected by `userAuth` (Integration)

| Route File | Mount Path (v1) | Endpoints |
|------------|-----------------|-----------|
| `routes/integration/export.js` | `/api/v1/integration/export` | POST /oracle-financials, POST /sap-fico, GET /history |
| `routes/integration/status.js` | `/api/v1/integration` | GET /status, GET /file-log, GET /audit-log, GET /failed-records, POST /failed-records/:id/skip, POST /trigger/sftp-poll, POST /trigger/hierarchy-sync, POST /trigger/reprocess |

### 2.5 Auth Routes

| Route File | Mount Path (v1) | Endpoints |
|------------|-----------------|-----------|
| `routes/auth/systemToken.js` | `/api/v1/auth` | POST /system-token |

---

## 3. Middleware

| File | Purpose | Applied To |
|------|---------|------------|
| `middleware/systemAuth.js` | JWT Bearer verification → `api_clients` lookup → endpoint ACL → updates `last_used_at` | Penta, LifeAsia integration routes |
| `middleware/userAuth.js` | **Placeholder** — passes all requests through. Intended for future user session auth. | Review, exceptions, export, notifications, system status, org mapping, kpi-config |
| `middleware/maskResponse.js` | Intercepts `res.json()`, masks policy numbers via `dataMask.js`. Skips `/api/integration/export/*`. Uses 5-min cached DB lookup for `POLICY_MASK_ENABLED`. | Global (all routes) |

---

## 4. Database Layer

| File | Purpose |
|------|---------|
| `db/pool.js` | PostgreSQL connection pool (`pg.Pool`). Reads `DB_HOST/PORT/NAME/USER/PASSWORD` from env. Exports `query(text, params)` and `pool`. |
| `db/queryHelper.js` | Generic CRUD helpers: `findAll(table, conditions, orderBy)`, `findById(table, id)`, `insertRow(table, data)`, `updateRow(table, id, data)`, `deleteRow(table, id)`. All use parameterized queries with SQL identifier validation. |

### Migrations (8 files)

| File | Purpose |
|------|---------|
| `001_master_schema.sql` | Core tables: channels, incentive_programs, user_groups, group_members, kpi_definitions, kpi_milestones, payout_rules, payout_slabs, payout_qualifying_rules, derived_variables, performance_data, incentive_results, users, user_sessions |
| `002_insurance_schema.sql` | Insurance tables: ins_products, ins_agents, ins_regions, ins_policy_transactions, ins_incentive_rates, ins_persistency_data, ins_persistency_gates, ins_mlm_override_rates, ins_agent_kpi_summary, ins_incentive_results |
| `002_add_team_override_pct.sql` | Adds `team_override_pct` column to payout_rules |
| `003_integration_schema.sql` | Integration tables: api_clients, integration_audit_log, outbound_files, system_config |
| `003_payout_disbursement_log.sql` | Payout disbursement tracking |
| `004_staging_tables.sql` | ETL staging: stg_policy_transactions, failed_record_staging, file_processing_log |
| `005_outbound_file_log.sql` | Export file audit log |
| `006_additive_tables.sql` | Additive-only: incentive_adjustments, incentive_review_actions, operational_exceptions, notification_events |

### Seeds (3 files)

| File | Purpose |
|------|---------|
| `001_master_seed.sql` | Core reference data (channels, programs) |
| `002_agents_seed.sql` | Sample agent hierarchy |
| `003_program_seed.sql` | Sample incentive program with KPIs, rates |

### Functions (1 file)

| File | Purpose |
|------|---------|
| `functions/compute_agent_kpi.sql` | PL/pgSQL function that computes `ins_agent_kpi_summary` from `ins_policy_transactions` for a given agent/program/period |

---

## 5. Calculation Engines

| File | Purpose | Tables Read | Tables Written |
|------|---------|-------------|----------------|
| `engine/calculateIncentive.js` | Generic incentive calculation: KPI achievement → milestone matching → slab evaluation → qualifying gates → team rollup | `kpi_definitions`, `performance_data`, `kpi_milestones`, `payout_rules`, `payout_slabs`, `payout_qualifying_rules`, `group_members`, `incentive_results` | `incentive_results` |
| `engine/insuranceCalcEngine.js` | Insurance-specific: calls `compute_agent_kpi()`, product-wise NB/renewal incentive, persistency gate check, MLM override calculation | `ins_agent_kpi_summary`, `ins_incentive_rates`, `ins_products`, `ins_persistency_gates`, `ins_agents`, `ins_mlm_override_rates`, `ins_incentive_results` | `ins_incentive_results` (UPSERT) |

### Key Calculation Concepts
- **Milestone matching**: LEFT_INCLUSIVE_BETWEEN, BETWEEN, GTE, LTE
- **Slab operators**: GTE, LTE, BETWEEN, EQ
- **Incentive operators**: MULTIPLY, FLAT, PERCENTAGE_OF
- **Rate types** (insurance): PERCENTAGE_OF_PREMIUM, FLAT_PER_POLICY, PERCENTAGE_OF_APE
- **Persistency gates**: 13M, 25M, 37M, 49M, 61M with consequences BLOCK_INCENTIVE, REDUCE_BY_PCT, CLAWBACK_PCT
- **MLM levels**: L1, L2, L3 override with PERCENTAGE_OF_DOWNLINE_INCENTIVE or FLAT_PER_POLICY
- **Status pipeline**: DRAFT → APPROVED → INITIATED → PAID (unidirectional)

---

## 6. Utilities

| File | Purpose |
|------|---------|
| `utils/errorCodes.js` | 31 error codes in 5 categories: AUTH (7), VAL (10), BUS (10), INT (9), CALC (5). Helper `apiError(code, details)` returns `{ success: false, error, code, details }`. |
| `utils/dataMask.js` | Policy number masking: first 3 + asterisks + last 3. `shouldMask()` reads `POLICY_MASK_ENABLED` from `system_config` with 5-min cache. Recursive `maskPolicyNumberInObject()`. |
| `utils/csvParser.js` | CSV parsing with `csv-parse`: normalizes headers, skips empty rows, auto-converts date-like columns to ISO format. |
| `utils/bulkInsert.js` | PostgreSQL bulk insert using `UNNEST` arrays. `bulkInsert(table, columns, rows)` and `bulkInsertTyped(table, columns, typeMap, rows)`. SQL identifier validation. |

---

## 7. Background Jobs

| File | Purpose | Schedule | Trigger |
|------|---------|----------|---------|
| `jobs/sftpPoller.js` | Polls Life Asia AS400 SFTP for CSV files, parses (converts DDMMYYYY→YYYY-MM-DD), bulk upserts to `ins_policy_transactions` / `ins_agents` / `ins_persistency_data`, logs to `file_processing_log` | Cron (daily) | Also via POST `/api/integration/trigger/sftp-poll` |
| `jobs/hierarchySync.js` | Syncs agent hierarchy from external API, delta sync using last sync date, bulk upserts agents, resolves parent relationships, rebuilds `hierarchy_path` | Cron (21:00 UTC) | Also via POST `/api/integration/trigger/hierarchy-sync` |

---

## 8. Configuration / Environment Variables

| Variable | Purpose | Used By |
|----------|---------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection | `db/pool.js` |
| `PORT` | Server port (default 5000) | `server/index.js` |
| `JWT_SECRET` | User JWT signing (not yet used — userAuth is placeholder) | — |
| `SYSTEM_JWT_SECRET` | System-to-system JWT signing/verification | `middleware/systemAuth.js`, `routes/auth/systemToken.js` |
| `SFTP_HOST`, `SFTP_PORT`, `SFTP_USERNAME`, `SFTP_PASSWORD`, `SFTP_BASE_PATH` | Life Asia AS400 SFTP connection | `jobs/sftpPoller.js` |
| `HIERARCHY_API_BASE`, `HIERARCHY_API_CLIENT_ID`, `HIERARCHY_API_CLIENT_SECRET` | External hierarchy API | `jobs/hierarchySync.js` |
| `PENTA_API_BASE`, `PENTA_CLIENT_ID`, `PENTA_CLIENT_SECRET` | Penta integration | `routes/integration/penta.js` |
| `SAP_COMPANY_CODE` | SAP FICO export field | `routes/integration/export.js` |
| `ORACLE_OPERATING_UNIT` | Oracle AP export field | `routes/integration/export.js` |

---

## 9. Response Shape Patterns

### Success Response
```json
{ "success": true, "data": { ... }, "message": "optional" }
```
Note: Not all routes wrap in `{ success, data }`. Many return raw arrays or objects directly.

### Error Response (standardized)
```json
{ "success": false, "error": "Human-readable message", "code": "AUTH_001", "details": null }
```

### Error Response (legacy — some routes still use)
```json
{ "error": "Validation failed", "details": "..." }
```

---

## 10. Auth Patterns

| Pattern | Implementation | Routes |
|---------|----------------|--------|
| **System JWT** | Bearer token → verify with `SYSTEM_JWT_SECRET` → `api_clients` lookup → endpoint ACL → `req.apiClient` | Penta, LifeAsia |
| **User Auth** | **Placeholder** — passes all requests. Will use session cookies or user JWT. | Review, export, exceptions, notifications, system-status, org-mapping, kpi-config |
| **No Auth** | All core routes (programs, KPIs, payouts, calculate, dashboard, agents, upload, etc.) | Majority of routes |

---

## 11. Status Models

### Incentive Result Status Pipeline
```
DRAFT → APPROVED → INITIATED → PAID
```
- Transitions are **unidirectional** — no rollback
- HOLD is a **virtual status** (exists as adjustment records, not in the status column)
- Gate-failed results cannot be approved (persistency_gate_passed must be TRUE)

### Program Status
```
DRAFT → ACTIVE → CLOSED
```
- Only DRAFT programs can be deleted
- Only ACTIVE programs can be calculated

### Exception Status
```
OPEN → INVESTIGATING → RESOLVED | DISMISSED
```

---

## 12. Tests

| File | Test Count | Type | What It Tests |
|------|------------|------|---------------|
| `tests/e2e/fullFlowTest.js` | 46 (T01-T46) | End-to-end | Full workflow: auth → programs → KPIs → calculate → approve → export |
| `tests/regression/calculationRegressionTest.js` | 36 (R01-R36) | Regression | Baseline values, additive isolation, status/export verification |
| `tests/regression/calculationQueryAudit.sql` | N/A | SQL audit | Direct DB queries for calculation verification |

Both test suites run against a live server at `BASE_URL` (default `http://localhost:5000/api`).

---

## 13. External Integrations

| System | Direction | Protocol | Entry Point |
|--------|-----------|----------|-------------|
| Life Asia AS400 | Inbound | SFTP (CSV files) | `jobs/sftpPoller.js` + `routes/integration/lifeasia.js` (webhook) |
| KGILS Penta | Inbound | REST API (POST) | `routes/integration/penta.js` |
| Hierarchy API | Inbound | REST API (GET, paginated) | `jobs/hierarchySync.js` |
| Oracle Financials | Outbound | CSV file generation | `routes/integration/export.js` (oracle-financials) |
| SAP FICO | Outbound | CSV file generation | `routes/integration/export.js` (sap-fico) |

---

## 14. Existing .NET Migration Attempt

An `api/` directory exists with a partial .NET 10 migration containing:
- 16 controllers (missing: ReviewAdjustments, ExceptionLog, ExecutiveSummary, SystemStatus, Notifications, OrgDomainMapping, KpiConfig, Auth/SystemToken, all 4 Integration controllers)
- 2 engine services (CalculateIncentiveService, InsuranceCalcEngineService)
- 4 middleware (ExceptionHandler, MaskResponse, SystemAuth, UserAuth)
- Data layer (DbConnectionFactory, QueryHelper with Dapper)
- Utils (BulkInsertUtil, CsvParserUtil, DataMask, ErrorCodes)

**Assessment**: Flat project structure (no layered architecture), missing 12+ controllers, no background jobs, no test projects, no solution file. This serves as useful reference code but does not match the target architecture.
