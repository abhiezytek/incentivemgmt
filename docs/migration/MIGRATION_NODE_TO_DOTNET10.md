# Migration: Node.js → .NET 10

> Master summary of the complete Node.js Express → .NET 10 ASP.NET Core backend migration.
> Migration completed March 2026.

---

## Overview

| Metric | Value |
|--------|-------|
| **Source Platform** | Node.js 20 + Express 4 |
| **Target Platform** | .NET 10 + ASP.NET Core |
| **Endpoints Migrated** | 75+ |
| **Controllers** | 9 (.NET) replacing 26 Node route files |
| **Migration Waves** | 4 (all complete) |
| **Integration Tests** | 135 (all passing) |
| **Build Status** | Clean — 0 errors, 0 warnings |
| **Auth Status** | Hardened — JWT Bearer with role-based access |
| **Go-Live Blockers** | 0 |
| **Recommendation** | **GO for UAT and Production** |

---

## Architecture

### Before (Node.js)
```
server/
├── index.js              ← Express app entry + route registration
├── src/routes/            ← 26 route files (flat structure)
├── src/middleware/         ← userAuth (placeholder), systemAuth (full JWT)
├── src/engine/            ← Calculation engine
├── src/db/                ← Database queries + migrations
└── src/jobs/              ← Background jobs (cron-based)
```

### After (.NET 10)
```
backend-dotnet/
├── src/Incentive.Api/         ← Controllers, middleware, extensions
├── src/Incentive.Application/ ← Interfaces, DTOs, features
├── src/Incentive.Domain/      ← Constants, enums, exceptions
├── src/Incentive.Infrastructure/ ← Dapper repos, SQL, security
└── tests/                     ← Integration + regression tests
```

---

## Migration Waves

### Wave 1 — Read-Only Endpoints (7 endpoints, 5 controllers)
- Dashboard executive summary
- System status summary
- Notifications (list, mark read, mark all read)
- Org domain mapping
- Programs preview
- **27 integration tests**

### Wave 2 — Config Endpoints (8 endpoints, 2 controllers)
- Programs CRUD (create, update, status change, delete, summary)
- KPI Config (registry, validate, summary)
- Status transition validation preserving exact Node.js rules
- **30 integration tests**

### Wave 3 — Workflow Endpoints (10 endpoints, 2 controllers)
- Review Adjustments (list, detail, adjust, hold, release, batch-approve, audit)
- Exception Log (list, detail, resolve)
- Additive-only design preserved
- **40+ integration tests**

### Wave 4 — Complex Endpoints (50+ endpoints, 5+ controllers)
- Uploads (6 CSV upload endpoints with validation parity)
- Calculation engine (bulk run, single run, results)
- Incentive Results (stage summary, summary, list, approve, initiate payment, mark paid)
- Export (Oracle AP CSV, SAP FICO CSV, history)
- Payouts (rules + slabs CRUD)
- Integration (Penta, LifeAsia, status, triggers)
- Data (agents, products, groups, performance, derived variables, leaderboard, dashboard)

### Auth Hardening
- JWT Bearer authentication with HS256 signing
- `POST /api/auth/login` — user login with email/password
- `GET /api/auth/me` — current user profile
- Role-based `[Authorize]` on all controllers
- Roles: ADMIN, OPS, FINANCE, MANAGER, AGENT
- **20 integration tests**

---

## Key Parity Areas

| Domain | Status | Notes |
|--------|--------|-------|
| Calculation Logic | ✅ Full Parity | Persistency gates, KPI evaluation, rate lookup, MLM overrides |
| Upload Processing | ✅ Full Parity | CSV validation, column mapping, 20MB limit, duplicate detection |
| Export Generation | ✅ Full Parity | Oracle AP format, SAP FICO format, status transitions |
| Status Pipeline | ✅ Full Parity | DRAFT → APPROVED → INITIATED → PAID |
| Adjustment Workflow | ✅ Full Parity | Additive-only, virtual HOLD, batch approve |
| Auth/JWT | ✅ Enhanced | .NET auth exceeds Node (user login + role enforcement) |
| Background Jobs | ⚠️ Deferred | Trigger endpoints available; Quartz.NET/SFTP deferred |

---

## Deferred Items (Non-Blocking)

| Item | Workaround | Timeline |
|------|-----------|----------|
| Quartz.NET scheduler | External cron triggers API endpoints | Post-go-live |
| SSH.NET SFTP client | Manual CSV upload via API | Post-go-live |
| Rate limiting | Same as Node (none) | Post-go-live enhancement |
| CORS hardening | Currently AllowAnyOrigin (matches Node) | Post-go-live |

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `WAVE1_IMPLEMENTATION_SUMMARY.md` | Wave 1 details |
| `WAVE2_IMPLEMENTATION_SUMMARY.md` | Wave 2 details |
| `WAVE3_IMPLEMENTATION_SUMMARY.md` | Wave 3 details |
| `WAVE4_IMPLEMENTATION_SUMMARY.md` | Wave 4 details |
| `AUTH_PARITY_AND_HARDENING.md` | Auth implementation details |
| `AUTH_ROLE_POLICY_MATRIX.md` | Role/policy authorization matrix |
| `FINAL_PARITY_CLOSURE_REPORT.md` | Final parity verification |
| `FINAL_CUTOVER_READINESS_REPORT.md` | Cutover readiness assessment |
| `FINAL_GO_LIVE_BLOCKER_ASSESSMENT.md` | Blocker classification |
| `ROUTE_MIGRATION_MATRIX.md` | All routes mapped to .NET controllers |
| `FINAL_ROUTE_OWNERSHIP_MATRIX.md` | Route ownership (Node → .NET) |
| `FRONTEND_API_SWITCH_GUIDE.md` | How to switch frontend to .NET |
| `CUTOVER_EXECUTION_RUNBOOK.md` | Step-by-step cutover procedure |
| `DEPLOYMENT_SWITCH_RUNBOOK.md` | Deployment configuration |
| `POST_CUTOVER_MONITORING_CHECKLIST.md` | 7-day monitoring plan |
| `NODE_CLEANUP_CLASSIFICATION.md` | Node file cleanup plan |
| `NODE_FINAL_ROLE.md` | Node's role after cutover |
| `NODE_ARCHIVE_OR_DELETE_PLAN.md` | Node code archive plan |

---

## Frontend Switch

The React frontend uses RTK Query with a configurable base URL:
```javascript
baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

**To switch to .NET backend:**
1. Set `VITE_API_URL=http://localhost:5001/api` (or production URL)
2. Rebuild frontend: `cd client && npm run build`
3. No frontend code changes required — all API paths are relative

**To rollback:**
1. Set `VITE_API_URL` back to Node URL
2. Rebuild frontend

---

## Final Recommendation

### ✅ GO for UAT and Production

All business logic migrated with documented parity. No functional blockers exist.
Auth hardened beyond Node.js baseline. 135 integration tests passing.
Cutover is reversible via environment variable change.
