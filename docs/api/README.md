# API Documentation

> Insurance Incentive Management System — API v1.0.0

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/abhiezytek/incentivemgmt.git
cd incentivemgmt

# 2. Set up environment variables
cp .env.example server/.env
# Edit server/.env — at minimum set:
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
#   JWT_SECRET, SYSTEM_JWT_SECRET

# 3. Install dependencies
cd server && npm install

# 4. Create the database and run migrations
psql -U postgres -c "CREATE DATABASE incentivemgmt;"
psql -U postgres -d incentivemgmt -f src/db/migrations/001_master_schema.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/002_insurance_schema.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/002_add_team_override_pct.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/003_integration_schema.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/003_payout_disbursement_log.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/004_staging_tables.sql
psql -U postgres -d incentivemgmt -f src/db/migrations/005_outbound_file_log.sql

# 5. Start the server
npm start

# 6. Open Swagger UI
open http://localhost:5000/api/docs

# 7. Make your first API call
curl http://localhost:5000/api/health
# → {"status":"ok"}
```

---

## Files in This Folder

| File | Description |
|------|-------------|
| [openapi.yaml](openapi.yaml) | Machine-readable OpenAPI 3.0 specification |
| [API_REFERENCE.md](API_REFERENCE.md) | Human-readable full endpoint reference |
| [ERROR_CODES.md](ERROR_CODES.md) | All error codes with resolution steps |
| [CHANGELOG.md](CHANGELOG.md) | API version history and versioning strategy |
| [IncentiveSystem.postman_collection.json](IncentiveSystem.postman_collection.json) | Postman collection |
| [POSTMAN_GUIDE.md](POSTMAN_GUIDE.md) | How to import and use the Postman collection |
| [environments/](environments/) | Postman environment files (local / UAT / prod) |
| [INBOUND_PENTA_API.md](INBOUND_PENTA_API.md) | KGILS Penta inbound integration spec |
| [INBOUND_LIFEASIA_FILE.md](INBOUND_LIFEASIA_FILE.md) | Life Asia AS400 SFTP file spec |
| [INBOUND_HIERARCHY_API.md](INBOUND_HIERARCHY_API.md) | Hierarchy system integration spec |
| [OUTBOUND_SAP_FICO.md](OUTBOUND_SAP_FICO.md) | SAP FICO payment file spec |
| [OUTBOUND_ORACLE_FINANCIALS.md](OUTBOUND_ORACLE_FINANCIALS.md) | Oracle Financials payment file spec |

---

## Live Documentation

When the server is running:

| Resource | URL |
|----------|-----|
| Swagger UI | <http://localhost:5000/api/docs> |
| Raw JSON spec | <http://localhost:5000/api/docs.json> |
| Health check | <http://localhost:5000/api/health> |

All endpoints are available under both **`/api/v1/…`** (versioned) and **`/api/…`** (unversioned alias defaulting to v1). See [CHANGELOG.md](CHANGELOG.md) for the versioning strategy.

---

## Authentication Flow

```
┌──────────────────────── User Authentication ────────────────────────┐
│                                                                     │
│  User Login ──► POST /api/v1/auth/system-token                      │
│                  { client_id, client_secret }                       │
│                         │                                           │
│                         ▼                                           │
│                 ┌───────────────┐                                   │
│                 │  JWT Token    │                                   │
│                 │  (24 h TTL)   │                                   │
│                 └───────┬───────┘                                   │
│                         │                                           │
│                         ▼                                           │
│  API Call ──► GET /api/v1/programs                                  │
│               Authorization: Bearer <token>                         │
│                         │                                           │
│                         ▼                                           │
│                 ┌───────────────┐                                   │
│                 │   Response    │                                   │
│                 └───────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────── System-to-System Authentication ────────────────────┐
│                                                                     │
│  External System ──► POST /api/v1/auth/system-token                 │
│                       { client_id, client_secret }                  │
│                              │                                      │
│                              ▼                                      │
│                      ┌───────────────┐                              │
│                      │ System JWT    │                              │
│                      │ (24 h TTL)    │                              │
│                      └───────┬───────┘                              │
│                              │                                      │
│                              ▼                                      │
│  Integration API ──► POST /api/v1/integration/penta/policy-data     │
│                       Authorization: Bearer <system-token>          │
│                              │                                      │
│                              ▼                                      │
│                      ┌───────────────┐                              │
│                      │   Response    │                              │
│                      └───────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Flow

```
┌─────────────────────────── Inbound Data Flows ───────────────────────────┐
│                                                                          │
│  Life Asia AS400                                                         │
│  ┌──────────┐    SFTP     ┌───────────────┐    Validate    ┌──────────┐ │
│  │ AS400    │───────────►│ sftpPoller.js  │──────────────►│ stg_     │ │
│  │ Files    │  (cron)    │ (node-cron)    │   & stage     │ policy_  │ │
│  └──────────┘            └───────────────┘               │ txns     │ │
│                                    │                      └────┬─────┘ │
│                                    │                           │       │
│                                    │                           ▼       │
│                                    │                 ┌─────────────┐   │
│                                    │                 │ ins_policy_ │   │
│                                    │                 │ transactions│   │
│                                    │                 └─────────────┘   │
│                                                                        │
│  KGILS Penta                                                           │
│  ┌──────────┐   REST API  ┌───────────────────────┐  ┌─────────────┐  │
│  │ Penta    │────────────►│ /integration/penta/*   │─►│ ins_policy_ │  │
│  │ System   │  (push)    │ (systemAuth)           │  │ transactions│  │
│  └──────────┘            └───────────────────────┘  └─────────────┘  │
│                                                                        │
│  Hierarchy System                                                      │
│  ┌──────────┐   REST API  ┌───────────────────────┐  ┌─────────────┐  │
│  │Hierarchy │────────────►│ hierarchySync.js       │─►│ ins_agents  │  │
│  │ API      │  (cron)    │ (node-cron + fetch)    │  │             │  │
│  └──────────┘            └───────────────────────┘  └─────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────── Calculation Engine ───────────────────────────┐
│                                                                       │
│  ins_policy_transactions ─┐                                           │
│  ins_agents ──────────────┤                                           │
│  ins_programs ────────────┼──► POST /api/v1/calculate/run             │
│  ins_kpis ────────────────┤         │                                 │
│  ins_payout_rules ────────┘         ▼                                 │
│                            ┌──────────────────┐                       │
│                            │ ins_incentive_    │                       │
│                            │ results           │                       │
│                            └──────────────────┘                       │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────── Outbound Data Flows ──────────────────────┐
│                                                                       │
│  ins_incentive_results                                                │
│         │                                                             │
│         ├──► POST /api/v1/integration/export/oracle-financials        │
│         │         │                                                   │
│         │         ▼                                                   │
│         │    ┌──────────────┐         ┌─────────────────┐             │
│         │    │ ORACLE_FILE  │────────►│ Oracle          │             │
│         │    │ .csv         │         │ Financials (AP) │             │
│         │    └──────────────┘         └─────────────────┘             │
│         │                                                             │
│         └──► SAP FICO export (planned)                                │
│                   │                                                   │
│                   ▼                                                   │
│              ┌──────────────┐         ┌─────────────────┐             │
│              │ SAP_FILE     │────────►│ SAP FICO        │             │
│              │ .csv         │         │                 │             │
│              └──────────────┘         └─────────────────┘             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Related Resources

- **Error Codes** — see [ERROR_CODES.md](ERROR_CODES.md) for the full list of `AUTH_*`, `VAL_*`, `BUS_*`, `INT_*`, and `CALC_*` codes with HTTP status mapping and resolution steps.
- **Postman** — import [IncentiveSystem.postman_collection.json](IncentiveSystem.postman_collection.json) and one of the [environments/](environments/) files. See [POSTMAN_GUIDE.md](POSTMAN_GUIDE.md) for walkthrough.
- **Versioning** — see [CHANGELOG.md](CHANGELOG.md) for API version history and how to introduce a new version.
