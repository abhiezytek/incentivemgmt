# Outbound Oracle Financials — Integration Specification

> CSV file specification for generating outbound payment files **FROM** the Incentive Management System **TO** Oracle Financials AP (Accounts Payable) module.

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

The Incentive Management System generates CSV files in Oracle Financials AP interface format. These files are downloaded manually by the Finance team and imported into Oracle ERP for payment processing. **There is no automated push** — the file is generated on-demand via the API and downloaded from the UI.

| Attribute          | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Direction**      | Outbound — our system **generates** the file               |
| **Target System**  | Oracle Financials AP (Accounts Payable)                    |
| **Protocol**       | HTTP file download (manual import into Oracle)             |
| **File Format**    | CSV (comma-delimited, UTF-8)                               |
| **Trigger**        | Manual — Finance user clicks "Generate" in the UI          |
| **Auth**           | JWT with `finance` role                                    |
| **Source Table**   | `ins_incentive_results` (status = `APPROVED`)              |

---

## 2. File Specification

| Attribute            | Detail                                                  |
|----------------------|---------------------------------------------------------|
| **Filename Pattern** | `ORACLE_AP_INCENTIVE_YYYYMMDD_HHMMSS.csv`              |
| **Encoding**         | UTF-8 (no BOM)                                          |
| **Delimiter**        | Comma (`,`)                                             |
| **Header Row**       | Yes — first row contains column names                    |
| **Line Ending**      | CRLF (`\r\n`) — Oracle AP standard                      |
| **Decimal**          | Period (`.`) — no thousands separator                    |
| **Date Format**      | `DD-MON-YYYY` (Oracle standard, e.g., `22-MAR-2026`)    |

### Example Filename

```
ORACLE_AP_INCENTIVE_20260322_143000.csv
```

---

## 3. Column Definitions

| #  | Column Name       | Type        | Max Length | Required | Description                                      |
|----|-------------------|-------------|------------|----------|--------------------------------------------------|
| 1  | OPERATING_UNIT    | VARCHAR     | 50         | Yes      | Oracle operating unit name                        |
| 2  | SUPPLIER_NUMBER   | VARCHAR     | 30         | Yes      | Supplier/vendor number (= agent_code)             |
| 3  | SUPPLIER_NAME     | VARCHAR     | 150        | Yes      | Supplier name (= agent_name)                      |
| 4  | INVOICE_NUMBER    | VARCHAR     | 80         | Yes      | Unique invoice reference                          |
| 5  | INVOICE_DATE      | DATE        | 11         | Yes      | File generation date (DD-MON-YYYY)                |
| 6  | INVOICE_AMOUNT    | NUMERIC     | 15,2       | Yes      | Total invoice amount (= total_incentive)          |
| 7  | INVOICE_CURRENCY  | VARCHAR     | 3          | Yes      | Currency code (default: `INR`)                    |
| 8  | PAYMENT_TERMS     | VARCHAR     | 30         | Yes      | Oracle payment terms (default: `IMMEDIATE`)       |
| 9  | DESCRIPTION       | VARCHAR     | 240        | Yes      | Invoice description                               |
| 10 | LINE_TYPE         | VARCHAR     | 30         | Yes      | `ITEM` (Oracle AP line type)                      |
| 11 | LINE_AMOUNT       | NUMERIC     | 15,2       | Yes      | Line amount (= total_incentive)                   |
| 12 | ACCOUNT_CODE      | VARCHAR     | 50         | Yes      | GL account code for incentive expense              |
| 13 | COST_CENTER       | VARCHAR     | 30         | No       | Cost center code (from channel/region)             |
| 14 | PROJECT_CODE      | VARCHAR     | 30         | No       | Project code (from incentive program)              |

---

## 4. Data Mapping

### Source → Oracle AP Column Mapping

| Oracle AP Column    | Source                                                              | Transformation                                    |
|---------------------|---------------------------------------------------------------------|---------------------------------------------------|
| `OPERATING_UNIT`    | `ORACLE_OPERATING_UNIT` env var                                     | Default: `'KGILS India'`                          |
| `SUPPLIER_NUMBER`   | `ins_agents.agent_code`                                             | Direct copy                                       |
| `SUPPLIER_NAME`     | `ins_agents.agent_name`                                             | Direct copy                                       |
| `INVOICE_NUMBER`    | Computed                                                            | `'INC-' + program_id + '-' + period_YYYYMM + '-' + agent_code` |
| `INVOICE_DATE`      | File generation timestamp                                           | Format: `DD-MON-YYYY`                             |
| `INVOICE_AMOUNT`    | `ins_incentive_results.total_incentive`                             | 2 decimal places                                  |
| `INVOICE_CURRENCY`  | `ORACLE_CURRENCY` env var                                           | Default: `'INR'`                                  |
| `PAYMENT_TERMS`     | `ORACLE_PAYMENT_TERMS` env var                                      | Default: `'IMMEDIATE'`                            |
| `DESCRIPTION`       | Computed                                                            | `'Sales Incentive - ' + period + ' - ' + channel` |
| `LINE_TYPE`         | Constant                                                            | `'ITEM'`                                          |
| `LINE_AMOUNT`       | `ins_incentive_results.total_incentive`                             | Same as INVOICE_AMOUNT                            |
| `ACCOUNT_CODE`      | `ORACLE_GL_ACCOUNT` env var                                         | Default: `'6100.00.000'`                          |
| `COST_CENTER`       | `channels.code`                                                     | Channel code of the agent                         |
| `PROJECT_CODE`      | `incentive_programs.id`                                             | `'PRG-' + program_id`                             |

### Invoice Number Format

```
INC-{program_id}-{YYYYMM}-{agent_code}

Examples:
  INC-5-202603-AGT001
  INC-12-202603-AGT047
```

### Description Format

```
Sales Incentive - Mar 2026 - AGENCY
Sales Incentive - Mar 2026 - BANCA
```

---

## 5. API Endpoint

### POST /api/integration/export/oracle-financials

Generates and returns the Oracle AP CSV file for download.

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
Content-Disposition: attachment; filename="ORACLE_AP_INCENTIVE_20260322_143000.csv"
```

```csv
OPERATING_UNIT,SUPPLIER_NUMBER,SUPPLIER_NAME,INVOICE_NUMBER,INVOICE_DATE,INVOICE_AMOUNT,INVOICE_CURRENCY,PAYMENT_TERMS,DESCRIPTION,LINE_TYPE,LINE_AMOUNT,ACCOUNT_CODE,COST_CENTER,PROJECT_CODE
KGILS India,AGT001,Rajesh Kumar,INC-5-202603-AGT001,22-MAR-2026,45000.00,INR,IMMEDIATE,Sales Incentive - Mar 2026 - AGENCY,ITEM,45000.00,6100.00.000,AGENCY,PRG-5
KGILS India,AGT047,Priya Sharma,INC-5-202603-AGT047,22-MAR-2026,32500.50,INR,IMMEDIATE,Sales Incentive - Mar 2026 - BANCA,ITEM,32500.50,6100.00.000,BANCA,PRG-5
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
│                    Oracle AP File Generation                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Finance user → POST /api/integration/export/oracle-financials│
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
│  4. Build CSV rows with Oracle AP column mapping                 │
│                                                                  │
│  5. Log to outbound_file_log:                                    │
│     - file_name, target_system='ORACLE_AP'                       │
│     - record_count, total_amount                                 │
│     - status='GENERATED'                                         │
│                                                                  │
│  6. Return CSV as download response                              │
│                                                                  │
│  7. Finance team manually imports CSV into Oracle AP              │
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
| **No duplicates**             | Invoice number must be unique per generation                | Guaranteed by format: `INC-{pid}-{period}-{code}` |

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
| `ORACLE_OPERATING_UNIT`   | Oracle operating unit name                        | `KGILS India`     |
| `ORACLE_CURRENCY`         | Invoice currency code                             | `INR`             |
| `ORACLE_PAYMENT_TERMS`    | Oracle payment terms                              | `IMMEDIATE`       |
| `ORACLE_GL_ACCOUNT`       | GL account code for incentive expense              | `6100.00.000`     |
