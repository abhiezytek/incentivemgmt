# Inbound Hierarchy API — Integration Specification

> REST API specification for pulling agent hierarchy data **FROM** the internal Hierarchy Management System **INTO** the Incentive Management System.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Base URL & Headers](#3-base-url--headers)
4. [API Endpoints (Their System)](#4-api-endpoints-their-system)
   - [GET /api/agents](#41-get-apiagents)
   - [GET /api/agents/{agentCode}](#42-get-apiagentsagentcode)
   - [GET /api/hierarchy/tree](#43-get-apihierarchytree)
5. [Data Dictionary](#5-data-dictionary)
6. [Our Sync Service](#6-our-sync-service)
7. [Sync Schedule](#7-sync-schedule)
8. [Data Mapping](#8-data-mapping)
9. [Error Handling & Retry](#9-error-handling--retry)
10. [Environment Variables](#10-environment-variables)

---

## 1. Overview

The Incentive Management System acts as a **consumer** of the internal Hierarchy Management System's REST API. We pull agent hierarchy data daily to keep our `ins_agents` table and hierarchy relationships up to date.

| Attribute          | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Direction**      | We **call** their API (we are the consumer)                |
| **Source System**  | Internal Hierarchy Management System                       |
| **Protocol**       | REST API (HTTPS)                                           |
| **Auth**           | Bearer JWT (we authenticate to their system)               |
| **Frequency**      | Daily delta sync at 2:30 AM IST + on-demand full sync      |
| **Target Table**   | `ins_agents` (columns: `parent_agent_id`, `hierarchy_path`, `hierarchy_level`) |

---

## 2. Authentication

We authenticate to the Hierarchy Management System using a **JWT Bearer Token**.

| Attribute          | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Type**           | JWT Bearer Token                                           |
| **Token Endpoint** | `POST {HIERARCHY_API_BASE}/api/auth/token`                 |
| **Token Expiry**   | 24 hours                                                   |
| **Header**         | `Authorization: Bearer <token>`                            |

### Obtain a Token

**Request:**

```http
POST {HIERARCHY_API_BASE}/api/auth/token
Content-Type: application/json

{
  "client_id": "INCENTIVE_SYS",
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

### Token Caching

- The sync service caches the JWT token in memory.
- A new token is requested only when the current token is expired or missing.
- On 401 responses during sync, the token is refreshed and the request retried once.

---

## 3. Base URL & Headers

| Environment | Base URL                                       |
|-------------|------------------------------------------------|
| Production  | Configured via `HIERARCHY_API_BASE` env var     |
| UAT         | Configured via `HIERARCHY_API_BASE` env var     |

**Required headers for all API calls:**

| Header            | Value                          | Required |
|-------------------|--------------------------------|----------|
| `Authorization`   | `Bearer <token>`               | Yes      |
| `Content-Type`    | `application/json`             | Yes      |
| `X-Source-System` | `INCENTIVE_MGMT`               | Yes      |

---

## 4. API Endpoints (Their System)

### 4.1 GET /api/agents

**Purpose:** Fetch full agent list with hierarchy relationships. Supports delta sync via `updatedSince` parameter.

**URL:** `GET {HIERARCHY_API_BASE}/api/agents`

#### Query Parameters

| Parameter      | Type   | Required | Description                                                |
|----------------|--------|----------|------------------------------------------------------------|
| `updatedSince` | string | No       | ISO 8601 date (`YYYY-MM-DD`). Returns only agents updated since this date. Omit for full sync. |
| `page`         | number | No       | Page number (1-based). Default: `1`                        |
| `pageSize`     | number | No       | Records per page. Default: `100`, Max: `1000`              |
| `status`       | string | No       | Filter by status: `ACTIVE`, `INACTIVE`, `SUSPENDED`        |

#### Response (200 OK)

```json
{
  "data": [
    {
      "agent_code": "AGT001",
      "agent_name": "Rajesh Kumar",
      "channel": "AGENCY",
      "region_code": "NORTH",
      "branch_code": "BR001",
      "license_number": "LIC-2024-001",
      "license_expiry": "2027-03-31",
      "activation_date": "2020-01-15",
      "status": "ACTIVE",
      "parent_agent_code": null,
      "hierarchy_path": "AGT001",
      "hierarchy_level": 1,
      "updated_at": "2026-03-22T10:30:00Z"
    },
    {
      "agent_code": "AGT010",
      "agent_name": "Priya Sharma",
      "channel": "AGENCY",
      "region_code": "NORTH",
      "branch_code": "BR001",
      "license_number": "LIC-2024-010",
      "license_expiry": "2027-06-30",
      "activation_date": "2021-06-01",
      "status": "ACTIVE",
      "parent_agent_code": "AGT001",
      "hierarchy_path": "AGT001.AGT010",
      "hierarchy_level": 2,
      "updated_at": "2026-03-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalRecords": 2456,
    "totalPages": 25,
    "hasNextPage": true
  }
}
```

#### Delta Sync Example

```http
GET {HIERARCHY_API_BASE}/api/agents?updatedSince=2026-03-22&page=1&pageSize=500
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
X-Source-System: INCENTIVE_MGMT
```

---

### 4.2 GET /api/agents/{agentCode}

**Purpose:** Fetch a single agent's full detail including hierarchy information.

**URL:** `GET {HIERARCHY_API_BASE}/api/agents/{agentCode}`

#### Path Parameters

| Parameter   | Type   | Required | Description                  |
|-------------|--------|----------|------------------------------|
| `agentCode` | string | Yes      | Agent code (e.g., `AGT001`)  |

#### Response (200 OK)

```json
{
  "agent_code": "AGT010",
  "agent_name": "Priya Sharma",
  "channel": "AGENCY",
  "region_code": "NORTH",
  "branch_code": "BR001",
  "license_number": "LIC-2024-010",
  "license_expiry": "2027-06-30",
  "activation_date": "2021-06-01",
  "status": "ACTIVE",
  "parent_agent_code": "AGT001",
  "hierarchy_path": "AGT001.AGT010",
  "hierarchy_level": 2,
  "direct_reportees": [
    {
      "agent_code": "AGT050",
      "agent_name": "Amit Patel",
      "hierarchy_level": 3,
      "status": "ACTIVE"
    }
  ],
  "upline_chain": [
    {
      "agent_code": "AGT001",
      "agent_name": "Rajesh Kumar",
      "hierarchy_level": 1
    }
  ],
  "updated_at": "2026-03-22T10:30:00Z"
}
```

#### Response (404 Not Found)

```json
{
  "error": "AGENT_NOT_FOUND",
  "message": "Agent with code 'AGT999' does not exist."
}
```

---

### 4.3 GET /api/hierarchy/tree

**Purpose:** Fetch the full organizational tree as a nested JSON structure.

**URL:** `GET {HIERARCHY_API_BASE}/api/hierarchy/tree`

#### Query Parameters

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `channel` | string | No       | Filter tree by channel: `AGENCY`, `BANCA`, `DIRECT`, `BROKER` |
| `region`  | string | No       | Filter tree by region code                      |
| `depth`   | number | No       | Max depth to return. Default: unlimited          |

#### Response (200 OK)

```json
{
  "tree": [
    {
      "agent_code": "AGT001",
      "agent_name": "Rajesh Kumar",
      "hierarchy_level": 1,
      "status": "ACTIVE",
      "children": [
        {
          "agent_code": "AGT010",
          "agent_name": "Priya Sharma",
          "hierarchy_level": 2,
          "status": "ACTIVE",
          "children": [
            {
              "agent_code": "AGT050",
              "agent_name": "Amit Patel",
              "hierarchy_level": 3,
              "status": "ACTIVE",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "total_agents": 2456,
    "max_depth": 5,
    "generated_at": "2026-03-22T10:30:00Z"
  }
}
```

---

## 5. Data Dictionary

### Agent Object Fields

| Field               | Type    | Description                                                      |
|---------------------|---------|------------------------------------------------------------------|
| `agent_code`        | string  | Unique agent identifier (max 30 chars)                           |
| `agent_name`        | string  | Agent full name (max 150 chars)                                  |
| `channel`           | string  | Sales channel: `AGENCY`, `BANCA`, `DIRECT`, `BROKER`             |
| `region_code`       | string  | Geographic region code (maps to `ins_regions.region_code`)        |
| `branch_code`       | string  | Branch office code (max 20 chars)                                |
| `license_number`    | string  | Insurance license number (max 50 chars)                          |
| `license_expiry`    | string  | License expiry date (ISO 8601: `YYYY-MM-DD`)                     |
| `activation_date`   | string  | Date agent was activated (ISO 8601: `YYYY-MM-DD`)                |
| `status`            | string  | `ACTIVE`, `INACTIVE`, `SUSPENDED`                                |
| `parent_agent_code` | string  | Parent agent code (null for top-level agents)                    |
| `hierarchy_path`    | string  | Dot-separated materialized path (e.g., `AGT001.AGT010.AGT050`)  |
| `hierarchy_level`   | integer | Depth in hierarchy (1 = top level)                               |
| `updated_at`        | string  | Last update timestamp (ISO 8601)                                 |

### Hierarchy Path Format

The `hierarchy_path` uses a dot-separated notation representing the chain from root to the agent:

```
Level 1 (Root):    AGT001
Level 2:           AGT001.AGT010
Level 3:           AGT001.AGT010.AGT050
```

> **Note:** Our database stores `hierarchy_path` using numeric IDs (e.g., `1.5.12.47`). The sync service converts the agent-code-based path from the API into the ID-based path during import.

---

## 6. Our Sync Service

**File:** `/server/src/jobs/hierarchySync.js`

### Sync Logic

The daily sync follows this process:

1. **Authenticate** — Obtain or reuse a cached JWT token from the Hierarchy API.
2. **Determine last sync** — Query `file_processing_log` for the last successful hierarchy sync to get `updatedSince` date.
3. **Fetch agents (paginated)** — Call `GET /api/agents?updatedSince=<date>&page=1&pageSize=500` and iterate through all pages.
4. **Resolve lookups** — Map `channel` → `channel_id` (via `channels` table), `region_code` → `region_id` (via `ins_regions` table).
5. **Upsert agents** — Bulk upsert into `ins_agents` using `ON CONFLICT (agent_code) DO UPDATE`.
6. **Resolve parent relationships** — After all agents are upserted, update `parent_agent_id` by joining on `parent_agent_code`.
7. **Rebuild hierarchy paths** — Convert API hierarchy paths (agent-code-based) to ID-based paths.
8. **Log result** — Insert a row into `file_processing_log` with sync outcome.

### Sync Modes

| Mode       | Trigger                       | `updatedSince` Value                         |
|------------|-------------------------------|----------------------------------------------|
| **Delta**  | Daily cron job                | Last successful sync date from `file_processing_log` |
| **Full**   | Manual trigger / first run    | Omitted (fetches all agents)                  |

---

## 7. Sync Schedule

| Job              | Cron (UTC)      | IST Time    | Description                          |
|------------------|-----------------|-------------|--------------------------------------|
| Hierarchy Sync   | `0 21 * * *`    | 2:30 AM IST | Daily delta sync of agent hierarchy  |

> **Note:** 2:30 AM IST = 21:00 UTC (previous day). Uses `node-cron` library.

---

## 8. Data Mapping

### API → Database Column Mapping

| API Field            | Database Column (`ins_agents`)  | Transformation                              |
|----------------------|---------------------------------|---------------------------------------------|
| `agent_code`         | `agent_code`                    | Direct copy                                 |
| `agent_name`         | `agent_name`                    | Direct copy                                 |
| `channel`            | `channel_id`                    | Lookup `channels` table by `name` → `id`    |
| `region_code`        | `region_id`                     | Lookup `ins_regions` by `region_code` → `id` |
| `branch_code`        | `branch_code`                   | Direct copy                                 |
| `license_number`     | `license_number`                | Direct copy                                 |
| `license_expiry`     | `license_expiry`                | ISO date string → DATE                       |
| `activation_date`    | `activation_date`               | ISO date string → DATE                       |
| `status`             | `status`                        | Direct copy                                 |
| `parent_agent_code`  | `parent_agent_id`               | Lookup `ins_agents` by `agent_code` → `id`   |
| `hierarchy_path`     | `hierarchy_path`                | Convert code-path → ID-path (post-upsert)    |
| `hierarchy_level`    | `hierarchy_level`               | Direct copy                                 |

---

## 9. Error Handling & Retry

| Scenario                      | Behavior                                                          |
|-------------------------------|-------------------------------------------------------------------|
| **Network timeout**           | Retry up to 3 times with exponential backoff (2s, 8s, 32s)        |
| **401 Unauthorized**          | Refresh JWT token and retry the request once                       |
| **404 on single agent**       | Log warning, skip agent, continue sync                             |
| **429 Too Many Requests**     | Respect `Retry-After` header, wait, then retry                    |
| **500 Server Error**          | Retry up to 3 times; on final failure, log and abort sync          |
| **Partial page failure**      | Log error for failed page, continue with remaining pages           |
| **Database error on upsert**  | Rollback current batch, log error, continue with next batch        |
| **Complete sync failure**     | Log to `file_processing_log` with `status = 'FAILED'`             |

### Retry Configuration

```
MAX_RETRIES = 3
BACKOFF_BASE = 2 seconds
BACKOFF_MULTIPLIER = 4 (exponential: 2s, 8s, 32s)
REQUEST_TIMEOUT = 30 seconds
```

---

## 10. Environment Variables

| Variable                      | Description                                      | Example                              |
|-------------------------------|--------------------------------------------------|--------------------------------------|
| `HIERARCHY_API_BASE`          | Base URL of the Hierarchy Management System       | `https://hierarchy.internal.example.com` |
| `HIERARCHY_API_CLIENT_ID`     | Client ID for JWT authentication                  | `INCENTIVE_SYS`                      |
| `HIERARCHY_API_CLIENT_SECRET` | Client secret for JWT authentication              | `***`                                |
| `HIERARCHY_SYNC_PAGE_SIZE`    | Page size for paginated requests (default: 500)   | `500`                                |
