# Inbound Life Asia File — Integration Specification

> Flat file (CSV via SFTP) integration for receiving policy data **FROM** the Life Asia AS400 / IBM iSeries system **INTO** the Incentive Management System.

---

## Table of Contents

1. [Overview](#1-overview)
2. [SFTP Connection](#2-sftp-connection)
3. [File Specifications](#3-file-specifications)
   - [File 1: Daily Policy Transactions](#31-file-1-daily-policy-transactions)
   - [File 2: Daily Agent Master Sync](#32-file-2-daily-agent-master-sync)
   - [File 3: Monthly Persistency Data](#33-file-3-monthly-persistency-data)
4. [Data Type Rules](#4-data-type-rules)
5. [AS400 Code Mappings](#5-as400-code-mappings)
6. [Processing Pipeline](#6-processing-pipeline)
7. [SFTP Polling Schedule](#7-sftp-polling-schedule)
8. [Staging Tables](#8-staging-tables)
9. [Data Quality Checks](#9-data-quality-checks)
10. [Error Handling & Alerting](#10-error-handling--alerting)
11. [File Lifecycle](#11-file-lifecycle)
12. [Environment Variables](#12-environment-variables)

---

## 1. Overview

Life Asia (AS400 / IBM iSeries) is the primary policy administration system. It generates nightly flat-file CSV extracts that are deposited on an SFTP server. The Incentive Management System's SFTP polling service picks up these files, validates them, loads them through staging tables, and ultimately inserts into the main database.

| Attribute        | Detail                                                  |
|------------------|---------------------------------------------------------|
| **Source System** | Life Asia (AS400 / IBM iSeries)                        |
| **Protocol**     | SFTP (SSH File Transfer Protocol)                       |
| **File Format**  | CSV (comma-delimited, UTF-8 with possible BOM)          |
| **Frequency**    | Daily batch (policy txns, agents) / Monthly (persistency) |
| **Auth**         | SFTP key-based or password authentication                |

---

## 2. SFTP Connection

| Attribute         | Detail                                           |
|-------------------|--------------------------------------------------|
| **Host**          | Configured via `SFTP_HOST` env variable           |
| **Port**          | `22` (default) or `SFTP_PORT` env variable        |
| **Username**      | `SFTP_USERNAME` env variable                      |
| **Authentication**| Private key (`SFTP_PRIVATE_KEY_PATH`) or password (`SFTP_PASSWORD`) |
| **Base Path**     | `/inbound/lifeasia/`                              |

### Folder Structure

```
/inbound/lifeasia/
├── policy/                          ← Daily policy transaction files land here
│   └── LIFEASIA_POLICY_TXN_20260322.csv
├── agents/                          ← Daily agent master files land here
│   └── LIFEASIA_AGENT_20260322.csv
├── persistency/                     ← Monthly persistency files land here
│   └── LIFEASIA_PERSIST_202603.csv
├── processed/                       ← Successfully processed files moved here
│   └── 20260322/
│       ├── LIFEASIA_POLICY_TXN_20260322.csv
│       └── LIFEASIA_AGENT_20260322.csv
└── errors/                          ← Files with fatal errors moved here
    └── LIFEASIA_POLICY_TXN_20260321.csv
```

---

## 3. File Specifications

### 3.1 File 1: Daily Policy Transactions

| Attribute          | Detail                                            |
|--------------------|---------------------------------------------------|
| **Filename Pattern** | `LIFEASIA_POLICY_TXN_YYYYMMDD.csv`             |
| **SFTP Path**      | `/inbound/lifeasia/policy/`                       |
| **Processing Time**| Daily at **2:00 AM IST**                          |
| **Delimiter**      | Comma (`,`)                                       |
| **Header Row**     | Yes — first row contains column names              |
| **Encoding**       | UTF-8 (may include BOM)                           |
| **Line Ending**    | CRLF or LF                                        |

#### Columns

Column order matters — the AS400 fixed export produces columns in this exact sequence:

| #  | Column Name  | Type    | Required | Max Length | Description                                              |
|----|-------------|---------|----------|------------|----------------------------------------------------------|
| 1  | `POLICY_NO`  | string  | Yes      | 50         | Unique policy identifier                                 |
| 2  | `AGENT_CD`   | string  | Yes      | 30         | Selling agent code (must exist in `ins_agents`)          |
| 3  | `PROD_CD`    | string  | Yes      | 30         | Product code (must exist in `ins_products`)              |
| 4  | `CHANNEL`    | string  | No       | 30         | Channel name: `AGENCY`, `BANCA`, `DIRECT`, `BROKER`     |
| 5  | `REGION`     | string  | No       | 20         | Region code (must exist in `ins_regions`)                |
| 6  | `TXN_TYPE`   | string  | Yes      | 2          | Transaction type code (see [AS400 Code Mappings](#5-as400-code-mappings)) |
| 7  | `POL_YR`     | integer | No       | —          | Policy year (1 = first year, 2+ = renewal). Default: `1` |
| 8  | `PREM_AMT`   | numeric | Yes      | —          | Premium amount — no commas, 2 decimal places             |
| 9  | `SA_AMT`     | numeric | No       | —          | Sum assured — no commas, 2 decimal places                |
| 10 | `APE`        | numeric | Yes      | —          | Annualized Premium Equivalent — no commas, 2 decimal places |
| 11 | `PAY_MODE`   | string  | No       | 20         | `ANNUAL`, `HALF_YEARLY`, `QUARTERLY`, `MONTHLY`          |
| 12 | `ISS_DT`     | date    | No       | 8          | Issue date in **DDMMYYYY** format                        |
| 13 | `DUE_DT`     | date    | No       | 8          | Due date in **DDMMYYYY** format                          |
| 14 | `PAY_DT`     | date    | Yes      | 8          | Paid date in **DDMMYYYY** format                         |
| 15 | `POL_STATUS` | string  | No       | 20         | `ACTIVE`, `LAPSED`, `SURRENDERED`, `PAID_UP`. Default: `ACTIVE` |
| 16 | `BRANCH_CD`  | string  | No       | 20         | Branch code                                              |

#### Sample File

```csv
POLICY_NO,AGENT_CD,PROD_CD,CHANNEL,REGION,TXN_TYPE,POL_YR,PREM_AMT,SA_AMT,APE,PAY_MODE,ISS_DT,DUE_DT,PAY_DT,POL_STATUS,BRANCH_CD
POL-100001,AGT001,PROD-TERM-01,AGENCY,NORTH,NB,1,25000.00,500000.00,25000.00,ANNUAL,15012026,15012026,16012026,ACTIVE,BR-DEL-01
POL-100002,AGT002,PROD-ULIP-01,BANCA,SOUTH,NB,1,50000.00,750000.00,50000.00,HALF_YEARLY,20022026,20022026,21022026,ACTIVE,BR-CHN-01
POL-100003,AGT001,PROD-TERM-01,AGENCY,NORTH,RN,2,25000.00,500000.00,25000.00,ANNUAL,15012025,15012026,16012026,ACTIVE,BR-DEL-01
POL-100004,AGT003,PROD-ENDOW-01,DIRECT,WEST,LP,1,30000.00,400000.00,30000.00,QUARTERLY,10062025,10032026,,LAPSED,BR-MUM-01
```

#### Column Mapping to Database

| CSV Column   | Database Column (`ins_policy_transactions`) | Transformation                           |
|-------------|---------------------------------------------|------------------------------------------|
| `POLICY_NO`  | `policy_number`                             | Direct copy                              |
| `AGENT_CD`   | `agent_code`                                | Direct copy                              |
| `PROD_CD`    | `product_code`                              | Direct copy                              |
| `CHANNEL`    | `channel_id`                                | Lookup `channels` table by name → id     |
| `REGION`     | `region_id`                                 | Lookup `ins_regions` by region_code → id |
| `TXN_TYPE`   | `transaction_type`                          | Map AS400 code → full name (see [§5](#5-as400-code-mappings)) |
| `POL_YR`     | `policy_year`                               | Parse as integer (default: 1)            |
| `PREM_AMT`   | `premium_amount`                            | Parse as numeric                         |
| `SA_AMT`     | `sum_assured`                               | Parse as numeric                         |
| `APE`        | `annualized_premium`                        | Parse as numeric                         |
| `PAY_MODE`   | `payment_mode`                              | Direct copy                              |
| `ISS_DT`     | `issue_date`                                | Convert DDMMYYYY → YYYY-MM-DD            |
| `DUE_DT`     | `due_date`                                  | Convert DDMMYYYY → YYYY-MM-DD            |
| `PAY_DT`     | `paid_date`                                 | Convert DDMMYYYY → YYYY-MM-DD            |
| `POL_STATUS` | `policy_status`                             | Direct copy (default: `ACTIVE`)          |
| `BRANCH_CD`  | *(not stored directly)*                     | Logged in staging for reference          |
| *(auto)*     | `source_system`                             | Set to `LIFEASIA`                        |
| *(auto)*     | `uploaded_at`                               | Set to `NOW()`                           |

---

### 3.2 File 2: Daily Agent Master Sync

| Attribute          | Detail                                            |
|--------------------|---------------------------------------------------|
| **Filename Pattern** | `LIFEASIA_AGENT_YYYYMMDD.csv`                   |
| **SFTP Path**      | `/inbound/lifeasia/agents/`                       |
| **Processing Time**| Daily at **2:30 AM IST**                          |

#### Columns

| #  | Column Name       | Type    | Required | Description                                          |
|----|------------------|---------|----------|------------------------------------------------------|
| 1  | `AGENT_CD`        | string  | Yes      | Unique agent code                                    |
| 2  | `AGENT_NAME`      | string  | Yes      | Agent full name                                      |
| 3  | `CHANNEL`         | string  | Yes      | Channel name: `AGENCY`, `BANCA`, `DIRECT`, `BROKER`  |
| 4  | `REGION`          | string  | Yes      | Region code                                          |
| 5  | `BRANCH_CD`       | string  | No       | Branch code                                          |
| 6  | `LICENSE_NO`      | string  | No       | Insurance license number                             |
| 7  | `LICENSE_EXPIRY`  | date    | No       | License expiry date (DDMMYYYY)                       |
| 8  | `ACTIVATION_DT`   | date    | No       | Agent activation date (DDMMYYYY)                     |
| 9  | `PARENT_AGENT_CD` | string  | No       | Upline agent code (for MLM hierarchy)                 |
| 10 | `HIERARCHY_LEVEL` | integer | No       | Level in hierarchy (1 = top). Default: `1`           |
| 11 | `STATUS`          | string  | No       | `ACTIVE`, `INACTIVE`, `SUSPENDED`. Default: `ACTIVE` |

#### Column Mapping to Database

| CSV Column         | Database Column (`ins_agents`)  | Transformation                           |
|-------------------|---------------------------------|------------------------------------------|
| `AGENT_CD`         | `agent_code`                   | Direct copy                              |
| `AGENT_NAME`       | `agent_name`                   | Direct copy                              |
| `CHANNEL`          | `channel_id`                   | Lookup `channels` table by name → id     |
| `REGION`           | `region_id`                    | Lookup `ins_regions` by region_code → id |
| `BRANCH_CD`        | `branch_code`                  | Direct copy                              |
| `LICENSE_NO`       | `license_number`               | Direct copy                              |
| `LICENSE_EXPIRY`   | `license_expiry`               | Convert DDMMYYYY → YYYY-MM-DD            |
| `ACTIVATION_DT`    | `activation_date`              | Convert DDMMYYYY → YYYY-MM-DD            |
| `PARENT_AGENT_CD`  | `parent_agent_id`              | Lookup `ins_agents` by agent_code → id   |
| `HIERARCHY_LEVEL`  | `hierarchy_level`              | Parse as integer (default: 1)            |
| `STATUS`           | `status`                       | Direct copy (default: `ACTIVE`)          |

---

### 3.3 File 3: Monthly Persistency Data

| Attribute          | Detail                                            |
|--------------------|---------------------------------------------------|
| **Filename Pattern** | `LIFEASIA_PERSIST_YYYYMM.csv`                   |
| **SFTP Path**      | `/inbound/lifeasia/persistency/`                  |
| **Processing Time**| Daily at **3:00 AM IST** (checks for revised files) |

#### Columns

| #  | Column Name         | Type    | Required | Description                                    |
|----|---------------------|---------|----------|------------------------------------------------|
| 1  | `AGENT_CD`          | string  | Yes      | Agent code                                     |
| 2  | `PERSIST_MONTH`     | integer | Yes      | Persistency month: 13, 25, 37, 49, 61          |
| 3  | `PERIOD_START`      | date    | Yes      | Period start date (DDMMYYYY)                   |
| 4  | `PERIOD_END`        | date    | Yes      | Period end date (DDMMYYYY)                     |
| 5  | `POLICIES_DUE`      | integer | Yes      | Number of policies due for renewal             |
| 6  | `POLICIES_RENEWED`  | integer | Yes      | Number of policies actually renewed            |

#### Column Mapping to Database

| CSV Column          | Database Column (`ins_persistency_data`) | Transformation              |
|--------------------|------------------------------------------|-----------------------------|
| `AGENT_CD`          | `agent_code`                             | Direct copy                 |
| `PERSIST_MONTH`     | `persistency_month`                      | Parse as integer            |
| `PERIOD_START`      | `period_start`                           | Convert DDMMYYYY → YYYY-MM-DD |
| `PERIOD_END`        | `period_end`                             | Convert DDMMYYYY → YYYY-MM-DD |
| `POLICIES_DUE`      | `policies_due`                           | Parse as integer            |
| `POLICIES_RENEWED`  | `policies_renewed`                       | Parse as integer            |

---

## 4. Data Type Rules

All files exported from the AS400 system follow these rules:

| Rule                | Detail                                                             |
|---------------------|--------------------------------------------------------------------|
| **Numeric fields**  | No commas, always 2 decimal places (e.g., `25000.00`)              |
| **Date format**     | `DDMMYYYY` — AS400 standard. Convert to `YYYY-MM-DD` on import    |
| **Empty fields**    | Represented as empty string (`,,`), **not** `NULL` literal         |
| **Text quoting**    | Fields containing commas are double-quoted (`"field, value"`)       |
| **Encoding**        | UTF-8, may include BOM (byte order mark)                           |
| **Line endings**    | CRLF (`\r\n`) or LF (`\n`) — both are handled                     |
| **Header row**      | Always present as first row                                        |

### Date Conversion Example

```
AS400 format:  15012026
               ││││││││
               DDMMYYYY
               
Converted:     2026-01-15  (YYYY-MM-DD, ISO 8601)
```

**JavaScript conversion:**

```javascript
function convertAS400Date(ddmmyyyy) {
  if (!ddmmyyyy || ddmmyyyy.trim() === '') return null;
  const dd = ddmmyyyy.substring(0, 2);
  const mm = ddmmyyyy.substring(2, 4);
  const yyyy = ddmmyyyy.substring(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}
```

---

## 5. AS400 Code Mappings

### Transaction Type Codes

The AS400 system uses 2-character short codes. These must be expanded on import:

| AS400 Code | `transaction_type` (Database)  | Description                            |
|------------|-------------------------------|----------------------------------------|
| `NB`       | `NEW_BUSINESS`                 | First-year policy issuance             |
| `RN`       | `RENEWAL`                      | Renewal premium payment (year 2+)      |
| `LP`       | `LAPSE`                        | Policy lapsed — premiums overdue       |
| `RV`       | `REVIVAL`                      | Previously lapsed policy reinstated    |
| `SR`       | `SURRENDER`                    | Policy voluntarily terminated          |

### Source System Tracking

| `source_system` Value | Meaning                                         |
|-----------------------|-------------------------------------------------|
| `LIFEASIA`            | Ingested from Life Asia AS400 SFTP file          |
| `PENTA_API`           | Received via Penta REST API                      |
| `PENTA_CSV`           | Backfilled from Penta CSV reconciliation         |
| `POLICY_ADMIN`        | Uploaded manually via the Incentive System UI    |
| `MANUAL`              | Entered manually by an admin user                |

---

## 6. Processing Pipeline

```
┌──────────────┐     SFTP          ┌───────────────────┐
│  Life Asia   │ ────────────────▶ │  /inbound/        │
│  AS400       │   CSV files       │  lifeasia/policy/  │
└──────────────┘   (nightly)       └─────────┬─────────┘
                                             │
                                    SFTP Poller Job
                                    (node-cron 2:00 AM)
                                             │
                                             ▼
                                   ┌─────────────────────┐
                                   │  1. Download file    │
                                   │  2. Parse CSV        │
                                   │  3. Convert dates    │
                                   │     (DDMMYYYY →      │
                                   │      YYYY-MM-DD)     │
                                   │  4. Map AS400 codes  │
                                   │     (NB→NEW_BUSINESS)│
                                   └─────────┬───────────┘
                                             │
                                             ▼
                                   ┌─────────────────────┐
                                   │  STAGING TABLE       │
                                   │  stg_policy_         │
                                   │  transactions        │
                                   │                      │
                                   │  Bulk UNNEST insert  │
                                   └─────────┬───────────┘
                                             │
                                    Data Quality Checks
                                             │
                                   ┌─────────┴───────────┐
                                   │                      │
                                   ▼                      ▼
                            ┌─────────────┐       ┌──────────────┐
                            │  VALID      │       │  INVALID     │
                            │  records    │       │  records     │
                            │             │       │              │
                            │  Move to    │       │  Mark with   │
                            │  main table │       │  stg_error   │
                            └─────────────┘       └──────────────┘
                                   │
                                   ▼
                           ┌──────────────────┐
                           │  ins_policy_     │
                           │  transactions    │
                           │                  │
                           │  (ON CONFLICT    │
                           │   DO UPDATE)     │
                           └──────────────────┘
                                   │
                                   ▼
                           ┌──────────────────┐
                           │  Log result to   │
                           │  file_processing │
                           │  _log            │
                           └──────────────────┘
                                   │
                                   ▼
                           ┌──────────────────┐
                           │  Move file to    │
                           │  /processed/     │
                           │  YYYYMMDD/       │
                           └──────────────────┘
```

### Processing Steps (Detail)

| Step | Action                              | Detail                                                         |
|------|-------------------------------------|----------------------------------------------------------------|
| 1    | Connect to SFTP                     | Using credentials from `.env` (`SFTP_HOST`, etc.)               |
| 2    | List files in inbound folder        | Match filename pattern (`LIFEASIA_POLICY_TXN_YYYYMMDD.csv`)    |
| 3    | Download file to memory buffer      | No local temp file — buffer-based processing                   |
| 4    | Parse CSV                           | Handle BOM, trim whitespace, skip empty rows                   |
| 5    | Convert AS400 date format           | `DDMMYYYY` → `YYYY-MM-DD` for all date columns                |
| 6    | Map AS400 codes                     | `NB` → `NEW_BUSINESS`, `RN` → `RENEWAL`, etc.                 |
| 7    | Validate required columns           | Check `POLICY_NO`, `AGENT_CD`, `PROD_CD`, `TXN_TYPE`, `PREM_AMT`, `APE`, `PAY_DT` are present |
| 8    | Bulk insert into staging table      | UNNEST-based insert into `stg_policy_transactions`             |
| 9    | Run data quality checks             | FK validation, numeric range checks, duplicate detection        |
| 10   | Move valid records to main table    | `INSERT INTO ins_policy_transactions SELECT ... FROM stg_policy_transactions WHERE stg_status = 'VALID'` |
| 11   | Log result                          | Insert row into `file_processing_log`                          |
| 12   | Archive file                        | Move to `/inbound/lifeasia/processed/YYYYMMDD/`                |
| 13   | On error: quarantine file           | Move to `/inbound/lifeasia/errors/` and log error               |

---

## 7. SFTP Polling Schedule

All times are in **IST (Indian Standard Time, UTC+05:30)**.

| Job                        | Cron Expression       | IST Time   | UTC Time    | File Pattern                            |
|----------------------------|-----------------------|------------|-------------|-----------------------------------------|
| Policy Transactions        | `30 20 * * *` (UTC)   | 2:00 AM    | 20:30 (prev day)   | `LIFEASIA_POLICY_TXN_YYYYMMDD.csv`    |
| Agent Master Sync          | `0 21 * * *` (UTC)    | 2:30 AM    | 21:00 (prev day)   | `LIFEASIA_AGENT_YYYYMMDD.csv`          |
| Persistency Data Check     | `30 21 * * *` (UTC)   | 3:00 AM    | 21:30 (prev day)   | `LIFEASIA_PERSIST_YYYYMM.csv`          |

> **Note:** `node-cron` runs in the server's timezone. The cron expressions above assume the server runs in UTC. Adjust if the server uses IST.

---

## 8. Staging Tables

All inbound files are loaded into staging tables before being promoted to main tables. This enables data quality checks and error isolation.

### `stg_policy_transactions`

Same columns as `ins_policy_transactions` plus staging metadata:

| Column          | Type         | Description                                                    |
|-----------------|-------------|----------------------------------------------------------------|
| *(all columns from `ins_policy_transactions`)*                                              |
| `batch_id`      | VARCHAR(100) | Identifier for the file/batch being processed                  |
| `row_number`    | INT          | Row number from the source CSV file                             |
| `branch_code`   | VARCHAR(20)  | `BRANCH_CD` from CSV (not in main table)                        |
| `stg_status`    | VARCHAR(20)  | `PENDING`, `VALID`, `ERROR`. Default: `PENDING`                 |
| `stg_error`     | TEXT         | Error description if validation fails                           |
| `stg_loaded_at` | TIMESTAMP    | When the row was loaded into staging                            |

### `stg_agent_master`

Same columns as `ins_agents` plus staging metadata:

| Column          | Type         | Description                                                    |
|-----------------|-------------|----------------------------------------------------------------|
| *(all columns from `ins_agents`)*                                                           |
| `batch_id`      | VARCHAR(100) | Identifier for the file/batch being processed                  |
| `row_number`    | INT          | Row number from the source CSV file                             |
| `stg_status`    | VARCHAR(20)  | `PENDING`, `VALID`, `ERROR`. Default: `PENDING`                 |
| `stg_error`     | TEXT         | Error description if validation fails                           |
| `stg_loaded_at` | TIMESTAMP    | When the row was loaded into staging                            |

### `file_processing_log`

Tracks every file ingestion attempt:

| Column           | Type         | Description                                                  |
|-----------------|-------------|--------------------------------------------------------------|
| `id`             | SERIAL       | Primary key                                                  |
| `file_name`      | VARCHAR(255) | Original filename                                            |
| `file_type`      | VARCHAR(50)  | `POLICY_TXN`, `AGENT_MASTER`, `PERSISTENCY`                  |
| `source_system`  | VARCHAR(30)  | `LIFEASIA`                                                    |
| `batch_id`       | VARCHAR(100) | Unique batch identifier                                       |
| `total_rows`     | INT          | Total rows in the file                                        |
| `valid_rows`     | INT          | Rows that passed validation                                   |
| `error_rows`     | INT          | Rows that failed validation                                   |
| `inserted_rows`  | INT          | Rows successfully inserted into main table                    |
| `updated_rows`   | INT          | Rows updated (via upsert/ON CONFLICT)                         |
| `status`         | VARCHAR(30)  | `SUCCESS`, `PARTIAL`, `FAILED`                                |
| `error_message`  | TEXT         | Summary error message (if any)                                |
| `started_at`     | TIMESTAMP    | When processing started                                       |
| `completed_at`   | TIMESTAMP    | When processing completed                                     |

---

## 9. Data Quality Checks

Checks run against `stg_policy_transactions` after bulk load:

| #  | Check                              | Rule                                                        | On Failure                      |
|----|-----------------------------------|-------------------------------------------------------------|---------------------------------|
| 1  | Required fields present            | `POLICY_NO`, `AGENT_CD`, `PROD_CD`, `TXN_TYPE`, `PREM_AMT`, `APE`, `PAY_DT` must be non-empty | `stg_status = 'ERROR'`, `stg_error = 'Missing required field: <name>'` |
| 2  | Agent code exists                  | `AGENT_CD` must exist in `ins_agents.agent_code`             | `stg_error = 'Unknown agent code'` |
| 3  | Product code exists                | `PROD_CD` must exist in `ins_products.product_code`          | `stg_error = 'Unknown product code'` |
| 4  | Valid transaction type             | `TXN_TYPE` must be one of: `NB`, `RN`, `LP`, `RV`, `SR`     | `stg_error = 'Invalid transaction type'` |
| 5  | Premium amount ≥ 0                 | `PREM_AMT` must be a non-negative number                     | `stg_error = 'Invalid premium amount'` |
| 6  | Valid date format                  | All date fields must be valid 8-digit DDMMYYYY                | `stg_error = 'Invalid date format'` |
| 7  | Duplicate detection                | No duplicate `(POLICY_NO, TXN_TYPE, DUE_DT)` within batch    | `stg_error = 'Duplicate record in batch'` |
| 8  | Channel exists                     | If `CHANNEL` is provided, must exist in `channels.name`       | `stg_error = 'Unknown channel'` |
| 9  | Region exists                      | If `REGION` is provided, must exist in `ins_regions.region_code` | `stg_error = 'Unknown region code'` |

---

## 10. Error Handling & Alerting

| Scenario                      | Behavior                                                           |
|-------------------------------|---------------------------------------------------------------------|
| SFTP connection failure       | Log error, retry up to 3 times with exponential backoff (1s, 4s, 16s). Alert via log. |
| File not found                | Log info message — normal (no file today). No alert.                 |
| CSV parse error (fatal)       | Move file to `/errors/`. Log to `file_processing_log` with `status = 'FAILED'`. |
| Partial validation failure    | Move valid rows to main table. Mark errors in staging. Log with `status = 'PARTIAL'`. |
| All rows fail validation      | Log with `status = 'FAILED'`. Move file to `/errors/`.               |
| Database error during insert  | Rollback staging transaction. Move file to `/errors/`. Log error.     |
| Duplicate file (re-processing) | Skip if file already recorded in `file_processing_log` with `status = 'SUCCESS'`. |

---

## 11. File Lifecycle

```
 New file deposited          Processing              Archive
 by Life Asia                by Poller               
                                                     
 /inbound/lifeasia/     ──▶  Parse + Validate   ──▶  /processed/YYYYMMDD/
    policy/                                           (success)
    agents/                                           
    persistency/                                  ──▶  /errors/
                                                      (failure)
```

| State       | Location                                        | Retention           |
|-------------|------------------------------------------------|---------------------|
| **New**     | `/inbound/lifeasia/{policy\|agents\|persistency}/` | Until processed     |
| **Success** | `/inbound/lifeasia/processed/YYYYMMDD/`          | 90 days (configurable) |
| **Error**   | `/inbound/lifeasia/errors/`                      | Until manual review  |

---

## 12. Environment Variables

Required `.env` configuration for the SFTP poller:

| Variable              | Description                                | Example                          |
|-----------------------|--------------------------------------------|----------------------------------|
| `SFTP_HOST`           | SFTP server hostname or IP                 | `sftp.lifeasia.example.com`      |
| `SFTP_PORT`           | SFTP port                                  | `22`                             |
| `SFTP_USERNAME`       | SFTP login username                        | `incentive_svc`                  |
| `SFTP_PASSWORD`       | SFTP password (if not using key auth)       | `***`                            |
| `SFTP_PRIVATE_KEY_PATH` | Path to SSH private key (if key-based)    | `/etc/secrets/sftp_key`          |
| `SFTP_BASE_PATH`      | Base SFTP path for Life Asia files          | `/inbound/lifeasia`              |
