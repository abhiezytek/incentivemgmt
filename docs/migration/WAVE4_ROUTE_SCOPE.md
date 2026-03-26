# Wave 4 Route Scope

> Documents the exact Node.js routes migrated in Wave 4.
> Wave 4 = Calculation engine, uploads, exports, payouts, and integration endpoints.

## Upload Endpoints (server/src/routes/upload.js + entity routes)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 1 | `upload.js` | `POST /api/upload/policy-transactions` | POST | CSV upload of policy transactions | WRITE | None | Upload page — Policy Transactions tab | P4 |
| 2 | `upload.js` | `POST /api/upload/agents` | POST | CSV upload of agent master data | WRITE | None | Upload page — Agents tab | P4 |
| 3 | `upload.js` | `POST /api/upload/persistency` | POST | CSV upload of persistency data | WRITE | None | Upload page — Persistency tab | P4 |
| 4 | `upload.js` | `POST /api/upload/incentive-rates` | POST | CSV upload of incentive rates | WRITE | None | Upload page — Rates tab | P4 |
| 5 | `agents.js` | `POST /api/agents/upload` | POST | Bulk agent CSV upload (entity route) | WRITE | None | Agent management page | P4 |
| 6 | `policyTransactions.js` | `POST /api/policy-transactions/upload` | POST | Bulk policy CSV upload (entity route) | WRITE | None | Policy transaction page | P4 |
| 7 | `persistencyData.js` | `POST /api/persistency-data/upload` | POST | Bulk persistency CSV upload (entity route) | WRITE | None | Persistency data page | P4 |
| 8 | `products.js` | `POST /api/products/upload` | POST | Bulk product CSV upsert (entity route) | WRITE | None | Product management page | P4 |
| 9 | `incentiveRates.js` | `POST /api/incentive-rates/upload` | POST | Bulk rate CSV upload (entity route) | WRITE | None | Incentive rates page | P4 |
| 10 | `performance.js` | `POST /api/performance/upload` | POST | Bulk performance CSV upload (entity route) | WRITE | None | Performance data page | P4 |

## Calculation Endpoints (server/src/routes/calculate.js)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 11 | `calculate.js` | `POST /api/calculate/run` | POST | Bulk calculation for program/period | WRITE | Creates DRAFT results | Calculate page — Run button | P4 |
| 12 | `calculate.js` | `GET /api/calculate/results` | GET | Retrieve calculation results | READ | None | Calculate page — Results table | P4 |
| 13 | `calculate.js` | `POST /api/calculate/:pid/:uid/:period` | POST | Single-agent calculation | WRITE | Creates/updates single DRAFT | Agent detail — Recalculate | P4 |

## Incentive Results Endpoints (server/src/routes/incentiveResults.js)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 14 | `incentiveResults.js` | `GET /api/incentive-results` | GET | List results (paginated, filtered) | READ | None | Incentive Results page | P4 |
| 15 | `incentiveResults.js` | `GET /api/incentive-results/stage-summary` | GET | Stage counts (DRAFT/APPROVED/INITIATED/PAID) | READ | None | Pipeline status cards | P4 |
| 16 | `incentiveResults.js` | `GET /api/incentive-results/summary` | GET | Aggregated summary (pool, overrides, counts) | READ | None | Summary cards | P4 |
| 17 | `incentiveResults.js` | `POST /api/incentive-results/bulk-approve` | POST | Batch approve DRAFT results | WRITE | DRAFT → APPROVED | Bulk approve button | P4 |
| 18 | `incentiveResults.js` | `POST /api/incentive-results/:id/approve` | POST | Single approve | WRITE | DRAFT → APPROVED | Row-level approve | P4 |
| 19 | `incentiveResults.js` | `POST /api/incentive-results/initiate-payment` | POST | Initiate payment batch | WRITE | APPROVED → INITIATED | Initiate payment button | P4 |
| 20 | `incentiveResults.js` | `POST /api/incentive-results/mark-paid` | POST | Mark results as paid | WRITE | INITIATED → PAID | Mark paid button | P4 |

## Export Endpoints (server/src/routes/integration/export.js)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 21 | `integration/export.js` | `POST /api/integration/export/oracle-financials` | POST | Generate Oracle AP CSV export | WRITE | APPROVED → INITIATED | Export page — Oracle tab | P4 |
| 22 | `integration/export.js` | `POST /api/integration/export/sap-fico` | POST | Generate SAP FICO CSV export | WRITE | APPROVED → INITIATED | Export page — SAP tab | P4 |
| 23 | `integration/export.js` | `GET /api/integration/export/history` | GET | Export history log | READ | None | Export history table | P4 |

## Integration Endpoints (server/src/routes/integration/)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 24 | `integration/penta.js` | `POST /api/integration/penta/heartbeat` | POST | Penta health check | READ | None | Integration status page | P4 |
| 25 | `integration/penta.js` | `POST /api/integration/penta/policy-data` | POST | Receive policy data from Penta | WRITE | None | None (system-to-system) | P4 |
| 26 | `integration/lifeasia.js` | `POST /api/integration/lifeasia/notify` | POST | File arrival notification | WRITE | None | None (system-to-system) | P4 |
| 27 | `integration/lifeasia.js` | `GET /api/integration/lifeasia/last-file` | GET | Last processed file info | READ | None | Integration status page | P4 |
| 28 | `integration/status.js` | `GET /api/integration/status` | GET | Integration health overview | READ | None | Integration status page | P4 |
| 29 | `integration/status.js` | `GET /api/integration/file-log` | GET | File processing log | READ | None | Integration file log tab | P4 |
| 30 | `integration/status.js` | `GET /api/integration/audit-log` | GET | Integration audit trail | READ | None | Integration audit tab | P4 |
| 31 | `integration/status.js` | `GET /api/integration/failed-records` | GET | Failed record list | READ | None | Failed records tab | P4 |
| 32 | `integration/status.js` | `POST /api/integration/failed-records/:id/skip` | POST | Skip a failed record | WRITE | FAILED → SKIPPED | Failed records actions | P4 |
| 33 | `integration/status.js` | `POST /api/integration/trigger/sftp-poll` | POST | Trigger SFTP polling job | WRITE | None | Integration triggers | P4 |
| 34 | `integration/status.js` | `POST /api/integration/trigger/hierarchy-sync` | POST | Trigger hierarchy sync | WRITE | None | Integration triggers | P4 |
| 35 | `integration/status.js` | `POST /api/integration/trigger/reprocess` | POST | Reprocess failed records | WRITE | FAILED → reprocessed | Integration triggers | P4 |

## Data Endpoints (entity read + single create)

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 36 | `performance.js` | `POST /api/performance` | POST | Create single performance row | WRITE | None | Performance data page | P4 |

## Auth Endpoint

| # | Route File | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Dependency | Priority |
|---|-----------|----------|------|---------|-----|---------------|---------------------|----------|
| 37 | `auth/systemToken.js` | `POST /api/auth/system-token` | POST | Issue system JWT token | WRITE | None | System-to-system auth | P4 |

## Summary

| Category | Count |
|----------|-------|
| Upload endpoints | 10 |
| Calculation endpoints | 3 |
| Incentive results endpoints | 7 |
| Export endpoints | 3 |
| Integration endpoints | 12 |
| Data/performance endpoint | 1 |
| Auth endpoint | 1 |
| **Total Wave 4 endpoints** | **37** |

## Auth Middleware

Wave 4 routes use a mix of middleware:
- **Upload / Calculate / Results / Export**: `userAuth` middleware (placeholder pass-through, same as Waves 1–3)
- **Integration inbound (Penta, LifeAsia)**: `systemAuth` middleware — validates system JWT, checks `api_clients.is_active`
- **Auth system-token**: No middleware (issues tokens)

All endpoints support dual routing: `/api/` and `/api/v1/`.
