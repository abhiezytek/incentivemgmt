# Incentive Management System — Database Reference

## Tech Stack

| Layer        | Technology                         |
| ------------ | ---------------------------------- |
| Database     | PostgreSQL 15+                     |
| Driver       | `pg` (node-postgres) — raw SQL     |
| ORM          | **None** — all queries are raw SQL |
| Connection   | Pool via `server/src/db/pool.js`   |
| Query Helper | `server/src/db/queryHelper.js`     |
| Bulk Insert  | `server/src/utils/bulkInsert.js`   |

All queries use parameterized `$1, $2…` syntax. No string interpolation.

---

## Connection Config (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=incentivemgmt
DB_USER=postgres
DB_PASSWORD=postgres
```

See `.env.example` for the full template.

---

## Migration Files (run in order)

| #   | File                                                 | Purpose                              |
| --- | ---------------------------------------------------- | ------------------------------------ |
| 1   | `server/src/db/migrations/001_master_schema.sql`     | Core configuration & result tables   |
| 2   | `server/src/db/migrations/002_insurance_schema.sql`  | Insurance-specific tables            |
| 2b  | `server/src/db/migrations/002_add_team_override_pct.sql` | Adds `team_override_pct` to `payout_rules` |
| 3   | `server/src/db/migrations/003_payout_disbursement_log.sql` | Payout audit log table            |

### PostgreSQL Functions

| File                                             | Purpose                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| `server/src/db/functions/compute_agent_kpi.sql`  | Computes KPI summary for an agent/program/period  |

---

## Pool & Query Helper

### pool.js

```js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;   // ← always returns rows array
};

export default pool;
```

> **Important:** `query()` returns `result.rows` directly (an array).
> `pool.query()` returns the full `pg` result object.
> Use `pool.query()` in `bulkInsert` utilities; use `query()` everywhere else.

### queryHelper.js

Exports convenience methods that delegate to `query()`:

| Function                            | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `findAll(table, conditions, order)` | SELECT * with optional WHERE (ANDed conditions) |
| `findById(table, id)`               | SELECT * WHERE id = $1 → single row             |
| `insertRow(table, dataObject)`      | INSERT … RETURNING * → single row               |
| `updateRow(table, id, dataObject)`  | UPDATE … RETURNING * → single row               |
| `deleteRow(table, id)`              | DELETE … RETURNING * → single row               |

All identifiers are validated against `/^[a-zA-Z_][a-zA-Z0-9_]*$/` to prevent SQL injection.

---

## Table Overview

### 001_master_schema.sql — Core Tables

| Table                       | Purpose                                |
| --------------------------- | -------------------------------------- |
| `channels`                  | Sales channels (AGENCY, BANCA, DIRECT) |
| `incentive_programs`        | Program definitions with date range    |
| `user_groups`               | Groups within a program                |
| `group_members`             | Members of a group with roles          |
| `kpi_definitions`           | Table-driven KPI configuration         |
| `kpi_milestones`            | Milestone ranges (M-1, M-2, M-3)      |
| `payout_rules`              | Payout rule definitions per program    |
| `payout_slabs`              | Slab-based payout ranges               |
| `payout_qualifying_rules`   | Qualifying gates for payout            |
| `derived_variables`         | Formula engine (table-driven)          |
| `performance_data`          | Uploaded performance input data        |
| `incentive_results`         | Calculated incentive output            |
| `users`                     | User accounts with roles               |
| `user_sessions`             | JWT/session tokens                     |

### 002_insurance_schema.sql — Insurance Tables

| Table                       | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `ins_products`              | Product master (ULIP, Term, Trad, etc.)     |
| `ins_agents`                | Agent master with MLM hierarchy             |
| `ins_regions`               | Region master with zone                     |
| `ins_policy_transactions`   | Core fact table — policy transactions       |
| `ins_incentive_rates`       | Product/channel incentive rates             |
| `ins_persistency_data`      | 13th/25th/37th/49th month persistency       |
| `ins_persistency_gates`     | Persistency qualifying thresholds           |
| `ins_mlm_override_rates`    | Multi-level hierarchy override rates        |
| `ins_agent_kpi_summary`     | Computed KPIs per agent per period          |
| `ins_incentive_results`     | Insurance-specific incentive results        |

### Additional Migrations

| Table                       | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `payout_disbursement_log`   | Audit log for payout disbursements          |

---

## Key Relationships

```
channels ─────────────┐
                      ├──▶ incentive_programs
users ────────────────┘         │
  │                             ├──▶ kpi_definitions ──▶ kpi_milestones
  │                             ├──▶ payout_rules ──▶ payout_slabs
  │                             │                  └──▶ payout_qualifying_rules
  │                             ├──▶ performance_data
  │                             └──▶ incentive_results
  │
  └──▶ ins_agents ──────────────┐
         │ (parent_agent_id)    ├──▶ ins_policy_transactions
         │                      ├──▶ ins_agent_kpi_summary
         └──self-ref (MLM)      └──▶ ins_incentive_results
                                         └──▶ payout_disbursement_log
```

---

## compute_agent_kpi Function

```sql
compute_agent_kpi(p_agent_code, p_program_id, p_start, p_end) → VOID
```

Computes and upserts into `ins_agent_kpi_summary`:

- New business metrics: policy count, premium, APE
- Product-wise NB breakdown as JSONB
- Renewal/collection percentages
- Product category splits (ULIP, TRAD, TERM)
- Uses `ON CONFLICT (agent_code, program_id, period_start) DO UPDATE`

---

## Common Query Patterns

### Parameterized Queries
```js
import { query } from '../db/pool.js';
const rows = await query('SELECT * FROM channels WHERE id = $1', [channelId]);
```

### Bulk Insert (UNNEST pattern)
```js
import { bulkInsertTyped } from '../utils/bulkInsert.js';
await bulkInsertTyped('ins_policy_transactions', columns, typeMap, rows, onConflict);
```

### Lookup Maps
```js
const channels = await query('SELECT id, name FROM channels');
const channelMap = new Map(channels.map(r => [r.name.toUpperCase(), r.id]));
```
