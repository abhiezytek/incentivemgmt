# API Changelog

## Versioning Strategy

| Item | Policy |
|------|--------|
| **Current version** | `v1.1.0` |
| **Scheme** | URL prefix — `/api/v1/...` |
| **Breaking changes** | Bump **major** version (v2, v3 …) |
| **New endpoints** | Bump **minor** version (v1.1.0, v1.2.0 …) |
| **Bug fixes** | Bump **patch** version (v1.0.1, v1.0.2 …) |
| **Backward compatibility** | Unversioned `/api/...` always aliases the latest stable version |

---

## v1.1.0 — March 2026

### Added

#### Review Adjustments (`/api/review-adjustments`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/review-adjustments` | List results with adjustments for review |
| GET | `/api/review-adjustments/:id` | Get result detail with adjustments and audit trail |
| POST | `/api/review-adjustments/:id/adjust` | Apply manual adjustment (additive) |
| POST | `/api/review-adjustments/:id/hold` | Place result on hold (additive) |
| POST | `/api/review-adjustments/:id/release` | Release held result (additive) |
| POST | `/api/review-adjustments/batch-approve` | Batch approve results with audit trail |
| GET | `/api/review-adjustments/:id/audit` | Get full audit trail for result |

#### Exception Log (`/api/exception-log`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/exception-log` | List operational exceptions with filtering |
| GET | `/api/exception-log/:id` | Get single exception detail |
| POST | `/api/exception-log/:id/resolve` | Resolve or dismiss exception |

#### Executive Dashboard (`/api/dashboard/executive-summary`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard/executive-summary` | Executive KPI cards, alerts, pipeline, channel performance |

#### System Status (`/api/system-status`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/system-status/summary` | Database, sync, integration, and file processing health |

#### Notifications (`/api/notifications`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/notifications` | List notification events |
| POST | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/notifications/mark-all-read` | Mark all notifications as read |

#### Org & Domain Mapping (`/api/org-domain-mapping`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/org-domain-mapping` | Hierarchical org mapping by dimension |

#### KPI Config Helpers (`/api/kpi-config`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/kpi-config/registry` | Full KPI registry with milestones and programs |
| POST | `/api/kpi-config/:id/validate` | Validate KPI configuration |
| GET | `/api/kpi-config/:id/summary` | KPI summary with slabs and qualifying rules |

#### Program Preview (`/api/programs/:id/preview`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/programs/:id/preview` | Full program preview with KPIs, rules, stats |

### Database Changes
- Added migration `006_additive_tables.sql` creating 4 additive tables:
  - `incentive_adjustments` — manual adjustments stored separately from calculated results
  - `incentive_review_actions` — audit trail for review actions
  - `operational_exceptions` — data quality and integration exception log
  - `notification_events` — dashboard notification events
- **No existing tables modified** — all changes are additive only
- No ALTER, DROP, triggers, or stored procedure changes

### Testing & Audit
- Added `calculationRegressionTest.js` — 36 regression tests confirming calculation integrity
- Added `calculationQueryAudit.sql` — SQL audit queries for regression validation
- Post-change calculation audit confirms zero impact to base calculation engine
- UAT package added under `/docs/UAT/` with 13 test artifacts

### Architecture Notes
- All new routes registered under both `/api/v1/` and `/api/` prefixes
- New routes use `userAuth` middleware (except integration routes using `systemAuth`)
- Additive modules sit around the calculation engine, not inside it
- Core result tables, rate lookup, persistency logic, and override logic unchanged
- Export eligibility continues to use `ins_incentive_results` status directly

---

## v1.0.0 — Initial Release (March 2026)

### Auth `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/system-token` | Issue system-to-system JWT (client_id + client_secret) |

### Programs `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programs` | List all incentive programs |
| GET | `/programs/:id` | Get single program by ID |
| POST | `/programs` | Create a new program |
| PUT | `/programs/:id` | Update an existing program |
| DELETE | `/programs/:id` | Delete a program |

### KPIs `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kpis` | List all KPI definitions |
| GET | `/kpis/:id` | Get KPI by ID (includes milestones) |
| POST | `/kpis` | Create a new KPI |
| PUT | `/kpis/:id` | Update an existing KPI |
| DELETE | `/kpis/:id` | Delete a KPI |
| GET | `/kpis/:kpiId/milestones` | List milestones for a KPI |
| POST | `/kpis/:kpiId/milestones` | Create a milestone |
| PUT | `/kpis/:kpiId/milestones/:milestoneId` | Update a milestone |
| DELETE | `/kpis/:kpiId/milestones/:milestoneId` | Delete a milestone |

### Payouts `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payouts` | List all payout rules |
| GET | `/payouts/:id` | Get payout rule by ID (includes slabs) |
| POST | `/payouts` | Create a new payout rule |
| PUT | `/payouts/:id` | Update a payout rule |
| DELETE | `/payouts/:id` | Delete a payout rule and its slabs |
| GET | `/payouts/:ruleId/slabs` | List slabs for a payout rule |
| POST | `/payouts/:ruleId/slabs` | Create a slab |
| PUT | `/payouts/:ruleId/slabs/:slabId` | Update a slab |
| DELETE | `/payouts/:ruleId/slabs/:slabId` | Delete a slab |

### Upload `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/policy-transactions` | Upload policy transactions CSV |
| POST | `/upload/agents` | Upload agents CSV |
| POST | `/upload/persistency` | Upload persistency data CSV |
| POST | `/upload/incentive-rates` | Upload incentive rates CSV |

### Calculate `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/calculate/run` | Run bulk incentive calculation for a program |
| GET | `/calculate/results` | Get calculation results by program + period |
| POST | `/calculate/:programId/:userId/:period` | Calculate incentive for a single user |

### Groups `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | List all user groups |
| GET | `/groups/:id` | Get group by ID (includes members) |
| POST | `/groups` | Create a group |
| PUT | `/groups/:id` | Update a group |
| DELETE | `/groups/:id` | Delete a group |
| GET | `/groups/:groupId/members` | List members of a group |
| POST | `/groups/:groupId/members` | Add a member |
| PUT | `/groups/:groupId/members/:memberId` | Update a member |
| DELETE | `/groups/:groupId/members/:memberId` | Remove a member |

### Incentive Results `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/incentive-results/stage-summary` | Pipeline stage counts (DRAFT → PAID) |
| GET | `/incentive-results/summary` | Channel-level aggregate totals |
| GET | `/incentive-results` | List results with filters |
| POST | `/incentive-results/bulk-approve` | Bulk approve DRAFT → APPROVED |
| POST | `/incentive-results/initiate-payment` | APPROVED → INITIATED + create disbursement log |
| POST | `/incentive-results/mark-paid` | INITIATED → PAID |
| POST | `/incentive-results/:id/approve` | Approve a single result |

### Leaderboard `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard` | Ranked agents by total incentive for program + period |

### Dashboard `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary` | Full dashboard payload (KPIs, channels, products, top agents, programs, pipeline, activity) |

### Performance `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/performance` | Get performance data with filters |
| POST | `/performance` | Insert single performance row |
| POST | `/performance/upload` | Bulk insert performance data |

### Derived Variables `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/derived-variables` | List all derived variables |
| POST | `/derived-variables` | Create a derived variable |

### Policy Transactions `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/policy-transactions` | Get transactions with filters |
| POST | `/policy-transactions/upload` | Bulk insert transactions |

### Agents `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List agents with filters |
| POST | `/agents/upload` | Bulk insert/update agents |

### Persistency Data `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/persistency-data` | Get persistency data with filters |
| POST | `/persistency-data/upload` | Bulk insert persistency data |

### Products `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get products with filters |
| POST | `/products/upload` | Bulk upsert products |

### Incentive Rates `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/incentive-rates` | Get rates with filters |
| POST | `/incentive-rates/upload` | Bulk insert rates |

### Integration — Penta (inbound) `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/integration/penta/heartbeat` | Health check from Penta system |
| POST | `/integration/penta/policy-data` | Receive policy data from Penta |

### Integration — Life Asia (inbound) `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/integration/lifeasia/notify` | SFTP file-drop notification webhook |
| GET | `/integration/lifeasia/last-file` | Last processed Life Asia file info |

### Integration — Export (outbound) `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/integration/export/oracle-financials` | Generate Oracle AP CSV export |

### Integration — Status & Triggers `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/integration/status` | Connection health for all systems |
| GET | `/integration/file-log` | Recent file processing log |
| GET | `/integration/audit-log` | Recent API call audit log |
| GET | `/integration/failed-records` | Failed/error records from staging |
| POST | `/integration/failed-records/:id/skip` | Skip a failed record |
| POST | `/integration/trigger/sftp-poll` | Manually trigger SFTP poll |
| POST | `/integration/trigger/hierarchy-sync` | Manually trigger hierarchy sync |
| POST | `/integration/trigger/reprocess` | Reprocess failed staging records |

### Utility `NEW`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/docs` | Swagger UI documentation page |
| GET | `/docs.json` | Raw OpenAPI JSON specification |

---

## How to Add a New API Version

When you need to introduce **breaking changes**, follow these steps:

1. **Create versioned route folder**
   ```
   mkdir server/src/routes/v2/
   ```

2. **Copy affected route files** from `server/src/routes/` into `v2/`
   ```
   cp server/src/routes/programs.js server/src/routes/v2/programs.js
   ```

3. **Make changes in v2 routes only** — never modify v1 routes for breaking changes.

4. **Register both versions in `server/index.js`**
   ```js
   import programsV2Router from './src/routes/v2/programs.js';

   // v1 stays unchanged
   app.use('/api/v1/programs', programsRouter);
   app.use('/api/programs',    programsRouter);   // backward compat

   // v2 new behavior
   app.use('/api/v2/programs', programsV2Router);
   ```

5. **Update Swagger config** — add a v2 server entry in `server/src/config/swagger.js` and ensure v2 route files have `@swagger` JSDoc annotations.

6. **Update this CHANGELOG** — add a new `## v2.0.0` section above v1.0.0 with all changes documented.

7. **Update the unversioned alias** when v2 becomes the default:
   ```js
   app.use('/api/programs', programsV2Router);  // alias now points to v2
   ```
