# Wave 2 Route Scope

> Documents the exact Node.js routes migrated in Wave 2 of the .NET 10 backend migration.
> Wave 2 = Configuration/Setup endpoints (programs CRUD, KPI config, reference data).

---

## Programs Module (server/src/routes/programs.js)

| Route | HTTP | R/W | Purpose | Frontend Screen | Priority | Wave 2 Status |
|-------|------|-----|---------|-----------------|----------|---------------|
| `GET /api/programs` | GET | READ | List all programs | Scheme Management | P1 | ✅ Already in Wave 1 |
| `GET /api/programs/:id` | GET | READ | Get single program | Scheme Management | P1 | ✅ Already in Wave 1 |
| `GET /api/programs/:id/preview` | GET | READ | Scheme preview composite | Scheme Management wizard | P1 | ✅ Already in Wave 1 |
| `POST /api/programs` | POST | WRITE | Create program | Scheme Management wizard | P2 | ✅ Migrated |
| `PUT /api/programs/:id` | PUT | WRITE | Update program | Scheme Management wizard | P2 | ✅ Migrated |
| `PATCH /api/programs/:id/status` | PATCH | WRITE | Update status (DRAFT→ACTIVE→CLOSED) | Scheme Management | P2 | ✅ Migrated |
| `DELETE /api/programs/:id` | DELETE | WRITE | Delete program | Scheme Management | P2 | ✅ Migrated |
| `GET /api/programs/:id/summary` | GET | READ | Program summary (KPI count, agents, results) | Scheme Management detail | P2 | ✅ Migrated |

## KPI Config Module (server/src/routes/kpiConfig.js)

| Route | HTTP | R/W | Purpose | Frontend Screen | Priority | Wave 2 Status |
|-------|------|-----|---------|-----------------|----------|---------------|
| `GET /api/kpi-config/registry` | GET | READ | Full KPI registry with milestones + derived vars | KPI Config screen | P2 | ✅ Migrated |
| `POST /api/kpi-config/:id/validate` | POST | WRITE (validation) | Validate KPI config (milestones, payout links) | KPI Config screen | P2 | ✅ Migrated |
| `GET /api/kpi-config/:id/summary` | GET | READ | Single KPI summary with slabs/qualifying rules | KPI Config screen | P2 | ✅ Migrated |

## Org Domain Mapping (server/src/routes/orgDomainMapping.js)

| Route | HTTP | R/W | Purpose | Frontend Screen | Priority | Wave 2 Status |
|-------|------|-----|---------|-----------------|----------|---------------|
| `GET /api/org-domain-mapping` | GET | READ | Org hierarchy view (4 modes) | Org Domain Mapping | P1 | ✅ Already in Wave 1 |

> **Note**: orgDomainMapping.js has NO write endpoints in Node.js. It is purely read-only.
> No new writable org mapping endpoints were added in Wave 2.

## Auth Middleware Analysis

| Route Group | Node.js Auth | .NET Auth | Notes |
|-------------|-------------|-----------|-------|
| `/api/programs/*` | NONE | NONE | Programs routes have no auth middleware in Node.js |
| `/api/kpi-config/*` | `userAuth` | NONE (placeholder) | userAuth is a placeholder middleware in Node.js that passes all requests through |
| `/api/org-domain-mapping` | `userAuth` | NONE (placeholder) | Same as above |

## Reference Data / Dropdown APIs

After inspecting the Node.js routes, there are **no standalone reference data/dropdown endpoints**.
The React frontend gets its dropdown data from:
- Programs list (`GET /api/programs`)
- KPI registry (`GET /api/kpi-config/registry`)
- Org domain mapping (`GET /api/org-domain-mapping`) — provides channels, regions, branches, etc.

These are all already migrated.

## Not Migrated (Deferred)

The following configuration-adjacent routes were NOT migrated in Wave 2 as they don't serve
the Scheme Management, KPI Config, or Org Domain Mapping screens:

| Route | Reason for Deferral |
|-------|-------------------|
| `GET/POST/PUT/DELETE /api/kpis/*` | Individual KPI CRUD — used by deeper config flows, not primary screens |
| `GET/POST/PUT/DELETE /api/payouts/*` | Payout rule CRUD — similar |
| `GET/POST/PUT/DELETE /api/groups/*` | User group management — admin-only |
| `GET/POST /api/derived-variables` | Derived variable management — advanced config |
