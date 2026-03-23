# Incentive Management System — API Reference

> **Version:** 1.0.0 · **Base path:** `/api` · **Interactive docs:** [Swagger UI](/api/docs)

---

## Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5000/api` |
| Production  | `https://api.incentive.yourdomain.com/api` |

---

## Authentication

The system uses two authentication mechanisms:

### 1. System Token (machine-to-machine)

Used by external systems (Penta, LifeAsia) to call inbound integration endpoints.

1. Obtain a JWT by calling `POST /api/auth/system-token` with registered `client_id` and `client_secret`.
2. Include the token in all subsequent requests:
   ```
   Authorization: Bearer <token>
   ```
3. Tokens expire after **24 hours**.
4. Each client has an `allowed_endpoints` whitelist; requests to non-whitelisted paths are rejected with `401 ENDPOINT_NOT_ALLOWED`.

### 2. User Auth (browser sessions)

Used by the web UI. Currently a **pass-through placeholder** — all requests are permitted. Will enforce session cookies or user JWTs when the login system is implemented.

### Standard Error Codes

| Code | Error Key | Meaning |
|------|-----------|---------|
| 400 | *(varies)* | Validation / missing fields |
| 401 | `MISSING_TOKEN` | No `Authorization` header |
| 401 | `TOKEN_EXPIRED` | JWT has expired |
| 401 | `INVALID_TOKEN` | JWT signature invalid |
| 401 | `INVALID_TOKEN_PAYLOAD` | Missing `client_id` or wrong `type` |
| 401 | `UNKNOWN_CLIENT` | `client_id` not in `api_clients` |
| 401 | `CLIENT_DISABLED` | Client account deactivated |
| 401 | `ENDPOINT_NOT_ALLOWED` | Client not authorised for this path |
| 404 | *(varies)* | Resource not found |
| 500 | *(varies)* | Internal server error |

---

## Response Format

### Success (JSON)
```json
{
  "field1": "value",
  "field2": 123
}
```
Most endpoints return the resource directly. Bulk operations return a summary object (e.g. `{ approved: 38, skipped_gate_failed: 7 }`).

### Success (CSV download)
Export endpoints return `Content-Type: text/csv` with a `Content-Disposition: attachment` header.

### Error
```json
{
  "error": "Human-readable error message"
}
```

### Data Masking
Policy numbers in JSON responses are automatically masked (e.g. `POL****234`) when the `POLICY_MASK_ENABLED` system config flag is `true`. Export endpoints (`/api/integration/export/*`) are exempt from masking.

---

## Endpoints

---

## AUTH

### POST `/api/auth/login`
**Tag:** Authentication
**Auth:** None
**Status:** 🔜 Planned

Authenticate a user with credentials and receive a JWT.

#### Request
```
POST /api/auth/login
Content-Type: application/json
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `username` | string | ✅ | User login name | `"admin"` |
| `password` | string | ✅ | User password | `"admin123"` |

```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Response (200)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN"
  },
  "expires_at": "2026-01-02T00:00:00.000Z"
}
```

#### Response (401)
```json
{ "error": "Invalid username or password" }
```

#### Notes
- Currently a placeholder — user auth is pass-through.
- Will be implemented with session-based or JWT user authentication.

---

### POST `/api/auth/refresh`
**Tag:** Authentication
**Auth:** Required (User)
**Status:** 🔜 Planned

Refresh an expiring user token.

#### Request
```
POST /api/auth/refresh
Content-Type: application/json
Authorization: Bearer <user_token>
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `refreshToken` | string | ✅ | Current valid token | `"eyJhbGciOi..."` |

#### Response (200)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2026-01-03T00:00:00.000Z"
}
```

#### Notes
- Planned for future implementation alongside user login.

---

### POST `/api/auth/system-token`
**Tag:** Authentication
**Auth:** None (this *is* the auth endpoint)

Issue a system-to-system JWT for machine-to-machine API calls.

#### Request
```
POST /api/auth/system-token
Content-Type: application/json
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `client_id` | string | ✅ | Registered API client identifier | `"penta-integration"` |
| `client_secret` | string | ✅ | Client secret (checked against bcrypt hash) | `"s3cr3t-k3y-value"` |

```json
{
  "client_id": "penta-integration",
  "client_secret": "s3cr3t-k3y-value"
}
```

#### Response (200)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2025-07-11T18:30:00.000Z"
}
```

#### Response (400)
```json
{ "error": "client_id and client_secret are required" }
```

#### Response (401)
```json
{ "error": "INVALID_CREDENTIALS", "message": "Invalid client_id or client_secret" }
```

#### Notes
- Token validity: 24 hours.
- Disabled clients receive `401 CLIENT_DISABLED`.
- Uses `SYSTEM_JWT_SECRET` env variable for signing.

---

## PROGRAMS

### GET `/api/programs`
**Tag:** Programs
**Auth:** Required (User)

List all incentive programs.

#### Request
```
GET /api/programs
```
No parameters.

#### Response (200)
```json
[
  {
    "id": 1,
    "name": "Q3 Auto Policy Growth Bonus",
    "description": "Rewards agents who exceed quarterly auto policy sales targets",
    "start_date": "2025-07-01",
    "end_date": "2025-09-30",
    "is_active": true,
    "created_at": "2025-06-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/programs/{id}`
**Tag:** Programs
**Auth:** Required (User)

Get a single program by ID.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Program ID |

#### Response (200)
```json
{
  "id": 1,
  "name": "Q3 Auto Policy Growth Bonus",
  "description": "Rewards agents who exceed quarterly auto policy sales targets",
  "start_date": "2025-07-01",
  "end_date": "2025-09-30",
  "is_active": true
}
```

#### Response (404)
```json
{ "error": "Program not found" }
```

---

### POST `/api/programs`
**Tag:** Programs
**Auth:** Required (User)

Create a new incentive program.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ | Program name | `"Q3 Growth Bonus"` |
| `description` | string | | Description | `"Quarterly incentive"` |
| `start_date` | date | | Start date | `"2025-07-01"` |
| `end_date` | date | | End date | `"2025-09-30"` |
| `is_active` | boolean | | Active flag | `true` |
| `channel_id` | integer | | Channel | `1` |
| `status` | string | | Status | `"ACTIVE"` |

```json
{
  "name": "Q3 Growth Bonus",
  "start_date": "2025-07-01",
  "end_date": "2025-09-30",
  "is_active": true
}
```

#### Response (201)
```json
{
  "id": 5,
  "name": "Q3 Growth Bonus",
  "start_date": "2025-07-01",
  "end_date": "2025-09-30",
  "is_active": true,
  "created_at": "2025-06-15T10:00:00.000Z"
}
```

---

### PUT `/api/programs/{id}`
**Tag:** Programs
**Auth:** Required (User)

Update an existing program. Accepts any subset of program fields.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Program ID |

Body: any program fields to update.

#### Response (200)
Returns the updated program object.

#### Response (404)
```json
{ "error": "Program not found" }
```

---

### DELETE `/api/programs/{id}`
**Tag:** Programs
**Auth:** Required (User)

Delete a program.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Program ID |

#### Response (200)
Returns the deleted program object.

#### Response (404)
```json
{ "error": "Program not found" }
```

---

### PATCH `/api/programs/{id}/status`
**Tag:** Programs
**Auth:** Required (User)

Toggle the active/inactive status of a program.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | integer | ✅ | Program ID |

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `is_active` | boolean | ✅ | New status | `false` |

```json
{
  "is_active": false
}
```

#### Response (200)
Returns the updated program with new status.

#### Response (404)
```json
{ "error": "Program not found" }
```

---

## USER GROUPS

### GET `/api/groups`
**Tag:** User Groups
**Auth:** None

List all user groups.

#### Response (200)
```json
[
  {
    "id": 1,
    "name": "Team Alpha",
    "program_id": 12,
    "created_at": "2025-06-01T00:00:00.000Z"
  }
]
```

---

### GET `/api/groups/{id}`
**Tag:** User Groups
**Auth:** None

Get a group with nested members.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Group ID |

#### Response (200)
```json
{
  "id": 1,
  "name": "Team Alpha",
  "members": [
    { "id": 10, "user_id": 42, "group_id": 1 }
  ]
}
```

#### Response (404)
```json
{ "error": "Group not found" }
```

---

### POST `/api/groups`
**Tag:** User Groups
**Auth:** None

Create a new group.

#### Request
```json
{
  "name": "Team Beta",
  "program_id": 12
}
```

#### Response (201)
Returns the created group object.

---

### PUT `/api/groups/{id}`
**Tag:** User Groups
**Auth:** None

Update a group.

#### Response (200)
Returns the updated group object.

#### Response (404)
```json
{ "error": "Group not found" }
```

---

### DELETE `/api/groups/{id}`
**Tag:** User Groups
**Auth:** None

Delete a group.

#### Response (200)
Returns the deleted group object.

#### Response (404)
```json
{ "error": "Group not found" }
```

---

### GET `/api/groups/{groupId}/members`
**Tag:** User Groups
**Auth:** None

List members of a group.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `groupId` | path | integer | ✅ | Group ID |

#### Response (200)
```json
[
  { "id": 10, "user_id": 42, "group_id": 1, "role": "MEMBER" }
]
```

---

### POST `/api/groups/{groupId}/members`
**Tag:** User Groups
**Auth:** None

Add a member to a group.

#### Request
```json
{
  "user_id": 42
}
```

#### Response (201)
Returns the created member object.

---

### PUT `/api/groups/{groupId}/members/{memberId}`
**Tag:** User Groups
**Auth:** None

Update a group member.

#### Response (200)
Returns the updated member object.

---

### DELETE `/api/groups/{groupId}/members/{memberId}`
**Tag:** User Groups
**Auth:** None

Remove a member from a group.

#### Response (200)
Returns the deleted member object.

---

## KPI RULES

### GET `/api/kpis`
**Tag:** KPI Rules
**Auth:** Required (User)

List all KPI definitions.

#### Response (200)
```json
[
  {
    "id": 1,
    "program_id": 12,
    "name": "New Business Premium",
    "metric_type": "NB_PREMIUM",
    "target_value": 500000,
    "weight": 40,
    "created_at": "2025-06-01T00:00:00.000Z"
  }
]
```

---

### GET `/api/kpis/{id}`
**Tag:** KPI Rules
**Auth:** Required (User)

Get a single KPI definition with nested milestones.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | KPI ID |

#### Response (200)
```json
{
  "id": 1,
  "name": "New Business Premium",
  "metric_type": "NB_PREMIUM",
  "target_value": 500000,
  "weight": 40,
  "milestones": [
    {
      "id": 10,
      "kpi_id": 1,
      "label": "Bronze",
      "threshold_value": 70,
      "payout_amount": 5000,
      "sort_order": 1
    }
  ]
}
```

#### Response (404)
```json
{ "error": "KPI not found" }
```

---

### POST `/api/kpis`
**Tag:** KPI Rules
**Auth:** Required (User)

Create a new KPI definition.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `program_id` | integer | ✅ | Program ID | `12` |
| `name` | string | ✅ | KPI name | `"New Business Premium"` |
| `metric_type` | string | ✅ | Metric type | `"NB_PREMIUM"` |
| `target_value` | number | | Target | `500000` |
| `weight` | number | | Weight percentage | `40` |

#### Response (201)
Returns the created KPI object.

---

### PUT `/api/kpis/{id}`
**Tag:** KPI Rules
**Auth:** Required (User)

Update a KPI definition.

#### Response (200)
Returns the updated KPI object.

#### Response (404)
```json
{ "error": "KPI not found" }
```

---

### DELETE `/api/kpis/{id}`
**Tag:** KPI Rules
**Auth:** Required (User)

Delete a KPI definition.

#### Response (200)
Returns the deleted KPI object.

#### Response (404)
```json
{ "error": "KPI not found" }
```

---

### GET `/api/kpis/{kpiId}/milestones`
**Tag:** KPI Rules
**Auth:** Required (User)

List milestones for a KPI, ordered by `sort_order`.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `kpiId` | path | integer | ✅ | KPI ID |

#### Response (200)
```json
[
  {
    "id": 10,
    "kpi_id": 1,
    "label": "Bronze",
    "threshold_value": 70,
    "payout_amount": 5000,
    "sort_order": 1
  }
]
```

---

### POST `/api/kpis/{kpiId}/milestones`
**Tag:** KPI Rules
**Auth:** Required (User)

Create a milestone for a KPI.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `label` | string | ✅ | Milestone label | `"Gold"` |
| `threshold_value` | number | ✅ | Achievement threshold % | `100` |
| `payout_amount` | number | ✅ | Payout amount | `15000` |
| `sort_order` | integer | ✅ | Display order | `3` |

#### Response (201)
Returns the created milestone object.

---

### PUT `/api/kpis/{kpiId}/milestones/{milestoneId}`
**Tag:** KPI Rules
**Auth:** Required (User)

Update a KPI milestone.

#### Response (200)
Returns the updated milestone object.

#### Response (404)
```json
{ "error": "Milestone not found" }
```

---

### DELETE `/api/kpis/{kpiId}/milestones/{milestoneId}`
**Tag:** KPI Rules
**Auth:** Required (User)

Delete a KPI milestone.

#### Response (200)
Returns the deleted milestone object.

#### Response (404)
```json
{ "error": "Milestone not found" }
```

---

## PAYOUT RULES

### GET `/api/payouts`
**Tag:** Payout Rules
**Auth:** Required (User)

List all payout rules.

#### Response (200)
```json
[
  {
    "id": 1,
    "program_id": 12,
    "name": "NB Commission - Agency",
    "payout_type": "COMMISSION",
    "calc_method": "MULTIPLY",
    "base_field": "annualized_premium"
  }
]
```

---

### GET `/api/payouts/{id}`
**Tag:** Payout Rules
**Auth:** Required (User)

Get a payout rule with nested slabs.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Payout rule ID |

#### Response (200)
```json
{
  "id": 1,
  "name": "NB Commission - Agency",
  "payout_type": "COMMISSION",
  "calc_method": "MULTIPLY",
  "slabs": [
    {
      "id": 5,
      "payout_rule_id": 1,
      "min_value": 0,
      "max_value": 100000,
      "rate": 0.05,
      "sort_order": 1
    }
  ]
}
```

#### Response (404)
```json
{ "error": "Payout rule not found" }
```

---

### POST `/api/payouts`
**Tag:** Payout Rules
**Auth:** Required (User)

Create a payout rule.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `program_id` | integer | ✅ | Program ID | `12` |
| `name` | string | ✅ | Rule name | `"NB Commission"` |
| `payout_type` | string | ✅ | COMMISSION / BONUS / OVERRIDE | `"COMMISSION"` |
| `calc_method` | string | ✅ | FLAT / MULTIPLY / PERCENTAGE_OF | `"MULTIPLY"` |
| `base_field` | string | ✅ | Base metric field | `"annualized_premium"` |

#### Response (201)
Returns the created payout rule object.

---

### PUT `/api/payouts/{id}`
**Tag:** Payout Rules
**Auth:** Required (User)

Update a payout rule.

#### Response (200)
Returns the updated payout rule.

#### Response (404)
```json
{ "error": "Payout rule not found" }
```

---

### DELETE `/api/payouts/{id}`
**Tag:** Payout Rules
**Auth:** Required (User)

Delete a payout rule.

#### Response (200)
Returns the deleted payout rule.

#### Response (404)
```json
{ "error": "Payout rule not found" }
```

---

### GET `/api/payouts/{ruleId}/slabs`
**Tag:** Payout Rules
**Auth:** Required (User)

List payout slabs for a rule, ordered by `sort_order`.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `ruleId` | path | integer | ✅ | Payout rule ID |

#### Response (200)
```json
[
  {
    "id": 5,
    "payout_rule_id": 1,
    "min_value": 0,
    "max_value": 100000,
    "rate": 0.05,
    "sort_order": 1
  }
]
```

---

### POST `/api/payouts/{ruleId}/slabs`
**Tag:** Payout Rules
**Auth:** Required (User)

Create a payout slab.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `min_value` | number | ✅ | Slab lower bound | `0` |
| `max_value` | number | ✅ | Slab upper bound | `100000` |
| `rate` | number | ✅ | Rate / multiplier | `0.05` |
| `sort_order` | integer | ✅ | Display order | `1` |

#### Response (201)
Returns the created slab object.

---

### PUT `/api/payouts/{ruleId}/slabs/{slabId}`
**Tag:** Payout Rules
**Auth:** Required (User)

Update a payout slab.

#### Response (200)
Returns the updated slab.

#### Response (404)
```json
{ "error": "Slab not found" }
```

---

### DELETE `/api/payouts/{ruleId}/slabs/{slabId}`
**Tag:** Payout Rules
**Auth:** Required (User)

Delete a payout slab.

#### Response (200)
Returns the deleted slab.

#### Response (404)
```json
{ "error": "Slab not found" }
```

---

## DATA UPLOAD

All upload endpoints accept **multipart/form-data** with a `file` field containing a CSV file (max 20 MB). Bulk operations use PostgreSQL `COPY` streams for performance.

### POST `/api/upload/policy-transactions`
**Tag:** Data Upload
**Auth:** Required (User)

Upload policy transactions from CSV.

#### Request
```
POST /api/upload/policy-transactions
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Policy transactions CSV |

**Required CSV columns:** `policy_number`, `agent_code`, `product_code`, `transaction_type`, `premium_amount`, `annualized_premium`, `paid_date`

**Optional CSV columns:** `channel_code`, `region_code`, `policy_year`, `sum_assured`, `payment_mode`, `issue_date`, `due_date`, `policy_status`

#### Response (200)
```json
{
  "success": true,
  "inserted": 1250,
  "total": 1300,
  "skipped": 50
}
```

#### Notes
- Uses `ON CONFLICT (policy_number, transaction_type, due_date)` for upserts.
- Resolves `channel_code` and `region_code` to foreign key IDs via lookup tables.

---

### POST `/api/upload/agents`
**Tag:** Data Upload
**Auth:** Required (User)

Upload agent master data from CSV.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Agent master CSV |

**Required CSV columns:** `agent_code`, `agent_name`, `channel_code`, `region_code`, `hierarchy_level`

**Optional CSV columns:** `branch_code`, `license_number`, `license_expiry`, `activation_date`, `parent_agent_code`, `status`

#### Response (200)
```json
{
  "success": true,
  "inserted": 500
}
```

#### Notes
- Uses `ON CONFLICT (agent_code)` for upserts.
- Resolves `parent_agent_code` to `parent_agent_id`.
- Rebuilds `hierarchy_path` after insert.

---

### POST `/api/upload/persistency`
**Tag:** Data Upload
**Auth:** Required (User)

Upload persistency data from CSV.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Persistency data CSV |
| `programId` | integer | ✅ | Program ID (form field) |

**Required CSV columns:** `agent_code`, `persistency_month`, `period_start`, `period_end`, `policies_due`, `policies_renewed`

#### Response (200)
```json
{
  "success": true,
  "inserted": 850
}
```

---

### POST `/api/upload/incentive-rates`
**Tag:** Data Upload
**Auth:** Required (User)

Upload incentive rate schedules from CSV.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Incentive rates CSV |
| `programId` | integer | ✅ | Program ID (form field) |

**CSV columns:** `product_code`, `channel_code`, `policy_year`, `transaction_type`, `rate_type`, `incentive_rate`, `min_premium_slab`, `max_premium_slab`, `min_policy_term`, `max_policy_term`, `effective_from`, `effective_to`

#### Response (200)
```json
{
  "success": true,
  "inserted": 120
}
```

---

### POST `/api/upload/products`
**Tag:** Data Upload
**Auth:** Required (User)

Upload product master data from CSV.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Product master CSV |

**CSV columns:** `product_code`, `product_name`, `product_category`, `product_type`, `min_premium`, `max_premium`, `min_term`, `max_term`

#### Response (200)
```json
{
  "success": true,
  "inserted": 45
}
```

---

### POST `/api/upload/mlm-override-rates`
**Tag:** Data Upload
**Auth:** Required (User)

Upload MLM hierarchy override rate schedules from CSV.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file (CSV) | ✅ | Override rates CSV |
| `programId` | integer | ✅ | Program ID (form field) |

**CSV columns:** `hierarchy_level`, `override_level`, `product_code`, `channel_code`, `rate_type`, `override_rate`, `effective_from`, `effective_to`

#### Response (200)
```json
{
  "success": true,
  "inserted": 80
}
```

---

## CALCULATION

### POST `/api/calculate/run`
**Tag:** Calculations
**Auth:** Required (User)

Run bulk incentive calculation for all active agents in a program's channel.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `programId` | integer | ✅ | Incentive program ID | `12` |
| `periodStart` | date | ✅ | Period start date | `"2025-07-01"` |
| `periodEnd` | date | ✅ | Period end date | `"2025-07-31"` |

```json
{
  "programId": 12,
  "periodStart": "2025-07-01",
  "periodEnd": "2025-07-31"
}
```

#### Response (200)
```json
{
  "programId": 12,
  "periodStart": "2025-07-01",
  "periodEnd": "2025-07-31",
  "totalAgents": 150,
  "successCount": 148,
  "errorCount": 2,
  "totalIncentivePool": 1250000.00,
  "errors": [
    { "agentCode": "AGT-001", "error": "No transactions found" }
  ]
}
```

#### Notes
- Agents are processed sequentially to avoid DB overload.
- Uses `calculateAgentIncentive()` engine for each agent.
- Failed agents are logged but don't stop the batch.

---

### GET `/api/calculate/results`
**Tag:** Calculations
**Auth:** Required (User)

Retrieve calculation results for a program and period.

#### Request
| Parameter | In | Type | Required | Description | Example |
|-----------|----|------|----------|-------------|---------|
| `program_id` | query | integer | ✅ | Program ID | `12` |
| `period` | query | string | ✅ | Period (YYYY-MM) | `"2025-07"` |

#### Response (200)
```json
[
  {
    "id": 1024,
    "agent_code": "AGT-5001",
    "user_name": "Ravi Kumar",
    "channel_name": "Agency",
    "total_incentive": 25000.00,
    "status": "DRAFT"
  }
]
```

---

### POST `/api/calculate/{programId}/{userId}/{period}`
**Tag:** Calculations
**Auth:** Required (User)

Calculate incentive for a single user in a specific period.

#### Request
| Parameter | In | Type | Required | Description | Example |
|-----------|----|------|----------|-------------|---------|
| `programId` | path | integer | ✅ | Program ID | `12` |
| `userId` | path | integer | ✅ | User/agent ID | `42` |
| `period` | path | string | ✅ | Period (YYYY-MM) | `"2025-07"` |

#### Response (201)
Returns full incentive breakdown with KPI results, milestone hits, and payout calculations.

#### Notes
- Derives `periodStart` and `periodEnd` from YYYY-MM.
- Uses the `calculateIncentive()` engine which loads KPIs, computes achievements, evaluates qualifying gates, and persists results.

---

### GET `/api/calculate/status/{jobId}`
**Tag:** Calculations
**Auth:** Required (User)

Check the status of a calculation job by its ID.

#### Request
| Parameter | In | Type | Required | Description | Example |
|-----------|-----|------|----------|-------------|---------|
| `jobId` | path | integer | ✅ | Calculation job ID | `1` |

#### Response (200)
```json
{
  "jobId": 1,
  "status": "COMPLETED",
  "programId": 12,
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "totalAgents": 150,
  "successCount": 148,
  "errorCount": 2,
  "startedAt": "2026-01-15T10:00:00.000Z",
  "completedAt": "2026-01-15T10:05:30.000Z"
}
```

#### Response (404)
```json
{ "error": "Job not found" }
```

---

### POST `/api/calculate/recompute/{agentCode}`
**Tag:** Calculations
**Auth:** Required (User)

Recompute incentive for a single agent. Useful for recalculating after data corrections.

#### Request
| Parameter | In | Type | Required | Description | Example |
|-----------|-----|------|----------|-------------|---------|
| `agentCode` | path | string | ✅ | Agent code | `"AGT001"` |

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `periodStart` | date | ✅ | Period start date | `"2026-01-01"` |
| `periodEnd` | date | ✅ | Period end date | `"2026-01-31"` |

```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31"
}
```

#### Response (200)
```json
{
  "agentCode": "AGT001",
  "programId": 12,
  "totalIncentive": 25000.00,
  "status": "DRAFT"
}
```

---

## INCENTIVE RESULTS

### GET `/api/incentive-results/stage-summary`
**Tag:** Incentive Results
**Auth:** Required (User)

Get pipeline stage counts and totals, grouped by status.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `programId` | query | integer | | Filter by program |
| `periodStart` | query | date | | Filter by period |

#### Response (200)
```json
{
  "DRAFT": { "count": 45, "total": 182500.00 },
  "APPROVED": { "count": 30, "total": 125000.00 },
  "INITIATED": { "count": 12, "total": 54000.00 },
  "PAID": { "count": 85, "total": 340000.00 }
}
```

---

### GET `/api/incentive-results/summary`
**Tag:** Incentive Results
**Auth:** Required (User)

Aggregate totals by channel for a program + period.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `programId` | query | integer | ✅ | Program ID |
| `periodStart` | query | date | ✅ | Period start date |

#### Response (200)
```json
[
  {
    "channel": "Agency",
    "agent_count": 85,
    "total_pool": 450000.00,
    "avg_incentive": 5294.12,
    "paid_count": 60
  }
]
```

---

### GET `/api/incentive-results`
**Tag:** Incentive Results
**Auth:** Required (User)

List incentive results with optional filters.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `programId` | query | integer | | Filter by program |
| `periodStart` | query | date | | Filter by period |
| `channel` | query | integer | | Filter by channel ID |
| `region` | query | integer | | Filter by region ID |
| `status` | query | string | | Filter by status (DRAFT/APPROVED/INITIATED/PAID) |

#### Response (200)
```json
[
  {
    "id": 1024,
    "agent_code": "AGT-5001",
    "agent_name": "Ravi Kumar",
    "channel_name": "Agency",
    "region_name": "NORTH",
    "program_name": "Q3 Growth Bonus",
    "total_incentive": 25000.00,
    "net_self_incentive": 20000.00,
    "total_override": 5000.00,
    "status": "DRAFT",
    "persistency_gate_passed": true
  }
]
```

---

### GET `/api/incentive-results/{id}`
**Tag:** Incentive Results
**Auth:** Required (User)

Get detailed incentive result for a single record by ID.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | integer | ✅ | Incentive result ID |

#### Response (200)
```json
{
  "id": 1024,
  "agent_code": "AGT-5001",
  "agent_name": "Ravi Kumar",
  "channel_name": "Agency",
  "region_name": "NORTH",
  "program_name": "Q1 2026 Sales Incentive",
  "total_incentive": 25000.00,
  "net_self_incentive": 20000.00,
  "total_override": 5000.00,
  "status": "DRAFT",
  "persistency_gate_passed": true,
  "kpi_results": [],
  "payout_details": [],
  "period_start": "2026-01-01",
  "period_end": "2026-01-31",
  "calculated_at": "2026-02-01T10:00:00.000Z"
}
```

#### Response (404)
```json
{ "error": "Result not found" }
```

---

### POST `/api/incentive-results/{id}/approve`
**Tag:** Incentive Results
**Auth:** Required (User)

Approve a single incentive result (DRAFT → APPROVED).

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Result ID |

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approvedBy` | string | | Approver username |

```json
{
  "approvedBy": "manager.rao"
}
```

#### Response (200)
```json
{
  "success": true,
  "id": 1024,
  "status": "APPROVED"
}
```

#### Response (404)
```json
{ "error": "Result not found or already approved" }
```

---

### POST `/api/incentive-results/bulk-approve`
**Tag:** Incentive Results
**Auth:** Required (User)

Bulk approve DRAFT results that have passed the persistency gate.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | integer[] | | Specific IDs to approve |
| `programId` | integer | | Program ID (if `ids` not given) |
| `periodStart` | date | | Period start (if `ids` not given) |
| `approvedBy` | string | | Approver username |

```json
{
  "programId": 12,
  "periodStart": "2025-07-01",
  "approvedBy": "finance.head"
}
```

#### Response (200)
```json
{
  "approved": 38,
  "skipped_gate_failed": 7,
  "approvedCount": 38
}
```

#### Notes
- Only results with `persistency_gate_passed = TRUE` are approved.
- Results that fail the persistency gate are counted in `skipped_gate_failed`.

---

### POST `/api/incentive-results/initiate-payment`
**Tag:** Incentive Results
**Auth:** Required (User)

Initiate payment for approved results (APPROVED → INITIATED).

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `ids` | integer[] | ✅ | Result IDs to process | `[1024, 1025, 1030]` |
| `paymentReference` | string | | Bank / payment ref | `"NEFT-2025-Q1-042"` |
| `paidBy` | string | | Initiator username | `"finance.singh"` |

#### Response (200)
```json
{
  "count": 3
}
```

#### Notes
- Creates entries in `payout_disbursement_log` for each result.

---

### POST `/api/incentive-results/mark-paid`
**Tag:** Incentive Results
**Auth:** Required (User)

Mark initiated results as paid (INITIATED → PAID).

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | integer[] | | Specific IDs (option A) |
| `programId` | integer | | Program ID (option B) |
| `periodStart` | date | | Period start (option B) |
| `paidBy` | string | | Confirmer username |

Provide either `ids` or (`programId` + `periodStart`).

#### Response (200)
```json
{
  "paid": 3,
  "paidCount": 3
}
```

---

## LEADERBOARD

### GET `/api/leaderboard`
**Tag:** Leaderboard
**Auth:** Required (User)

Get ranked agents by total incentive for a program + period.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `programId` | query | integer | ✅ | Program ID |
| `period` | query | date | ✅ | Period start date |
| `channel` | query | string | | Filter by channel code |
| `region` | query | string | | Filter by region code |

#### Response (200)
```json
{
  "agents": [
    {
      "agent_code": "AGT-5001",
      "agent_name": "Ravi Kumar",
      "hierarchy_level": 2,
      "channel": "Agency",
      "region": "North",
      "total_incentive": 45000.00,
      "net_self_incentive": 35000.00,
      "total_override": 10000.00,
      "nb_total_premium": 750000.00,
      "nb_achievement_pct": 125.5,
      "persistency_13m": 88.5,
      "collection_pct": 95.0,
      "status": "APPROVED"
    }
  ],
  "summary": {
    "total_pool": 1250000.00,
    "agent_count": 150,
    "avg_incentive": 8333.33,
    "top_earner": "Ravi Kumar"
  }
}
```

---

## DASHBOARD

### GET `/api/dashboard/summary`
**Tag:** Dashboard
**Auth:** Required (User)

Get comprehensive dashboard summary with 7 data sections.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `programId` | query | integer | | Filter by program |
| `period` | query | date | | Filter by period |

#### Response (200)
```json
{
  "kpi": {
    "total_pool": 1250000.00,
    "total_self": 980000.00,
    "total_override": 270000.00,
    "agent_count": 150,
    "paid_count": 85,
    "agents_below_gate": 12,
    "avg_achievement": 87.5,
    "total_nb_premium": 45000000.00,
    "nb_policy_count": 1200,
    "total_target": 52000000.00,
    "avg_persistency_13m": 82.3
  },
  "channelBreakdown": [
    {
      "channel": "Agency",
      "self_incentive": 600000.00,
      "override_incentive": 150000.00,
      "total_incentive": 750000.00,
      "agent_count": 95
    }
  ],
  "productMix": [
    {
      "product": "Term Life Plus",
      "product_category": "PROTECTION",
      "premium": 12500000.00,
      "policy_count": 350
    }
  ],
  "topAgents": [
    {
      "agent_code": "AGT-5001",
      "agent_name": "Ravi Kumar",
      "total_incentive": 45000.00,
      "net_self_incentive": 35000.00,
      "nb_achievement_pct": 125.5
    }
  ],
  "programs": [
    {
      "id": 12,
      "name": "Q3 Growth Bonus",
      "start_date": "2025-07-01",
      "end_date": "2025-09-30",
      "status": "ACTIVE",
      "channel": "Agency"
    }
  ],
  "pipelineStatus": {
    "DRAFT": { "count": 45, "pool": 182500.00 },
    "APPROVED": { "count": 30, "pool": 125000.00 },
    "PAID": { "count": 85, "pool": 340000.00 }
  },
  "recentActivity": [
    {
      "type": "calculation",
      "message": "Incentives calculated for 150 agents",
      "time": "15 Jul, 02:30 PM",
      "icon": "🧮"
    },
    {
      "type": "approval",
      "message": "Bulk approved 38 agents",
      "time": "16 Jul, 10:00 AM",
      "icon": "✅"
    }
  ]
}
```

---

## INTEGRATION — INBOUND

### POST `/api/integration/penta/heartbeat`
**Tag:** Integration - Inbound
**Auth:** Required (System Token)

Penta system health check. Logs heartbeat to `integration_audit_log` and updates `PENTA_LAST_SYNC` in `system_config`.

#### Request
```
POST /api/integration/penta/heartbeat
Authorization: Bearer <system-token>
```
No body required.

#### Response (200)
```json
{
  "status": "OK",
  "timestamp": "2025-07-15T08:30:00.000Z"
}
```

---

### POST `/api/integration/penta/policy-data`
**Tag:** Integration - Inbound
**Auth:** Required (System Token)

Receive policy transaction data from Penta and stage for processing.

#### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `records` | array | ✅ | Array of policy transaction objects |

Each record:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `policy_number` | string | Policy number | `"POL-2025-001234"` |
| `agent_code` | string | Agent code | `"AGT-5001"` |
| `product_code` | string | Product code | `"LIFE-ENDOW-20"` |
| `premium_amount` | number | Premium amount | `25000.00` |
| `transaction_type` | string | Transaction type | `"NEW_BUSINESS"` |
| `issue_date` | date | Issue date | `"2025-07-01"` |

```json
{
  "records": [
    {
      "policy_number": "POL-2025-001234",
      "agent_code": "AGT-5001",
      "product_code": "LIFE-ENDOW-20",
      "premium_amount": 25000.00,
      "transaction_type": "NEW_BUSINESS",
      "issue_date": "2025-07-01"
    }
  ]
}
```

#### Response (200)
```json
{
  "success": true,
  "batch_id": "PENTA_1752595200000",
  "received": 5,
  "staged": 5
}
```

#### Response (400)
```json
{ "error": "records array is required and must not be empty" }
```

#### Notes
- Records are staged in `stg_policy_transactions` with `stg_status = 'PENDING'`.
- Each batch gets a unique `batch_id` (e.g. `PENTA_<timestamp>`).
- Audit logged to `integration_audit_log` with timing.

---

### POST `/api/integration/penta/policy-transaction`
**Tag:** Integration - Inbound
**Auth:** Required (System Token)

Push a single policy transaction from Penta for staging and validation.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `policy_number` | string | ✅ | Policy number | `"POL-2026-001234"` |
| `agent_code` | string | ✅ | Agent code | `"AGT001"` |
| `product_code` | string | ✅ | Product code | `"LIFE-ENDOW-20"` |
| `premium_amount` | number | ✅ | Premium amount | `25000.00` |
| `transaction_type` | string | ✅ | Transaction type | `"NEW_BUSINESS"` |
| `issue_date` | date | ✅ | Issue date | `"2026-01-15"` |

```json
{
  "policy_number": "POL-2026-001234",
  "agent_code": "AGT001",
  "product_code": "LIFE-ENDOW-20",
  "premium_amount": 25000.00,
  "transaction_type": "NEW_BUSINESS",
  "issue_date": "2026-01-15"
}
```

#### Response (200)
```json
{
  "success": true,
  "staged": 1
}
```

---

### POST `/api/integration/penta/agent-status-change`
**Tag:** Integration - Inbound
**Auth:** Required (System Token)

Notify the system of an agent status change from Penta.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `agent_code` | string | ✅ | Agent code | `"AGT001"` |
| `new_status` | string | ✅ | New status value | `"ACTIVE"` |
| `effective_date` | date | ✅ | Effective date | `"2026-01-15"` |
| `reason` | string | | Reason for change | `"Annual license renewal"` |

```json
{
  "agent_code": "AGT001",
  "new_status": "ACTIVE",
  "effective_date": "2026-01-15",
  "reason": "Annual license renewal completed"
}
```

#### Response (200)
```json
{
  "success": true,
  "agent_code": "AGT001",
  "status": "ACTIVE"
}
```

---

### GET `/api/integration/penta/sync-status`
**Tag:** Integration - Inbound
**Auth:** Required (System Token)

Check Penta integration heartbeat and last sync timestamp.

#### Response (200)
```json
{
  "status": "OK",
  "timestamp": "2026-01-15T08:30:00.000Z",
  "lastSync": "2026-01-15T08:30:00.000Z"
}
```

---

## INTEGRATION — OUTBOUND

### POST `/api/integration/export/sap-fico`
**Tag:** Integration - Outbound
**Auth:** Required (User)

Generate SAP FICO export file for approved incentive results.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `programId` | integer | ✅ | Program ID | `12` |
| `periodStart` | date | ✅ | Period start date | `"2026-01-01"` |

```json
{
  "programId": 12,
  "periodStart": "2026-01-01"
}
```

#### Response (200) — CSV Download
```
Content-Type: text/csv
Content-Disposition: attachment; filename="SAP_FICO_INCENTIVE_20260201_100000.csv"
```

#### Response (400)
```json
{ "error": "programId and periodStart are required" }
```

#### Notes
- Only `APPROVED` results with `total_incentive > 0` are exported.
- Logged to `outbound_file_log` with `target_system = 'SAP_FICO'`.

---

### POST `/api/integration/export/oracle-financials`
**Tag:** Integration - Outbound
**Auth:** Required (User)

Generate Oracle Accounts Payable CSV file for approved incentive results.

#### Request
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `programId` | integer | ✅ | Program ID | `12` |
| `periodStart` | date | ✅ | Period start date | `"2025-07-01"` |

```json
{
  "programId": 12,
  "periodStart": "2025-07-01"
}
```

#### Response (200) — CSV Download
```
Content-Type: text/csv
Content-Disposition: attachment; filename="ORACLE_AP_INCENTIVE_20250716_143022.csv"
```

**CSV columns:**
| Column | Description | Example |
|--------|-------------|---------|
| `OPERATING_UNIT` | Oracle operating unit | `KGILS India` |
| `SUPPLIER_NUMBER` | Agent code | `AGT-5001` |
| `SUPPLIER_NAME` | Agent name | `Ravi Kumar` |
| `INVOICE_NUMBER` | Generated invoice number | `INC-12-202507-AGT-5001` |
| `INVOICE_DATE` | DD-MON-YYYY format | `16-JUL-2025` |
| `INVOICE_AMOUNT` | Incentive amount | `25000.00` |
| `INVOICE_CURRENCY` | Currency code | `INR` |
| `PAYMENT_TERMS` | Payment terms | `IMMEDIATE` |
| `DESCRIPTION` | Line description | `Sales Incentive - Jul 2025 - Agency` |
| `LINE_TYPE` | Line type | `ITEM` |
| `LINE_AMOUNT` | Line amount | `25000.00` |
| `ACCOUNT_CODE` | GL account code | `6100.00.000` |
| `COST_CENTER` | Channel code | `AGN` |
| `PROJECT_CODE` | Program reference | `PRG-12` |

#### Response (400)
```json
{ "error": "programId and periodStart are required" }
```

#### Response (404)
```json
{ "error": "No approved incentive results found for the given program and period" }
```

#### Notes
- Only `APPROVED` results with `total_incentive > 0` are exported.
- Logged to `outbound_file_log` with status `GENERATED`.
- Configuration via env variables: `ORACLE_OPERATING_UNIT`, `ORACLE_CURRENCY`, `ORACLE_PAYMENT_TERMS`, `ORACLE_GL_ACCOUNT`.
- Policy number masking is **not** applied to export endpoints.

---

### GET `/api/integration/export/history`
**Tag:** Integration - Outbound
**Auth:** Required (User)

View history of generated export files from `outbound_file_log`.

#### Response (200)
```json
[
  {
    "id": 1,
    "file_name": "ORACLE_AP_INCENTIVE_20260201_100000.csv",
    "target_system": "ORACLE_AP",
    "program_id": 12,
    "period_start": "2026-01-01",
    "record_count": 85,
    "total_amount": 450000.00,
    "generated_by": "finance.head",
    "generated_at": "2026-02-01T10:00:00.000Z",
    "status": "GENERATED"
  }
]
```

---

## INTEGRATION — STATUS & TRIGGERS

### GET `/api/integration/status`
**Tag:** Integration - Status
**Auth:** Required (User)

Get connection health and last sync status for all integration systems.

#### Response (200)
```json
{
  "lifeAsia": {
    "lastFile": "POLICY_TXN_20250715.csv",
    "recordsProcessed": 1250,
    "status": "SUCCESS",
    "lastReceived": "2025-07-15T20:30:00.000Z"
  },
  "penta": {
    "lastSync": "2025-07-15T08:30:00.000Z",
    "status": "SUCCESS",
    "lastCall": "2025-07-15T08:30:00.000Z",
    "durationMs": 45
  },
  "hierarchy": {
    "lastSync": "2025-07-15T21:00:00.000Z",
    "agentsSynced": 2500,
    "status": "SUCCESS",
    "lastCompleted": "2025-07-15T21:02:30.000Z"
  },
  "outbound": {
    "lastFile": "ORACLE_AP_INCENTIVE_20250716_143022.csv",
    "targetSystem": "ORACLE_AP",
    "recordCount": 85,
    "totalAmount": 450000.00,
    "status": "GENERATED",
    "generatedAt": "2025-07-16T14:30:22.000Z"
  }
}
```

---

### GET `/api/integration/file-log`
**Tag:** Integration - Status
**Auth:** Required (User)

Get recent file processing log entries.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `limit` | query | integer | | Max results (default 20, max 100) |

#### Response (200)
```json
[
  {
    "id": 42,
    "file_name": "POLICY_TXN_20250715.csv",
    "source_system": "LIFEASIA",
    "file_type": "POLICY_TRANSACTIONS",
    "batch_id": "SFTP_1752595200000",
    "total_rows": 1300,
    "valid_rows": 1250,
    "error_rows": 50,
    "inserted_rows": 1250,
    "updated_rows": 0,
    "status": "SUCCESS",
    "started_at": "2025-07-15T20:30:00.000Z",
    "completed_at": "2025-07-15T20:30:45.000Z"
  }
]
```

---

### GET `/api/integration/audit-log`
**Tag:** Integration - Status
**Auth:** Required (User)

Get recent API call audit log entries.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `limit` | query | integer | | Max results (default 50, max 200) |
| `source` | query | string | | Filter by source system (e.g. `PENTA`) |

#### Response (200)
```json
[
  {
    "id": 100,
    "source_system": "PENTA",
    "direction": "INBOUND",
    "endpoint": "/api/integration/penta/policy-data",
    "method": "POST",
    "records_received": 25,
    "records_processed": 25,
    "records_failed": 0,
    "status": "SUCCESS",
    "called_at": "2025-07-15T08:30:00.000Z",
    "completed_at": "2025-07-15T08:30:02.000Z",
    "duration_ms": 2000
  }
]
```

---

### GET `/api/integration/failed-records`
**Tag:** Integration - Status
**Auth:** Required (User)

Get staging records with errors.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `table` | query | string | | `stg_policy_transactions` (default) or `stg_agent_master` |
| `limit` | query | integer | | Max results (default 50, max 200) |

#### Response (200)
```json
[
  {
    "id": 5001,
    "policy_number": "POL-INVALID",
    "agent_code": "AGT-9999",
    "batch_id": "PENTA_1752595200000",
    "row_number": 15,
    "stg_status": "INVALID",
    "stg_error": "Agent code not found in master data"
  }
]
```

#### Notes
- Only records with `stg_status IN ('INVALID', 'ERROR')` are returned.
- Table name is whitelisted to prevent SQL injection.

---

### POST `/api/integration/failed-records/{id}/skip`
**Tag:** Integration - Status
**Auth:** Required (User)

Skip (reject) a failed staging record by setting its status to `SKIPPED`.

#### Request
| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | integer | ✅ | Staging record ID |
| `table` | query | string | | `stg_policy_transactions` (default) or `stg_agent_master` |

#### Response (200)
```json
{ "success": true }
```

---

### POST `/api/integration/trigger/sftp-poll`
**Tag:** Integration - Status
**Auth:** Required (User)

Manually trigger an SFTP poll cycle to check for new LifeAsia files.

#### Request
No body required.

#### Response (200)
```json
{
  "success": true,
  "message": "SFTP poll triggered"
}
```

#### Notes
- Runs asynchronously; returns immediately.
- Requires `SFTP_HOST` environment variable to be configured.

---

### POST `/api/integration/trigger/hierarchy-sync`
**Tag:** Integration - Status
**Auth:** Required (User)

Manually trigger a hierarchy sync to refresh agent reporting structures.

#### Request
No body required.

#### Response (200)
```json
{
  "success": true,
  "message": "Hierarchy sync triggered"
}
```

#### Notes
- Runs asynchronously; returns immediately.
- Requires `HIERARCHY_API_BASE` environment variable to be configured.

---

### POST `/api/integration/trigger/reprocess`
**Tag:** Integration - Status
**Auth:** Required (User)

Reprocess all failed staging records by resetting them to PENDING status.

#### Request
No body required.

#### Response (200)
```json
{
  "success": true,
  "reprocessed": 14
}
```

#### Notes
- Resets `stg_status` from `INVALID`/`ERROR` to `PENDING` in `stg_policy_transactions`.
- Clears `stg_error` for reprocessed records.

---

## Appendix

### Pipeline Status Flow

```
DRAFT → APPROVED → INITIATED → PAID
```

| Status | Meaning |
|--------|---------|
| `DRAFT` | Calculated, pending review |
| `APPROVED` | Reviewed and approved (persistency gate passed) |
| `INITIATED` | Payment initiated in banking system |
| `PAID` | Payment confirmed |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `SYSTEM_JWT_SECRET` | Secret for system JWT signing | *(required)* |
| `SFTP_HOST` | LifeAsia SFTP host | *(optional)* |
| `HIERARCHY_API_BASE` | Hierarchy API base URL | *(optional)* |
| `ORACLE_OPERATING_UNIT` | Oracle AP operating unit | `KGILS India` |
| `ORACLE_CURRENCY` | Oracle AP currency | `INR` |
| `ORACLE_PAYMENT_TERMS` | Oracle AP payment terms | `IMMEDIATE` |
| `ORACLE_GL_ACCOUNT` | Oracle AP GL account | `6100.00.000` |

### Rate Limits
No rate limiting is currently implemented on any endpoint.

### Data Masking
Policy numbers in JSON responses are masked (e.g. `POL****234`) when `POLICY_MASK_ENABLED = true` in `system_config`. The masking middleware automatically intercepts `res.json()` calls. Export endpoints at `/api/integration/export/*` are exempt.
