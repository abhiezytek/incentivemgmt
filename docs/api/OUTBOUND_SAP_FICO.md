# Outbound SAP FICO — Integration Specification

> CSV file specification for generating outbound payment files **FROM** the Incentive Management System **TO** SAP FICO (Finance & Controlling / Payroll).

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Specification](#2-file-specification)
3. [Column Definitions](#3-column-definitions)
4. [Data Mapping](#4-data-mapping)
5. [API Endpoint](#5-api-endpoint)
6. [Generation Flow](#6-generation-flow)
7. [outbound_file_log Table](#7-outbound_file_log-table)
8. [Validation Rules](#8-validation-rules)
9. [Error Handling](#9-error-handling)
10. [Environment Variables](#10-environment-variables)

---

## 1. Overview

The Incentive Management System generates CSV files in SAP FICO-compatible format. These files are downloaded manually by the Finance team and imported into SAP for payment/payroll processing. **There is no automated push** — the file is generated on-demand via the API and downloaded from the UI. Optionally, the file can be placed in `/outbound/sap/` on the SFTP server for pickup.

| Attribute          | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Direction**      | Outbound — our system **generates** the file               |
| **Target System**  | SAP FICO (Finance & Controlling / Payroll)                 |
| **Protocol**       | HTTP file download (manual import into SAP)                |
| **File Format**    | CSV (comma-delimited, UTF-8)                               |
| **Trigger**        | Manual — Finance user clicks "Generate Payment File"       |
| **Auth**           | JWT with `finance` role                                    |
| **Source Table**   | `ins_incentive_results` (status = `APPROVED`)              |
| **SFTP Path**      | `/outbound/sap/` (optional pickup)                         |

---

## 2. File Specification

| Attribute            | Detail                                                  |
|----------------------|---------------------------------------------------------|
| **Filename Pattern** | `sap_payout_YYYYMMDD_HHMMSS.csv`                       |
| **Encoding**         | UTF-8 (no BOM)                                          |
| **Delimiter**        | Comma (`,`)                                             |
| **Header Row**       | Yes — first row contains column names                    |
| **Line Ending**      | CRLF (`\r\n`)                                            |
| **Decimal**          | Period (`.`) — no thousands separator                    |
| **Date Format**      | `YYYY-MM-DD` (ISO 8601)                                  |

### Example Filename

```
sap_payout_20260322_143000.csv
```

---

## 3. Column Definitions

| #  | Column Name         | Type        | Max Length | Required | Description                                      |
|----|---------------------|-------------|------------|----------|--------------------------------------------------|
| 1  | COMPANY_CODE        | VARCHAR     | 10         | Yes      | SAP company code                                  |
| 2  | VENDOR_NUMBER       | VARCHAR     | 30         | Yes      | Vendor/supplier number (= agent_code)             |
| 3  | VENDOR_NAME         | VARCHAR     | 150        | Yes      | Vendor name (= agent_name)                        |
| 4  | DOCUMENT_NUMBER     | VARCHAR     | 80         | Yes      | Unique document reference                         |
| 5  | POSTING_DATE        | DATE        | 10         | Yes      | Posting date (YYYY-MM-DD)                         |
| 6  | DOCUMENT_TYPE       | VARCHAR     | 2          | Yes      | SAP document type (e.g., `KR`)                    |
| 7  | AMOUNT              | NUMERIC     | 15,2       | Yes      | Payment amount (= total_incentive)                |
| 8  | CURRENCY            | VARCHAR     | 3          | Yes      | Currency code (default: `INR`)                    |
| 9  | GL_ACCOUNT          | VARCHAR     | 50         | Yes      | General ledger account for incentive expense       |
| 10 | COST_CENTER         | VARCHAR     | 30         | No       | Cost center code (from channel/region)             |
| 11 | PROFIT_CENTER       | VARCHAR     | 30         | No       | Profit center code                                 |
| 12 | PAYMENT_TERMS       | VARCHAR     | 10         | Yes      | SAP payment terms key                              |
| 13 | TEXT                 | VARCHAR     | 240        | No       | Line item text / description                       |
| 14 | PROGRAM_CODE        | VARCHAR     | 30         | No       | Incentive program reference                        |

---

## 4. Data Mapping

### Source → SAP FICO Column Mapping

| SAP FICO Column     | Source                                                              | Transformation                                    |
|---------------------|---------------------------------------------------------------------|---------------------------------------------------|
| `COMPANY_CODE`      | `SAP_COMPANY_CODE` env var                                          | Default: `'1000'`                                 |
| `VENDOR_NUMBER`     | `ins_agents.agent_code`                                             | Direct copy                                       |
| `VENDOR_NAME`       | `ins_agents.agent_name`                                             | Direct copy                                       |
| `DOCUMENT_NUMBER`   | Computed                                                            | `'INC-' + program_id + '-' + period_YYYYMM + '-' + agent_code` |
| `POSTING_DATE`      | File generation timestamp                                           | Format: `YYYY-MM-DD`                              |
| `DOCUMENT_TYPE`     | `SAP_DOCUMENT_TYPE` env var                                         | Default: `'KR'`                                   |
| `AMOUNT`            | `ins_incentive_results.total_incentive`                             | 2 decimal places                                  |
| `CURRENCY`          | `SAP_CURRENCY` env var                                              | Default: `'INR'`                                  |
| `GL_ACCOUNT`        | `SAP_GL_ACCOUNT` env var                                            | Default: `'6100000'`                              |
| `COST_CENTER`       | `channels.code`                                                     | Channel code of the agent                         |
| `PROFIT_CENTER`     | `SAP_PROFIT_CENTER` env var                                         | Default: `''` (empty)                             |
| `PAYMENT_TERMS`     | `SAP_PAYMENT_TERMS` env var                                         | Default: `'0001'` (immediate)                     |
| `TEXT`              | Computed                                                            | `'Sales Incentive - ' + period + ' - ' + channel` |
| `PROGRAM_CODE`      | `incentive_programs.id`                                             | `'PRG-' + program_id`                             |

### Document Number Format

```
INC-{program_id}-{YYYYMM}-{agent_code}

Examples:
  INC-5-202603-AGT001
  INC-12-202603-AGT047
```

### Text / Description Format

```
Sales Incentive - Mar 2026 - AGENCY
Sales Incentive - Mar 2026 - BANCA
```

---

## 5. API Endpoint

### POST /api/integration/export/sap-fico

Generates and returns the SAP FICO-compatible CSV file for download.

**Authentication:** JWT with `finance` role.

#### Request Body

```json
{
  "programId": 5,
  "periodStart": "2026-03-01"
}
```

| Field         | Type    | Required | Description                              |
|---------------|---------|----------|------------------------------------------|
| `programId`   | integer | Yes      | Incentive program ID                     |
| `periodStart` | string  | Yes      | Period start date (ISO: `YYYY-MM-DD`)    |

#### Response (200 OK)

Returns the CSV file as a download.

```
Content-Type: text/csv
Content-Disposition: attachment; filename="sap_payout_20260322_143000.csv"
```

```csv
COMPANY_CODE,VENDOR_NUMBER,VENDOR_NAME,DOCUMENT_NUMBER,POSTING_DATE,DOCUMENT_TYPE,AMOUNT,CURRENCY,GL_ACCOUNT,COST_CENTER,PROFIT_CENTER,PAYMENT_TERMS,TEXT,PROGRAM_CODE
1000,AGT001,Rajesh Kumar,INC-5-202603-AGT001,2026-03-22,KR,45000.00,INR,6100000,AGENCY,,0001,Sales Incentive - Mar 2026 - AGENCY,PRG-5
1000,AGT047,Priya Sharma,INC-5-202603-AGT047,2026-03-22,KR,32500.50,INR,6100000,BANCA,,0001,Sales Incentive - Mar 2026 - BANCA,PRG-5
```

#### Response (400 Bad Request)

```json
{
  "error": "programId and periodStart are required"
}
```

#### Response (404 Not Found)

```json
{
  "error": "No approved incentive results found for the given program and period"
}
```

---

## 6. Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SAP FICO File Generation                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Finance user → POST /api/integration/export/sap-fico        │
│     Body: { programId, periodStart }                             │
│                                                                  │
│  2. Query ins_incentive_results WHERE:                           │
│     - status = 'APPROVED'                                        │
│     - program_id = :programId                                    │
│     - period_start = :periodStart                                │
│                                                                  │
│  3. JOIN ins_agents (agent_name, channel_id)                     │
│     JOIN channels (channel code for COST_CENTER)                 │
│                                                                  │
│  4. Build CSV rows with SAP FICO column mapping                  │
│                                                                  │
│  5. Log to outbound_file_log:                                    │
│     - file_name, target_system='SAP_FICO'                        │
│     - record_count, total_amount                                 │
│     - status='GENERATED'                                         │
│                                                                  │
│  6. Return CSV as download response                              │
│                                                                  │
│  7. Finance team manually imports CSV into SAP FICO              │
│     (or optionally places in /outbound/sap/ for SFTP pickup)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. outbound_file_log Table

Tracks every outbound file generated for audit and reconciliation.

```sql
CREATE TABLE outbound_file_log (
  id             SERIAL PRIMARY KEY,
  file_name      VARCHAR(200),
  target_system  VARCHAR(50),    -- 'SAP_FICO', 'ORACLE_AP'
  program_id     INT,
  period_start   DATE,
  record_count   INT,
  total_amount   NUMERIC,
  generated_by   INT,            -- users.id
  generated_at   TIMESTAMP DEFAULT NOW(),
  file_path      TEXT,
  status         VARCHAR(20) DEFAULT 'GENERATED'  -- GENERATED, DOWNLOADED, PROCESSED
);
```

**Migration file:** `server/src/db/migrations/005_outbound_file_log.sql`

---

## 8. Validation Rules

Before generating the file, the system validates:

| Rule                          | Check                                                     | Error                                          |
|-------------------------------|-----------------------------------------------------------|-------------------------------------------------|
| **Required params**           | `programId` and `periodStart` must be provided             | 400: `programId and periodStart are required`   |
| **Program exists**            | `incentive_programs.id` must exist                         | 404: `Program not found`                        |
| **Approved results exist**    | At least one result with `status = 'APPROVED'`             | 404: `No approved incentive results found...`   |
| **Positive amounts only**     | `total_incentive > 0`                                      | Rows with zero/negative amounts are excluded    |
| **No duplicates**             | Document number must be unique per generation               | Guaranteed by format: `INC-{pid}-{period}-{code}` |

---

## 9. Error Handling

| Scenario                      | Behavior                                                  |
|-------------------------------|-----------------------------------------------------------|
| **Missing parameters**        | Return 400 with validation error message                   |
| **No approved results**       | Return 404 — nothing to generate                           |
| **Database error**            | Return 500, log error, no entry in outbound_file_log       |
| **Partial failure**           | Not applicable — all-or-nothing generation                 |

---

## 10. Environment Variables

| Variable                  | Description                                      | Default           |
|---------------------------|--------------------------------------------------|--------------------|
| `SAP_COMPANY_CODE`        | SAP company code                                  | `1000`            |
| `SAP_DOCUMENT_TYPE`       | SAP FI document type                              | `KR`              |
| `SAP_CURRENCY`            | Payment currency code                             | `INR`             |
| `SAP_GL_ACCOUNT`          | GL account for incentive expense                   | `6100000`         |
| `SAP_PROFIT_CENTER`       | Profit center code                                 | (empty)           |
| `SAP_PAYMENT_TERMS`       | SAP payment terms key                              | `0001`            |
