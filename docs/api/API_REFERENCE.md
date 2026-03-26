# Incentive Management System — API Reference

> **Version:** 1.0.0 · **Base path:** `/api` · **Interactive docs:** [Swagger UI](/api/docs)

---

## Base URLs

| Environment | URL | Backend |
|-------------|-----|---------|
| Development (Node.js — deprecated) | `http://localhost:5000/api` | Node.js Express |
| Development (.NET 10 — **current**) | `http://localhost:5001/api` | .NET 10 API |
| UAT | `https://uat-api.incentive.yourdomain.com/api` | .NET 10 API |
| Production  | `https://api.incentive.yourdomain.com/api` | .NET 10 API |

> **Note:** As of March 2026, the .NET 10 backend is the active business API.
> The Node.js backend is deprecated and being decommissioned.
> Set `VITE_API_URL` to point to the .NET API URL.

---

## Authentication

The system uses two authentication mechanisms:

### 1. User Auth (JWT Bearer — .NET 10)

Used by the web UI for all authenticated API calls.

1. Call `POST /api/auth/login` with `{ email, password }` to obtain a JWT.
2. Include the token in all subsequent requests:
   ```
   Authorization: Bearer <token>
   ```
3. Tokens expire after the configured `Jwt:ExpiryHours` (default: 24 hours).
4. Call `GET /api/auth/me` to get the current user's profile.
5. Role-based authorization is enforced on all business endpoints.

### 2. System Token (machine-to-machine)

Used by external systems (Penta, LifeAsia) to call inbound integration endpoints.

1. Obtain a JWT by calling `POST /api/auth/system-token` with registered `client_id` and `client_secret`.
2. Include the token in all subsequent requests:
   ```
   Authorization: Bearer <token>
   ```
3. Tokens expire after **24 hours**.
4. Each client has an `allowed_endpoints` whitelist; requests to non-whitelisted paths are rejected with `401 ENDPOINT_NOT_ALLOWED`.

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

## REVIEW ADJUSTMENTS

### GET `/api/review-adjustments`
**Tag:** Review Adjustments  
**Auth:** Required (User)

List incentive results with adjustments for review. Supports filtering and pagination. Reads from existing `ins_incentive_results` with additive joins to `incentive_adjustments`. Does not modify base calculation data.

#### Request
| Parameter | In | Type | Required | Description | Example |
|---|---|---|---|---|---|
| `programId` | query | integer | | Filter by program | `12` |
| `periodStart` | query | string | | Filter by period start | `2026-01-01` |
| `channel` | query | integer | | Filter by channel ID | `3` |
| `status` | query | string | | Filter by status (DRAFT, APPROVED, INITIATED, PAID, HOLD) | `APPROVED` |
| `search` | query | string | | Search agent code or name | `AGT-001` |
| `limit` | query | integer | | Results per page (default: 50) | `50` |
| `offset` | query | integer | | Pagination offset (default: 0) | `0` |

#### Response (200)
```json
{
  "summary": {
    "total_calculated": 127550,
    "total_held": 0,
    "total_adjustments": 5000,
    "net_payout": 132550,
    "total_count": 20
  },
  "rows": [
    {
      "id": 1,
      "agent_code": "AGT-JR-001",
      "program_id": 1,
      "period_start": "2025-07-01",
      "period_end": "2025-09-30",
      "calculated": 8500,
      "net_self_incentive": 8500,
      "total_override": 0,
      "status": "DRAFT",
      "persistency_gate_passed": true,
      "agent_name": "John Reyes",
      "channel_name": "Direct Sales",
      "region_name": "NCR",
      "program_name": "Q3 2025 Sales Incentive",
      "adjustment": 0,
      "hold_count": 0,
      "total_payout": 8500
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 20 }
}
```

#### Notes
- HOLD status is virtual — derived from unapplied hold adjustments in `incentive_adjustments`
- Reads existing `ins_incentive_results`; adjustments are from additive table only
- Does not impact base calculation math

---

### GET `/api/review-adjustments/{id}`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Get a single incentive result detail including all adjustments and audit trail.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Incentive result ID |

#### Response (200)
```json
{
  "id": 1,
  "agent_code": "AGT-JR-001",
  "program_id": 1,
  "period_start": "2025-07-01",
  "period_end": "2025-09-30",
  "total_incentive": 8500,
  "net_self_incentive": 8500,
  "total_override": 0,
  "status": "DRAFT",
  "persistency_gate_passed": true,
  "agent_name": "John Reyes",
  "branch_code": "BR-NCR-001",
  "hierarchy_level": "Agent",
  "channel_name": "Direct Sales",
  "region_name": "NCR",
  "program_name": "Q3 2025 Sales Incentive",
  "nb_achievement_pct": 120.5,
  "nb_total_premium": 250000,
  "persistency_13m": 88.5,
  "nb_policy_count": 12,
  "nb_target_premium": 200000,
  "adjustments": [
    {
      "id": 1,
      "result_id": 1,
      "adjustment_amount": 5000,
      "adjustment_type": "MANUAL",
      "reason": "Manager bonus",
      "created_by": "admin",
      "notes": "Approved by regional head",
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "auditTrail": [
    {
      "id": 1,
      "result_id": 1,
      "action": "ADJUST",
      "actor": "admin",
      "details": { "amount": 5000, "reason": "Manager bonus" },
      "created_at": "2025-10-01T10:00:00Z"
    }
  ]
}
```

#### Response (404)
```json
{
  "success": false,
  "error": "Referenced record not found",
  "code": "VAL_006"
}
```

#### Notes
- Joins `ins_incentive_results`, `ins_agents`, `channels`, `ins_regions`, `incentive_programs`, `ins_agent_kpi_summary`
- Adjustments from additive `incentive_adjustments` table
- Audit trail from additive `incentive_review_actions` table

---

### POST `/api/review-adjustments/{id}/adjust`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Apply a manual adjustment (additive only) to an incentive result. Writes to the additive `incentive_adjustments` table. Does not modify `ins_incentive_results`.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Incentive result ID |
| `amount` | body | number | ✅ | Adjustment amount (positive or negative) |
| `reason` | body | string | | Reason for adjustment |
| `notes` | body | string | | Additional notes |
| `adjustedBy` | body | string | | User performing the adjustment |

```json
{
  "amount": 5000,
  "reason": "Manager performance bonus",
  "notes": "Approved by regional head",
  "adjustedBy": "admin"
}
```

#### Response (200)
```json
{
  "success": true,
  "adjustment": {
    "id": 1,
    "result_id": 1,
    "adjustment_amount": 5000,
    "adjustment_type": "MANUAL",
    "reason": "Manager performance bonus",
    "created_by": "admin",
    "notes": "Approved by regional head",
    "created_at": "2025-10-01T10:00:00Z"
  }
}
```

#### Response (400)
```json
{
  "success": false,
  "error": "Required field missing",
  "code": "VAL_001",
  "details": "amount is required"
}
```

#### Response (422)
```json
{
  "success": false,
  "error": "Cannot modify APPROVED/PAID result",
  "code": "BUS_003"
}
```

#### Notes
- Inserts into `incentive_adjustments` with type `MANUAL`
- Also inserts audit record into `incentive_review_actions`
- Cannot adjust results in PAID status
- Does not change base calculation result in `ins_incentive_results`

---

### POST `/api/review-adjustments/{id}/hold`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Place an incentive result on hold. Creates an additive HOLD record in `incentive_adjustments`. Does not change the result status in `ins_incentive_results`.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Incentive result ID |
| `reason` | body | string | | Reason for hold |
| `heldBy` | body | string | | User placing the hold |

```json
{
  "reason": "Pending compliance review",
  "heldBy": "compliance.officer"
}
```

#### Response (200)
```json
{
  "success": true,
  "held": true
}
```

#### Response (404)
```json
{
  "success": false,
  "error": "Referenced record not found",
  "code": "VAL_006"
}
```

#### Notes
- Inserts into `incentive_adjustments` with type `HOLD`
- Also inserts audit record into `incentive_review_actions`
- Hold is additive — the base result status in `ins_incentive_results` is NOT changed
- Held results are skipped during batch-approve

---

### POST `/api/review-adjustments/{id}/release`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Release a held incentive result. Creates an additive RELEASE record in `incentive_adjustments`.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Incentive result ID |
| `releasedBy` | body | string | | User releasing the hold |

```json
{
  "releasedBy": "compliance.officer"
}
```

#### Response (200)
```json
{
  "success": true,
  "released": true
}
```

#### Notes
- Inserts into `incentive_adjustments` with type `RELEASE`
- Also inserts audit record into `incentive_review_actions`
- Release is additive — does not modify base result

---

### POST `/api/review-adjustments/batch-approve`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Batch approve multiple incentive results. Skips held results and those that failed the persistency gate. Updates `ins_incentive_results.status` to APPROVED and writes an additive audit trail.

#### Request
| Field | In | Type | Required | Description |
|---|---|---|---|---|
| `ids` | body | integer[] | ✅ | Array of result IDs to approve |
| `approvedBy` | body | string | | User performing the approval |

```json
{
  "ids": [1, 2, 3, 4, 5],
  "approvedBy": "finance.head"
}
```

#### Response (200)
```json
{
  "approved": 3,
  "skipped_held": 1,
  "skipped_gate_failed": 1
}
```

#### Response (400)
```json
{
  "success": false,
  "error": "Required field missing",
  "code": "VAL_001",
  "details": "ids must be a non-empty array"
}
```

#### Notes
- Uses existing approval logic (same as existing bulk-approve)
- Skips results that have unapplied holds
- Skips results where `persistency_gate_passed = false`
- Creates `BATCH_APPROVE` audit record in `incentive_review_actions` for each approved result
- Does not bypass any calculation or persistency gate logic

---

### GET `/api/review-adjustments/{id}/audit`
**Tag:** Review Adjustments  
**Auth:** Required (User)

Get full audit trail (review actions and adjustments) for a specific incentive result.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Incentive result ID |

#### Response (200)
```json
{
  "actions": [
    {
      "id": 1,
      "result_id": 1,
      "action": "ADJUST",
      "actor": "admin",
      "details": { "amount": 5000, "reason": "Manager bonus" },
      "created_at": "2025-10-01T10:00:00Z"
    },
    {
      "id": 2,
      "result_id": 1,
      "action": "BATCH_APPROVE",
      "actor": "finance.head",
      "details": {},
      "created_at": "2025-10-02T08:00:00Z"
    }
  ],
  "adjustments": [
    {
      "id": 1,
      "result_id": 1,
      "adjustment_amount": 5000,
      "adjustment_type": "MANUAL",
      "reason": "Manager bonus",
      "created_by": "admin",
      "notes": "Approved by regional head",
      "created_at": "2025-10-01T10:00:00Z"
    }
  ]
}
```

#### Notes
- Reads from additive tables `incentive_review_actions` and `incentive_adjustments`
- Both tables are ordered by `created_at DESC`

---

## EXCEPTION LOG

### GET `/api/exception-log`
**Tag:** Exception Log  
**Auth:** Required (User)

List operational exceptions with filtering, search, and pagination. Reads from additive `operational_exceptions` table. Does not impact base calculation tables.

#### Request
| Parameter | In | Type | Required | Description | Example |
|---|---|---|---|---|---|
| `type` | query | string | | Filter by exception type | `DATA_QUALITY` |
| `status` | query | string | | Filter by status (OPEN, INVESTIGATING, RESOLVED, DISMISSED) | `OPEN` |
| `severity` | query | string | | Filter by severity (LOW, MEDIUM, HIGH, CRITICAL) | `HIGH` |
| `source` | query | string | | Filter by source system | `LifeAsia` |
| `search` | query | string | | Search entity_id, description, or exception_type | `AGT-001` |
| `limit` | query | integer | | Results per page (default: 25) | `25` |
| `offset` | query | integer | | Pagination offset (default: 0) | `0` |

#### Response (200)
```json
{
  "summary": {
    "open_count": 5,
    "resolved_today": 2,
    "critical_count": 1,
    "sources_affected": 3,
    "total_count": 15
  },
  "rows": [
    {
      "id": 1,
      "exception_type": "DATA_QUALITY",
      "status": "OPEN",
      "severity": "HIGH",
      "source_system": "LifeAsia",
      "entity_id": "AGT-001",
      "description": "Agent missing branch code",
      "resolution_note": null,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2025-10-01T08:00:00Z"
    }
  ],
  "pagination": { "limit": 25, "offset": 0, "total": 15 }
}
```

#### Notes
- Summary is computed from aggregate queries on `operational_exceptions`
- Reads only from additive table; no impact on calculation tables
- `resolved_today` counts exceptions resolved since midnight UTC

---

### GET `/api/exception-log/{id}`
**Tag:** Exception Log  
**Auth:** Required (User)

Get a single exception detail by ID.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Exception ID |

#### Response (200)
```json
{
  "id": 1,
  "exception_type": "DATA_QUALITY",
  "status": "OPEN",
  "severity": "HIGH",
  "source_system": "LifeAsia",
  "entity_id": "AGT-001",
  "description": "Agent missing branch code",
  "before_value": null,
  "after_value": null,
  "reason_code": null,
  "resolution_note": null,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2025-10-01T08:00:00Z"
}
```

#### Response (404)
```json
{
  "success": false,
  "error": "Referenced record not found",
  "code": "VAL_006"
}
```

---

### POST `/api/exception-log/{id}/resolve`
**Tag:** Exception Log  
**Auth:** Required (User)

Resolve or dismiss an operational exception. Updates the additive `operational_exceptions` table only. Does not change incentive result status unless explicitly coded elsewhere.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Exception ID |
| `status` | body | string | | Resolution status: RESOLVED or DISMISSED (default: RESOLVED) |
| `resolvedBy` | body | string | | User resolving the exception |
| `note` | body | string | | Resolution note |

```json
{
  "status": "RESOLVED",
  "resolvedBy": "ops.manager",
  "note": "Agent branch code corrected in master data"
}
```

#### Response (200)
```json
{
  "success": true,
  "exception": {
    "id": 1,
    "exception_type": "DATA_QUALITY",
    "status": "RESOLVED",
    "severity": "HIGH",
    "source_system": "LifeAsia",
    "entity_id": "AGT-001",
    "description": "Agent missing branch code",
    "resolution_note": "Agent branch code corrected in master data",
    "resolved_by": "ops.manager",
    "resolved_at": "2025-10-01T14:00:00Z",
    "created_at": "2025-10-01T08:00:00Z"
  }
}
```

#### Response (400)
```json
{
  "success": false,
  "error": "Invalid enum value",
  "code": "VAL_003",
  "details": "status must be RESOLVED or DISMISSED"
}
```

#### Response (404)
```json
{ "error": "Exception not found or already resolved" }
```

#### Notes
- Only updates additive `operational_exceptions` table
- Does not change incentive result status
- Already-resolved exceptions cannot be resolved again

---

## EXECUTIVE DASHBOARD

### GET `/api/dashboard/executive-summary`
**Tag:** Executive Dashboard  
**Auth:** Required (User)

Executive-level summary with KPI cards, alert counts, pipeline status, channel performance, and recent activity. Designed for the executive dashboard UI.

#### Request
| Parameter | In | Type | Required | Description | Example |
|---|---|---|---|---|---|
| `programId` | query | integer | | Filter by program | `1` |
| `period` | query | string | | Filter by period (YYYY-MM-DD) | `2025-07-01` |

#### Response (200)
```json
{
  "kpiCards": {
    "activeSchemes": 3,
    "processingPayouts": 5,
    "pendingApprovals": 12,
    "netPayout": 127550,
    "totalRecords": 20
  },
  "alerts": {
    "openExceptions": 5,
    "unreadNotifications": 8
  },
  "pipeline": {
    "DRAFT": { "count": 12, "total": 85000 },
    "APPROVED": { "count": 5, "total": 35000 },
    "INITIATED": { "count": 2, "total": 5000 },
    "PAID": { "count": 1, "total": 2550 }
  },
  "channelPerformance": [
    {
      "channel": "Direct Sales",
      "self_incentive": 95000,
      "override_incentive": 12000,
      "total_incentive": 107000,
      "agent_count": 12
    }
  ],
  "recentActivity": [
    {
      "type": "calculation",
      "message": "Calculation completed for Q3 program",
      "time": "Oct 1, 2025 10:00 AM",
      "icon": "📊"
    }
  ],
  "lastSync": "2025-10-01T10:30:00.000Z"
}
```

#### Notes
- Aggregates data from `incentive_programs`, `ins_incentive_results`, `ins_agents`, `channels`
- Alert counts read from additive tables `operational_exceptions` and `notification_events` (wrapped in try-catch)
- Pipeline mirrors the existing stage-summary endpoint data
- **Auth observation:** Route uses `userAuth` middleware; no additional role-based restriction currently applied

---

## SYSTEM STATUS

### GET `/api/system-status/summary`
**Tag:** System Status  
**Auth:** Required (User)

System health overview including database connectivity, sync timestamps, integration counts, and file processing status.

#### Request
No parameters.

#### Response (200)
```json
{
  "database": { "status": "CONNECTED" },
  "syncStatus": {
    "HIERARCHY_LAST_SYNC": { "value": "2025-10-01T08:00:00Z", "updatedAt": "2025-10-01T08:00:00Z" },
    "LIFEASIA_LAST_FILE": { "value": "policy_202510.csv", "updatedAt": "2025-10-01T06:00:00Z" },
    "PENTA_LAST_SYNC": { "value": "2025-10-01T09:00:00Z", "updatedAt": "2025-10-01T09:00:00Z" }
  },
  "integrationCounts": {
    "LifeAsia": { "SUCCESS": 42, "FAILURE": 1 },
    "Penta": { "SUCCESS": 38, "FAILURE": 0 }
  },
  "fileProcessing": {
    "COMPLETED": 12,
    "PENDING": 2,
    "ERROR": 0
  },
  "serverTime": "2025-10-01T10:30:00.000Z"
}
```

#### Response (500)
```json
{
  "database": { "status": "ERROR" },
  "serverTime": "2025-10-01T10:30:00.000Z"
}
```

#### Notes
- Each subsection is wrapped in try-catch; partial results returned if a subsystem is unavailable
- Reads from `system_config`, `integration_audit_log`, `file_processing_log`
- Does not read from or affect calculation tables

---

## NOTIFICATIONS

### GET `/api/notifications`
**Tag:** Notifications  
**Auth:** Required (User)

List notification events with optional filtering by read status and type. Reads from additive `notification_events` table.

#### Request
| Parameter | In | Type | Required | Description | Example |
|---|---|---|---|---|---|
| `unreadOnly` | query | string | | Filter to unread only (`"true"`) | `true` |
| `type` | query | string | | Filter by event type | `CALCULATION_COMPLETE` |
| `limit` | query | integer | | Results per page (default: 20) | `20` |
| `offset` | query | integer | | Pagination offset (default: 0) | `0` |

#### Response (200)
```json
{
  "rows": [
    {
      "id": 1,
      "event_type": "CALCULATION_COMPLETE",
      "message": "Q3 calculation completed for 20 agents",
      "is_read": false,
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "total": 15,
  "unread": 8
}
```

#### Notes
- Event types: CALCULATION_COMPLETE, APPROVAL_REQUIRED, EXCEPTION_RAISED, PAYOUT_INITIATED, INTEGRATION_ERROR, SCHEME_PUBLISHED
- Reads only from additive `notification_events` table

---

### POST `/api/notifications/{id}/read`
**Tag:** Notifications  
**Auth:** Required (User)

Mark a single notification as read.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Notification ID |

No request body.

#### Response (200)
```json
{ "success": true }
```

#### Notes
- Updates `is_read = true` in `notification_events`
- Additive table only; no impact on calculation data

---

### POST `/api/notifications/mark-all-read`
**Tag:** Notifications  
**Auth:** Required (User)

Mark all unread notifications as read.

#### Request
No parameters or body.

#### Response (200)
```json
{
  "success": true,
  "updated": 8
}
```

#### Notes
- Bulk updates `notification_events` where `is_read = false`

---

## ORG & DOMAIN MAPPING

### GET `/api/org-domain-mapping`
**Tag:** Org & Domain Mapping  
**Auth:** Required (User)

Hierarchical organizational mapping with summary metrics and grouped data. Supports four view dimensions. Reads from existing master tables only.

#### Request
| Parameter | In | Type | Required | Description | Example |
|---|---|---|---|---|---|
| `view` | query | string | | Grouping dimension: `region`, `channel`, `branch`, `designation` (default: `region`) | `channel` |

#### Response (200) — view=region
```json
{
  "summary": {
    "total_agents": 50,
    "active_agents": 45,
    "regions": 5,
    "channels": 3,
    "branches": 12
  },
  "view": "region",
  "groupedData": [
    {
      "id": 1,
      "region_name": "NCR",
      "region_code": "NCR",
      "zone": "Luzon",
      "agent_count": 15,
      "active_count": 14,
      "branch_count": 4
    }
  ],
  "products": [
    {
      "product_category": "Life",
      "count": 10,
      "active_count": 8
    }
  ]
}
```

#### Response (200) — view=channel
```json
{
  "summary": { "total_agents": 50, "active_agents": 45, "regions": 5, "channels": 3, "branches": 12 },
  "view": "channel",
  "groupedData": [
    {
      "id": 1,
      "name": "Direct Sales",
      "code": "DS",
      "agent_count": 20,
      "active_count": 18,
      "region_count": 3,
      "branch_count": 6
    }
  ],
  "products": [...]
}
```

#### Response (200) — view=branch
```json
{
  "summary": { "..." : "..." },
  "view": "branch",
  "groupedData": [
    {
      "branch_code": "BR-NCR-001",
      "region_name": "NCR",
      "channel_name": "Direct Sales",
      "agent_count": 5,
      "active_count": 4
    }
  ],
  "products": [...]
}
```

#### Response (200) — view=designation
```json
{
  "summary": { "..." : "..." },
  "view": "designation",
  "groupedData": [
    {
      "hierarchy_level": "Agent",
      "agent_count": 30,
      "active_count": 28,
      "channel_count": 3
    }
  ],
  "products": [...]
}
```

#### Notes
- Reads from existing master tables: `ins_agents`, `ins_regions`, `channels`, `ins_products`
- Does not read from or impact calculation or additive tables
- Product summary is always included regardless of view dimension

---

## KPI CONFIG HELPERS

### GET `/api/kpi-config/registry`
**Tag:** KPI Config  
**Auth:** Required (User)

Full KPI registry with stats, all KPI definitions enriched with milestones and program info, and derived variables. Designed to power the KPI Config workspace UI.

#### Request
No parameters.

#### Response (200)
```json
{
  "stats": {
    "totalKPIs": 8,
    "activeKPIs": 6,
    "programsLinked": 3,
    "derivedVariables": 5
  },
  "kpis": [
    {
      "id": 1,
      "kpi_name": "New Business Premium",
      "program_id": 1,
      "program_name": "Q3 2025 Sales Incentive",
      "program_status": "ACTIVE",
      "channel_name": "Direct Sales",
      "sort_order": 1,
      "milestones": [
        {
          "id": 1,
          "kpi_id": 1,
          "milestone_label": "Base",
          "range_from": 0,
          "range_to": 80,
          "sort_order": 1,
          "achievement_value": 50
        }
      ]
    }
  ],
  "derivedVariables": [
    {
      "id": 1,
      "var_name": "nb_premium_ratio",
      "var_description": "NB premium as percentage of target",
      "formula": "nb_total_premium / nb_target_premium * 100"
    }
  ]
}
```

#### Notes
- Joins `kpi_definitions`, `incentive_programs`, `channels`, `kpi_milestones`
- Reads existing tables only; no additive table dependency
- Milestones embedded as JSON array per KPI

---

### POST `/api/kpi-config/{id}/validate`
**Tag:** KPI Config  
**Auth:** Required (User)

Validate a KPI configuration including checking for milestones and payout slab linkages.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | KPI definition ID |

No request body.

#### Response (200) — valid
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "milestoneCount": 4,
  "payoutSlabLinks": 2
}
```

#### Response (200) — validation issues found
```json
{
  "valid": false,
  "errors": [
    { "field": "milestones", "message": "No milestones defined for this KPI" }
  ],
  "warnings": [
    { "field": "payout_slabs", "message": "No payout slabs linked to this KPI" }
  ],
  "milestoneCount": 0,
  "payoutSlabLinks": 0
}
```

#### Response (404)
```json
{ "error": "KPI definition not found" }
```

#### Notes
- Validates against `kpi_definitions`, `incentive_programs`, `kpi_milestones`, `payout_slabs`
- Read-only validation; does not modify any data
- Returns structured errors and warnings for UI display

---

### GET `/api/kpi-config/{id}/summary`
**Tag:** KPI Config  
**Auth:** Required (User)

Get comprehensive KPI summary including milestones, payout slabs, and qualifying rules.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | KPI definition ID |

#### Response (200)
```json
{
  "id": 1,
  "kpi_name": "New Business Premium",
  "program_id": 1,
  "program_name": "Q3 2025 Sales Incentive",
  "program_status": "ACTIVE",
  "channel_name": "Direct Sales",
  "sort_order": 1,
  "milestones": [
    {
      "id": 1,
      "kpi_id": 1,
      "milestone_label": "Base",
      "range_from": 0,
      "range_to": 80,
      "sort_order": 1
    }
  ],
  "payoutSlabs": [
    {
      "id": 1,
      "payout_rule_id": 1,
      "kpi_id": 1,
      "rule_name": "Standard Commission",
      "sort_order": 1
    }
  ],
  "qualifyingRules": [
    {
      "id": 1,
      "payout_rule_id": 1,
      "kpi_id": 1,
      "rule_name": "Standard Commission"
    }
  ]
}
```

#### Response (404)
```json
{ "error": "KPI definition not found" }
```

#### Notes
- Joins `kpi_definitions`, `incentive_programs`, `channels`, `kpi_milestones`, `payout_slabs`, `payout_rules`, `payout_qualifying_rules`
- Read-only endpoint for UI display

---

## PROGRAMS — PREVIEW

### GET `/api/programs/{id}/preview`
**Tag:** Programs  
**Auth:** Required (User)

Full program preview with associated KPIs (with milestones), payout rules (with slabs), qualifying rules, agent count, and result statistics. Designed to power the Scheme Management preview panel.

#### Request
| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | ✅ | Program ID |

#### Response (200)
```json
{
  "id": 1,
  "name": "Q3 2025 Sales Incentive",
  "description": "Quarterly incentive for direct sales agents",
  "status": "ACTIVE",
  "channel_id": 1,
  "start_date": "2025-07-01",
  "end_date": "2025-09-30",
  "created_by": "admin",
  "created_at": "2025-06-15T10:00:00Z",
  "updated_at": "2025-06-20T14:00:00Z",
  "channel": { "name": "Direct Sales", "code": "DS" },
  "kpis": [
    {
      "id": 1,
      "program_id": 1,
      "kpi_name": "New Business Premium",
      "sort_order": 1,
      "milestones": [
        { "id": 1, "kpi_id": 1, "milestone_label": "Base", "range_from": 0, "range_to": 80, "sort_order": 1 }
      ]
    }
  ],
  "payoutRules": [
    {
      "id": 1,
      "program_id": 1,
      "rule_name": "Standard Commission",
      "slabs": [
        { "id": 1, "payout_rule_id": 1, "kpi_id": 1, "sort_order": 1 }
      ]
    }
  ],
  "qualifyingRules": [
    { "id": 1, "payout_rule_id": 1, "kpi_id": 1, "rule_name": "Standard Commission", "kpi_name": "New Business Premium" }
  ],
  "agentCount": 20,
  "resultStats": {
    "DRAFT": { "count": 12, "total": 85000 },
    "APPROVED": { "count": 5, "total": 35000 },
    "INITIATED": { "count": 2, "total": 5000 },
    "PAID": { "count": 1, "total": 2550 }
  }
}
```

#### Response (404)
```json
{
  "success": false,
  "error": "Referenced record not found",
  "code": "VAL_006"
}
```

#### Notes
- Composite endpoint joining `incentive_programs`, `channels`, `kpi_definitions`, `kpi_milestones`, `payout_rules`, `payout_slabs`, `payout_qualifying_rules`, `ins_agents`, `ins_incentive_results`
- Read-only preview; no data modification
- Uses existing tables only; not dependent on additive tables

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
