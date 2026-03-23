# Copilot Context — Incentive Management System

> This file provides GitHub Copilot with essential project context
> for generating accurate database-related code.

## Project Rules

1. **No ORM** — all database access uses raw SQL with the `pg` driver.
2. **Parameterized queries only** — always use `$1, $2…` placeholders, never string interpolation.
3. **ESM modules** — the server uses `"type": "module"` with `import`/`export`.
4. **query() returns rows** — `import { query } from '../db/pool.js'` returns `result.rows` (an array), not the full pg result.
5. **pool.query() returns full result** — use only in `bulkInsert` utilities.
6. **Identifier validation** — `queryHelper.js` validates table/column names against `/^[a-zA-Z_][a-zA-Z0-9_]*$/`.
7. **Bulk inserts use UNNEST** — see `server/src/utils/bulkInsert.js`.

---

## Database Connection

```js
import { query } from '../db/pool.js';
import pool from '../db/pool.js';
```

Environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

---

## Table Names (exact)

### Core tables (001_master_schema.sql)
- `channels` — id, name, code, is_active
- `incentive_programs` — id, name, channel_id, plan_type, start_date, end_date, status
- `user_groups` — id, program_id, group_name, group_type
- `group_members` — id, group_id, user_id, role, reports_to_user_id
- `kpi_definitions` — id, program_id, kpi_name, frequency, measurement_type
- `kpi_milestones` — id, kpi_id, milestone_label, range_from, range_to
- `payout_rules` — id, program_id, rule_name, calc_type, team_override_pct
- `payout_slabs` — id, payout_rule_id, kpi_id, operator, value1, value2, incentive_operator
- `payout_qualifying_rules` — id, payout_rule_id, kpi_id, operator, threshold_value
- `derived_variables` — id, var_name, formula, base_fields (JSONB)
- `performance_data` — id, user_id, program_id, kpi_id, period_start, target_value, achieved_value
- `incentive_results` — id, user_id, program_id, self_incentive, team_incentive, total_incentive, status
- `users` — id, name, email, password_hash, role, channel_id
- `user_sessions` — id, user_id, token, expires_at

### Insurance tables (002_insurance_schema.sql)
- `ins_products` — id, product_code (UNIQUE), product_name, product_category, product_type
- `ins_agents` — id, user_id, agent_code (UNIQUE), agent_name, channel_id, region_id, parent_agent_id, hierarchy_path, hierarchy_level
- `ins_regions` — id, region_name, region_code (UNIQUE), zone
- `ins_policy_transactions` — id, policy_number, agent_code, product_code, channel_id, region_id, transaction_type, premium_amount, annualized_premium, issue_date, paid_date
- `ins_incentive_rates` — id, program_id, product_code, channel_id, policy_year, rate_type, incentive_rate, effective_from
- `ins_persistency_data` — id, agent_code, program_id, persistency_month, policies_due, policies_renewed, persistency_pct (GENERATED)
- `ins_persistency_gates` — id, program_id, persistency_month, channel_id, gate_type, threshold_pct, consequence
- `ins_mlm_override_rates` — id, program_id, channel_id, hierarchy_level, product_code, override_type, override_rate
- `ins_agent_kpi_summary` — id, agent_code, program_id, period_start, nb_policy_count, nb_total_premium, nb_total_ape, nb_by_product (JSONB), persistency_13m/25m/37m, ulip/trad/term_premium, total_score
- `ins_incentive_results` — id, agent_code, program_id, period_start, nb_incentive, renewal_incentive, net_self_incentive, total_override, total_incentive, status (DRAFT/APPROVED/PAID)

### Audit table (003_payout_disbursement_log.sql)
- `payout_disbursement_log` — id, result_id (FK → ins_incentive_results), paid_at, paid_by, payment_reference, remarks

---

## Common Column Gotchas

| ❌ Wrong                | ✅ Correct                              | Table                   |
| ----------------------- | --------------------------------------- | ----------------------- |
| `final_incentive`       | `total_incentive`                       | ins_incentive_results   |
| `ins_programs`          | `incentive_programs`                    | 001_master_schema       |
| `updated_at`            | Column does not exist                   | ins_incentive_results   |
| `channel_id`            | Not in ins_incentive_results            | ins_incentive_results   |
| `product_code`          | Not in ins_incentive_results            | ins_incentive_results   |
| `nb_premium`            | `nb_total_premium`                      | ins_agent_kpi_summary   |

---

## Status Enums

| Table                 | Column | Values                           |
| --------------------- | ------ | -------------------------------- |
| incentive_programs    | status | DRAFT, ACTIVE, CLOSED            |
| incentive_results     | status | CALCULATED                       |
| ins_incentive_results | status | DRAFT, APPROVED, PAID            |
| ins_agents            | status | ACTIVE, INACTIVE, SUSPENDED      |
| ins_policy_transactions | policy_status | ACTIVE                   |
| performance_data      | source | UPLOAD, API, MANUAL              |

---

## Key Unique Constraints

| Table                  | Columns                               |
| ---------------------- | ------------------------------------- |
| channels               | code                                  |
| ins_products           | product_code                          |
| ins_agents             | agent_code                            |
| ins_regions            | region_code                           |
| ins_agent_kpi_summary  | (agent_code, program_id, period_start)|
| ins_incentive_results  | (agent_code, program_id, period_start)|
| derived_variables      | var_name                              |
| users                  | email                                 |

---

## Foreign Key Lookups

When inserting data, resolve text codes to IDs using lookup maps:

```js
// Channel lookup — uses name (not code) with toUpperCase()
const channels = await query('SELECT id, name FROM channels');
const channelMap = new Map(channels.map(r => [r.name.toUpperCase(), r.id]));

// Region lookup — uses region_code with toUpperCase()
const regions = await query('SELECT id, region_code FROM ins_regions');
const regionMap = new Map(regions.map(r => [r.region_code.toUpperCase(), r.id]));
```

---

## PostgreSQL Function

```sql
-- Computes and upserts KPIs for an agent
SELECT compute_agent_kpi($1, $2, $3, $4);
-- params: agent_code, program_id, period_start, period_end
```

---

## Query Patterns

### Simple select
```js
const rows = await query('SELECT * FROM channels WHERE is_active = $1', [true]);
```

### Insert with RETURNING
```js
const [row] = await query(
  'INSERT INTO channels (name, code) VALUES ($1, $2) RETURNING *',
  [name, code]
);
```

### Using queryHelper
```js
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';

const programs = await findAll('incentive_programs', { status: 'ACTIVE' });
const agent = await findById('ins_agents', agentId);
const newRow = await insertRow('channels', { name: 'Direct', code: 'DIRECT' });
```

### Bulk insert
```js
import { bulkInsertTyped } from '../utils/bulkInsert.js';
await bulkInsertTyped(tableName, columns, typeMap, rows, onConflict);
```
