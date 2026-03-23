# Inbound Penta API — Integration Specification

> REST API specification for receiving policy data **FROM** the KGILS Penta System **INTO** the Incentive Management System.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Base URL & Headers](#2-base-url--headers)
3. [API Endpoints](#3-api-endpoints)
   - [POST /api/penta/policy-transactions](#31-post-apipentapolicy-transactions)
   - [POST /api/penta/policy-status](#32-post-apipentapolicy-status)
   - [GET /api/penta/heartbeat](#33-get-apipentaheartbeat)
4. [Data Dictionary](#4-data-dictionary)
5. [Error Handling](#5-error-handling)
6. [Idempotency & Deduplication](#6-idempotency--deduplication)
7. [Rate Limiting](#7-rate-limiting)
8. [Reconciliation (CSV Fallback)](#8-reconciliation-csv-fallback)
9. [Testing & Sandbox](#9-testing--sandbox)

---

## 1. Authentication

| Attribute          | Detail                                              |
|--------------------|-----------------------------------------------------|
| **Type**           | JWT Bearer Token                                    |
| **Token Endpoint** | `POST /api/auth/system-token`                       |
| **Token Expiry**   | 24 hours                                            |
| **Header**         | `Authorization: Bearer <token>`                     |

### Obtain a Token

**Request:**

```http
POST /api/auth/system-token
Content-Type: application/json

{
  "client_id": "PENTA_SYS",
  "client_secret": "***"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

**Response (401 Unauthorized):**

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid client_id or client_secret."
}
```

### Token Usage

Include the token in the `Authorization` header for every subsequent API call:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Refresh

- Tokens are valid for **24 hours** from issuance.
- Request a new token before the current one expires.
- There is no refresh-token flow — call the token endpoint again.

---

## 2. Base URL & Headers

| Environment | Base URL                                       |
|-------------|------------------------------------------------|
| Production  | `https://incentive.example.com`                |
| UAT         | `https://incentive-uat.example.com`            |

**Required headers for all API calls:**

| Header            | Value                          | Required |
|-------------------|--------------------------------|----------|
| `Authorization`   | `Bearer <token>`               | Yes      |
| `Content-Type`    | `application/json`             | Yes      |
| `X-Source-System` | `PENTA`                        | Yes      |
| `X-Request-Id`    | UUID (caller-generated)        | Yes      |
| `X-Batch-Id`      | Batch identifier (if batching) | No       |

> **`X-Request-Id`** is used for idempotency and tracing. See [Section 6](#6-idempotency--deduplication).

---

## 3. API Endpoints

### 3.1 POST /api/penta/policy-transactions

Push one or more policy transactions (new business, renewals, lapses, revivals, surrenders) into the Incentive System.

**URL:** `POST /api/penta/policy-transactions`

#### Request Body

```json
{
  "transactions": [
    {
      "policy_number": "POL-200001",
      "agent_code": "AGT001",
      "product_code": "PROD-TERM-01",
      "channel_code": "AGENCY",
      "region_code": "NORTH",
      "transaction_type": "NEW_BUSINESS",
      "policy_year": 1,
      "premium_amount": 25000.00,
      "sum_assured": 500000.00,
      "annualized_premium": 25000.00,
      "payment_mode": "ANNUAL",
      "issue_date": "2026-01-15",
      "due_date": "2026-01-15",
      "paid_date": "2026-01-16",
      "policy_status": "ACTIVE"
    }
  ]
}
```

#### Field Definitions

| Field                 | Type     | Required | Description                                                  |
|-----------------------|----------|----------|--------------------------------------------------------------|
| `policy_number`       | string   | Yes      | Unique policy identifier (max 50 chars)                      |
| `agent_code`          | string   | Yes      | Selling agent code — must exist in `ins_agents` (max 30 chars) |
| `product_code`        | string   | Yes      | Product identifier — must exist in `ins_products` (max 30 chars) |
| `channel_code`        | string   | No       | Sales channel: `AGENCY`, `BANCA`, `DIRECT`, `BROKER`         |
| `region_code`         | string   | No       | Geographic region code — must exist in `ins_regions`          |
| `transaction_type`    | string   | Yes      | One of: `NEW_BUSINESS`, `RENEWAL`, `LAPSE`, `REVIVAL`, `SURRENDER` |
| `policy_year`         | integer  | No       | Policy year (1 = first year, 2+ = renewal). Default: `1`     |
| `premium_amount`      | number   | Yes      | Actual premium paid (≥ 0)                                    |
| `sum_assured`         | number   | No       | Policy face value / death benefit                            |
| `annualized_premium`  | number   | Yes      | Annualized Premium Equivalent (APE)                          |
| `payment_mode`        | string   | No       | `ANNUAL`, `HALF_YEARLY`, `QUARTERLY`, `MONTHLY`              |
| `issue_date`          | string   | No       | Policy inception date (`YYYY-MM-DD`)                         |
| `due_date`            | string   | No       | Premium due date (`YYYY-MM-DD`)                              |
| `paid_date`           | string   | Yes      | Actual payment date (`YYYY-MM-DD`)                           |
| `policy_status`       | string   | No       | `ACTIVE` (default), `LAPSED`, `SURRENDERED`, `PAID_UP`       |

#### Successful Response (200 OK)

```json
{
  "success": true,
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "received": 1,
  "inserted": 1,
  "updated": 0,
  "errors": []
}
```

#### Partial Success Response (207 Multi-Status)

When some records succeed and others fail:

```json
{
  "success": false,
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "received": 3,
  "inserted": 2,
  "updated": 0,
  "errors": [
    {
      "index": 2,
      "policy_number": "POL-200003",
      "code": "INVALID_AGENT",
      "message": "Agent code 'AGT999' does not exist in the system."
    }
  ]
}
```

#### Batch Limits

| Constraint       | Limit                          |
|------------------|--------------------------------|
| Max records/call | 500 transactions per request   |
| Max payload size | 5 MB                           |

---

### 3.2 POST /api/penta/policy-status

Push policy status change events (lapse, revival, surrender, paid-up) for policies already in the system.

**URL:** `POST /api/penta/policy-status`

#### Request Body

```json
{
  "status_changes": [
    {
      "policy_number": "POL-200001",
      "new_status": "LAPSED",
      "effective_date": "2026-03-15",
      "reason": "Non-payment of premium"
    }
  ]
}
```

#### Field Definitions

| Field            | Type   | Required | Description                                                  |
|------------------|--------|----------|--------------------------------------------------------------|
| `policy_number`  | string | Yes      | Policy to update — must exist in `ins_policy_transactions`   |
| `new_status`     | string | Yes      | `ACTIVE`, `LAPSED`, `SURRENDERED`, `PAID_UP`                 |
| `effective_date` | string | Yes      | Date the status change takes effect (`YYYY-MM-DD`)           |
| `reason`         | string | No       | Reason for status change (free text, max 250 chars)          |

#### Successful Response (200 OK)

```json
{
  "success": true,
  "request_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "received": 1,
  "updated": 1,
  "not_found": 0,
  "errors": []
}
```

#### Partial Failure Response (207 Multi-Status)

```json
{
  "success": false,
  "request_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "received": 2,
  "updated": 1,
  "not_found": 1,
  "errors": [
    {
      "index": 1,
      "policy_number": "POL-UNKNOWN",
      "code": "POLICY_NOT_FOUND",
      "message": "Policy 'POL-UNKNOWN' does not exist."
    }
  ]
}
```

---

### 3.3 GET /api/penta/heartbeat

Health-check endpoint for the Penta system to verify connectivity and authentication.

**URL:** `GET /api/penta/heartbeat`

#### Request

```http
GET /api/penta/heartbeat
Authorization: Bearer <token>
X-Source-System: PENTA
```

#### Response (200 OK)

```json
{
  "status": "ok",
  "system": "incentive-management",
  "timestamp": "2026-03-23T05:55:00.000Z",
  "version": "1.0.0"
}
```

---

## 4. Data Dictionary

### Transaction Types

| Value           | Description                                        |
|-----------------|----------------------------------------------------|
| `NEW_BUSINESS`  | First-year policy issuance                         |
| `RENEWAL`       | Renewal premium payment (policy_year ≥ 2)          |
| `LAPSE`         | Policy lapsed due to non-payment                   |
| `REVIVAL`       | Previously lapsed policy reinstated                |
| `SURRENDER`     | Policy voluntarily terminated by policyholder      |

### Policy Statuses

| Value          | Description                                         |
|----------------|-----------------------------------------------------|
| `ACTIVE`       | Policy is in-force and premiums are current          |
| `LAPSED`       | Policy lapsed — premiums overdue beyond grace period |
| `SURRENDERED`  | Policy voluntarily terminated                        |
| `PAID_UP`      | No further premiums due; reduced benefits continue   |

### Payment Modes

| Value          | Description             |
|----------------|-------------------------|
| `ANNUAL`       | Once per year            |
| `HALF_YEARLY`  | Twice per year           |
| `QUARTERLY`    | Four times per year      |
| `MONTHLY`      | Twelve times per year    |

### Channel Codes

| Value    | Description                              |
|----------|------------------------------------------|
| `AGENCY` | Traditional agency distribution          |
| `BANCA`  | Bancassurance (bank-distributed)         |
| `DIRECT` | Direct sales (online / call center)      |
| `BROKER` | Independent broker channel               |

---

## 5. Error Handling

### HTTP Status Codes

| Code | Meaning                  | When                                                            |
|------|--------------------------|-----------------------------------------------------------------|
| 200  | OK                       | All records processed successfully                              |
| 207  | Multi-Status             | Partial success — some records failed validation                |
| 400  | Bad Request              | Malformed JSON, missing required fields, empty array            |
| 401  | Unauthorized             | Missing, expired, or invalid JWT token                          |
| 403  | Forbidden                | Token valid but client not authorized for this endpoint         |
| 409  | Conflict                 | Duplicate `X-Request-Id` with different payload                 |
| 413  | Payload Too Large        | Request body exceeds 5 MB or > 500 records                     |
| 429  | Too Many Requests        | Rate limit exceeded                                             |
| 500  | Internal Server Error    | Unexpected server-side failure                                  |
| 503  | Service Unavailable      | System under maintenance or database unreachable                |

### Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description of the error.",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "details": []
}
```

### Error Codes

| Code                    | HTTP Status | Description                                      |
|-------------------------|-------------|--------------------------------------------------|
| `INVALID_CREDENTIALS`   | 401         | Bad client_id or client_secret                   |
| `TOKEN_EXPIRED`         | 401         | JWT token has expired — request a new one         |
| `INVALID_TOKEN`         | 401         | JWT token is malformed or tampered                |
| `FORBIDDEN`             | 403         | Client not authorized for this endpoint           |
| `INVALID_PAYLOAD`       | 400         | JSON parse error or schema violation              |
| `MISSING_FIELD`         | 400         | Required field is missing                         |
| `INVALID_FIELD_VALUE`   | 400         | Field value is outside allowed set or range       |
| `INVALID_AGENT`         | 207/400     | `agent_code` not found in `ins_agents`            |
| `INVALID_PRODUCT`       | 207/400     | `product_code` not found in `ins_products`        |
| `POLICY_NOT_FOUND`      | 207/400     | `policy_number` does not exist (status updates)   |
| `DUPLICATE_REQUEST`     | 409         | Same `X-Request-Id` already processed             |
| `BATCH_LIMIT_EXCEEDED`  | 413         | More than 500 records in a single request         |
| `RATE_LIMITED`          | 429         | Too many requests — retry after cooldown          |
| `INTERNAL_ERROR`        | 500         | Unexpected server error                           |
| `SERVICE_UNAVAILABLE`   | 503         | System temporarily unavailable                    |

---

## 6. Idempotency & Deduplication

### Request-Level Idempotency

Every request **must** include an `X-Request-Id` header (UUID v4). The system uses this to prevent duplicate processing:

| Scenario                                  | Behavior                                                 |
|-------------------------------------------|----------------------------------------------------------|
| First call with `X-Request-Id: ABC`       | Processed normally, result cached                        |
| Retry with same `X-Request-Id: ABC`       | Returns cached result (no re-processing)                 |
| Same `X-Request-Id` + different payload   | Returns `409 Conflict`                                   |

Idempotency keys are retained for **48 hours**.

### Record-Level Deduplication

Policy transactions are deduplicated using a composite key:

```
(policy_number, transaction_type, due_date)
```

If a matching record already exists:
- The existing record is **updated** (upsert behavior).
- The `updated` counter in the response is incremented instead of `inserted`.

---

## 7. Rate Limiting

| Limit Type         | Value                  | Window  |
|--------------------|------------------------|---------|
| Requests per minute| 60                     | Sliding |
| Requests per hour  | 1,000                  | Sliding |
| Max concurrent     | 10 simultaneous calls  | —       |

When the rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30

{
  "error": "RATE_LIMITED",
  "message": "Rate limit exceeded. Retry after 30 seconds.",
  "retry_after": 30
}
```

**Rate limit headers** are included on every response:

| Header                  | Description                          |
|-------------------------|--------------------------------------|
| `X-RateLimit-Limit`     | Max requests allowed in window       |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset`     | Unix timestamp when window resets    |

---

## 8. Reconciliation (CSV Fallback)

If the REST API is unavailable, the Penta system falls back to CSV file delivery via SFTP.

### SFTP Details

| Attribute       | Detail                                   |
|-----------------|------------------------------------------|
| **Protocol**    | SFTP (SSH File Transfer Protocol)        |
| **Inbound Path**| `/inbound/penta/`                        |
| **File Format** | CSV (UTF-8, with header row)             |
| **File Naming** | `penta_transactions_YYYYMMDD.csv`        |
| **Example**     | `penta_transactions_20260322.csv`        |

### CSV Column Mapping

The CSV file uses the same fields as the REST API. Column headers map directly to the API field names:

```
policy_number,agent_code,product_code,channel_code,region_code,transaction_type,policy_year,premium_amount,sum_assured,annualized_premium,payment_mode,issue_date,due_date,paid_date,policy_status
```

### Reconciliation Process

```
┌───────────────┐     REST API (real-time)     ┌───────────────────┐
│  KGILS Penta  │ ───────────────────────────▶ │   Incentive Mgmt  │
│    System     │                               │      System       │
│               │     CSV / SFTP (fallback)     │                   │
│               │ ───────────────────────────▶ │                   │
└───────────────┘                               └───────────────────┘
                                                        │
                                                        ▼
                                               ┌───────────────────┐
                                               │  Daily Reconcile  │
                                               │  Job (Batch)      │
                                               │                   │
                                               │  1. Read CSV from │
                                               │     /inbound/     │
                                               │     penta/        │
                                               │                   │
                                               │  2. Compare with  │
                                               │     API-received  │
                                               │     records       │
                                               │                   │
                                               │  3. Backfill any  │
                                               │     missing       │
                                               │     records       │
                                               └───────────────────┘
```

**Steps:**

1. **Nightly batch job** reads all CSV files from `/inbound/penta/`.
2. For each record in the CSV, the system checks if it already exists (received via API).
3. **Missing records** (not received via API) are inserted — the `source_system` column is set to `PENTA_CSV`.
4. **Existing records** (already received via API) are skipped — no overwrite.
5. Processed files are moved to `/inbound/penta/archive/`.

### Source System Tracking

| `source_system` Value | Meaning                                    |
|-----------------------|--------------------------------------------|
| `PENTA_API`           | Received via real-time REST API             |
| `PENTA_CSV`           | Backfilled from CSV reconciliation file     |
| `POLICY_ADMIN`        | Uploaded manually via the Incentive System  |
| `MANUAL`              | Entered manually by an admin user           |

---

## 9. Testing & Sandbox

### UAT Environment

| Attribute       | Detail                                             |
|-----------------|----------------------------------------------------|
| **Base URL**    | `https://incentive-uat.example.com`                |
| **Token URL**   | `POST /api/auth/system-token`                      |
| **Credentials** | Provided separately to Penta integration team      |

### Sample Request (cURL)

```bash
# Step 1: Obtain token
TOKEN=$(curl -s -X POST https://incentive-uat.example.com/api/auth/system-token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"PENTA_SYS","client_secret":"***"}' \
  | jq -r '.token')

# Step 2: Push a policy transaction
curl -X POST https://incentive-uat.example.com/api/penta/policy-transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Source-System: PENTA" \
  -H "X-Request-Id: $(uuidgen)" \
  -d '{
    "transactions": [
      {
        "policy_number": "POL-TEST-001",
        "agent_code": "AGT001",
        "product_code": "PROD-TERM-01",
        "transaction_type": "NEW_BUSINESS",
        "premium_amount": 25000,
        "annualized_premium": 25000,
        "paid_date": "2026-03-22"
      }
    ]
  }'

# Step 3: Push a status change
curl -X POST https://incentive-uat.example.com/api/penta/policy-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Source-System: PENTA" \
  -H "X-Request-Id: $(uuidgen)" \
  -d '{
    "status_changes": [
      {
        "policy_number": "POL-TEST-001",
        "new_status": "LAPSED",
        "effective_date": "2026-03-23",
        "reason": "Non-payment"
      }
    ]
  }'

# Step 4: Health check
curl https://incentive-uat.example.com/api/penta/heartbeat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Source-System: PENTA"
```

### Test Scenarios

| # | Scenario                          | Expected Result                                |
|---|-----------------------------------|------------------------------------------------|
| 1 | Valid single transaction          | 200 — `inserted: 1`                           |
| 2 | Valid batch of 10 transactions    | 200 — `inserted: 10`                          |
| 3 | Duplicate `X-Request-Id` (retry)  | 200 — returns cached result                   |
| 4 | Invalid agent code                | 207 — partial failure with `INVALID_AGENT`    |
| 5 | Missing required field            | 400 — `MISSING_FIELD`                         |
| 6 | Expired JWT token                 | 401 — `TOKEN_EXPIRED`                         |
| 7 | No Authorization header           | 401 — `INVALID_TOKEN`                         |
| 8 | Batch > 500 records               | 413 — `BATCH_LIMIT_EXCEEDED`                  |
| 9 | Rate limit exceeded               | 429 — `RATE_LIMITED` with `Retry-After`        |
| 10| Status change for unknown policy  | 207 — `POLICY_NOT_FOUND`                      |
| 11| Heartbeat check                   | 200 — `{ "status": "ok" }`                    |
| 12| Same transaction resent (upsert)  | 200 — `updated: 1` (not duplicate insert)     |
