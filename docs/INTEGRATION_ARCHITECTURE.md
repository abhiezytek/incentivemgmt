# Integration Architecture

> Insurance Incentive Management System — External System Integration Reference

---

## Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                          SOURCE SYSTEMS (Inbound)                               │
 │                                                                                 │
 │  ┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐  │
 │  │   Life Asia          │   │   KGILS Penta        │   │  Internal Hierarchy  │  │
 │  │  (AS400/IBM iSeries) │   │   System             │   │  System (In-house)   │  │
 │  │                      │   │                      │   │                      │  │
 │  │  Policy Admin System │   │  Policy Admin System │   │  Agent Master &      │  │
 │  │                      │   │                      │   │  Org Structure       │  │
 │  └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘  │
 │             │                          │                          │              │
 │        CSV / SFTP               REST API + CSV              REST API            │
 │        (Daily batch)         (Real-time + Daily)          (Daily 2 AM)          │
 │             │                          │                          │              │
 └─────────────┼──────────────────────────┼──────────────────────────┼──────────────┘
               │                          │                          │
               ▼                          ▼                          ▼
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                 │
 │          ┌──────────┐    ┌──────────┐    ┌──────────────────────┐              │
 │          │  SFTP    │    │  REST    │    │  Calculation Engine  │              │
 │          │  Ingest  │───▶│  Ingest  │───▶│  & Rule Processor    │              │
 │          └──────────┘    └──────────┘    └──────────┬───────────┘              │
 │                                                      │                          │
 │                  ┌───────────────────────────────────┐│                          │
 │                  │        INCENTIVE MANAGEMENT       ││                          │
 │                  │            SYSTEM                 ││                          │
 │                  │                                   ││                          │
 │                  │  ┌────────────┐  ┌────────────┐  ││                          │
 │                  │  │  Database  │  │  Web UI    │  ││                          │
 │                  │  │ (Postgres) │  │ (React)    │◀─┤│  Finance Users          │
 │                  │  └────────────┘  └────────────┘  ││  (JWT Login)            │
 │                  │                                   ││                          │
 │                  │  ┌────────────┐  ┌────────────┐  ││                          │
 │                  │  │  Approval  │  │  Payment   │  ││                          │
 │                  │  │  Workflow  │──▶│  File Gen  │──┘│                          │
 │                  │  └────────────┘  └──────┬─────┘   │                          │
 │                  │                         │         │                          │
 │                  └─────────────────────────┼─────────┘                          │
 │                                            │                                    │
 │          ┌──────────┐    ┌──────────┐      │                                    │
 │          │  SFTP    │    │  Manual  │◀─────┘                                    │
 │          │  Outbound│    │ Download │   CSV / REST                              │
 │          └────┬─────┘    └────┬─────┘                                           │
 │               │               │                                                 │
 └───────────────┼───────────────┼─────────────────────────────────────────────────┘
                 │               │
                 ▼               ▼
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                          TARGET SYSTEMS (Outbound)                              │
 │                                                                                 │
 │  ┌──────────────────────────────┐   ┌──────────────────────────────┐           │
 │  │        SAP FICO              │   │      Oracle Financials       │           │
 │  │     (Finance/Payroll)        │   │      (Finance/Payroll)       │           │
 │  │                              │   │                              │           │
 │  │  CSV (SAP-compatible)        │   │  CSV (Oracle AP interface)   │           │
 │  │  or REST API                 │   │  or REST API                 │           │
 │  │                              │   │                              │           │
 │  │  On-demand generation        │   │  On-demand generation        │           │
 │  │  (Admin clicks Generate)     │   │  (Admin clicks Generate)     │           │
 │  └──────────────────────────────┘   └──────────────────────────────┘           │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘


 ┌────────────────────────────────────────────────────────────┐
 │                     SFTP Folder Layout                     │
 │                                                            │
 │   /inbound/lifeasia/   ◀── Life Asia daily CSVs            │
 │   /inbound/penta/      ◀── KGILS Penta fallback CSVs      │
 │   /outbound/sap/       ──▶ SAP FICO payment files          │
 │   /outbound/oracle/    ──▶ Oracle Financials payment files  │
 │                                                            │
 └────────────────────────────────────────────────────────────┘
```

---

## 1. Source Systems (Inbound)

### 1.1 Life Asia (AS400 / IBM iSeries) — Policy Administration System

| Attribute        | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **System**       | Life Asia (AS400 / IBM iSeries)                           |
| **Role**         | Policy Administration System                              |
| **Connection**   | Flat file CSV via SFTP server                             |
| **Frequency**    | Daily batch — nightly extract                             |
| **Data**         | Policy transactions: new business, renewals, lapses       |
| **File Format**  | CSV                                                       |
| **SFTP Path**    | `/inbound/lifeasia/`                                      |
| **Auth**         | SFTP credentials (key-based or password)                  |

**Integration Flow:**
1. Life Asia AS400 generates a nightly CSV extract of policy transactions.
2. The file is dropped into the SFTP folder `/inbound/lifeasia/`.
3. The Incentive System's SFTP ingestion job picks up the file during the nightly batch window.
4. CSV rows are parsed, validated, and loaded into `ins_policy_transactions`.
5. Successfully processed files are archived; errors are logged for review.

---

### 1.2 KGILS Penta System — Policy Administration System

| Attribute        | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **System**       | KGILS Penta System                                        |
| **Role**         | Policy Administration System                              |
| **Connection**   | REST API (primary) + CSV fallback via SFTP                |
| **Frequency**    | Real-time via API + Daily batch reconciliation             |
| **Data**         | Policy transactions, policy status changes                |
| **Auth**         | JWT Bearer token                                          |
| **SFTP Path**    | `/inbound/penta/` (fallback only)                         |

**Integration Flow (Primary — REST API):**
1. Penta system pushes real-time policy events via REST API.
2. The Incentive System validates the JWT Bearer token.
3. Transaction data is validated and inserted into `ins_policy_transactions`.

**Integration Flow (Fallback — CSV):**
1. If the API is unavailable, Penta drops CSV files to `/inbound/penta/`.
2. The daily batch reconciliation job compares SFTP data with API-received data.
3. Missing records are backfilled from the CSV.

---

### 1.3 Internal Hierarchy System (In-house)

| Attribute        | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **System**       | Internal Hierarchy System (built in-house)                |
| **Role**         | Agent master data and organizational structure             |
| **Connection**   | REST API                                                  |
| **Frequency**    | Daily sync at 2:30 AM IST                                |
| **Data**         | Agent master records, reporting hierarchy, org structure   |
| **Auth**         | JWT Bearer token                                          |

**Integration Flow:**
1. A scheduled job runs at 2:30 AM IST daily.
2. The system calls the Hierarchy REST API to fetch the full agent master and hierarchy.
3. Agent records are upserted into `ins_agents`.
4. Reporting relationships and org structure are updated in the hierarchy tables.
5. Changes are logged for audit trail.

---

## 2. Target Systems (Outbound)

### 2.1 SAP FICO — Finance / Payroll

| Attribute        | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **System**       | SAP FICO                                                  |
| **Role**         | Finance and Payroll processing                            |
| **Connection**   | REST API or CSV file generation                           |
| **Frequency**    | On-demand (Admin clicks "Generate Payment File")          |
| **Data**         | Approved incentive payout file                            |
| **File Format**  | CSV — SAP-compatible structure                            |
| **SFTP Path**    | `/outbound/sap/`                                          |
| **Auto-push**    | **No** — file is generated and downloaded manually        |

**Integration Flow:**
1. Finance user reviews approved incentive results in the Web UI.
2. User clicks "Generate Payment File" for SAP.
3. The system generates a CSV file conforming to SAP FICO's expected interface format.
4. The file is made available for manual download by the Finance user.
5. Optionally, the file can be placed in `/outbound/sap/` on the SFTP server for pickup.
6. **There is no automatic push** — Finance must manually retrieve the file.

---

### 2.2 Oracle Financials — Finance / Payroll

| Attribute        | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **System**       | Oracle Financials                                         |
| **Role**         | Finance and Payroll processing (alternative to SAP)       |
| **Connection**   | REST API or CSV file generation                           |
| **Frequency**    | On-demand (Admin clicks "Generate Payment File")          |
| **Data**         | Approved incentive payout file                            |
| **File Format**  | CSV — Oracle AP interface format                          |
| **SFTP Path**    | `/outbound/oracle/`                                       |
| **Auto-push**    | **No** — file is generated and downloaded manually        |

**Integration Flow:**
1. Finance user reviews approved incentive results in the Web UI.
2. User clicks "Generate Payment File" for Oracle.
3. The system generates a CSV file conforming to Oracle AP's interface specification.
4. The file is made available for manual download by the Finance user.
5. Optionally, the file can be placed in `/outbound/oracle/` on the SFTP server for pickup.
6. **There is no automatic push** — Finance must manually retrieve the file.

---

## 3. User Access

| Aspect             | Detail                                                 |
|--------------------|--------------------------------------------------------|
| **User Type**      | Finance users                                          |
| **Access Method**  | Direct login to Incentive System Web UI                |
| **Authentication** | JWT-based login (username + password → JWT token)      |
| **SSO**            | Not implemented — standalone JWT auth                  |
| **Capabilities**   | View approved payouts, generate payment files          |

---

## 4. Security

| Security Control     | Detail                                                             |
|----------------------|--------------------------------------------------------------------|
| **API Auth**         | All API calls use JWT Bearer tokens                                |
| **IP Whitelisting**  | Not required currently                                             |
| **Data Masking**     | Policy numbers masked in UI and exports                            |
| **Masking Format**   | Show first 3 + last 2 digits only (e.g., `POL****234`)            |
| **Token Expiry**     | JWT tokens have configurable expiry                                |
| **Transport**        | HTTPS for all API communication; SFTP (SSH-encrypted) for files    |

### Data Masking Example

| Original Policy Number | Masked Value     |
|------------------------|------------------|
| `POL12345234`          | `POL****234`     |
| `ABC98765432`          | `ABC****432`     |
| `LIF00001199`          | `LIF****199`     |

> **Rule:** Display the first 3 characters, replace middle characters with `****`, display the last 2–3 digits.

---

## 5. File Exchange

| Parameter              | Detail                                                 |
|------------------------|--------------------------------------------------------|
| **File Format**        | CSV only                                               |
| **Transfer Protocol**  | SFTP                                                   |
| **Inbound Folders**    | `/inbound/lifeasia/`, `/inbound/penta/`                |
| **Outbound Folders**   | `/outbound/sap/`, `/outbound/oracle/`                  |
| **Persistency Data**   | Monthly file upload via UI (manual upload)              |
| **Re-upload Behavior** | Revised file re-upload **replaces** previous month data |

### File Naming Convention (Recommended)

| System         | Direction | Pattern                                          | Example                           |
|----------------|-----------|--------------------------------------------------|-----------------------------------|
| Life Asia      | Inbound   | `lifeasia_transactions_YYYYMMDD.csv`             | `lifeasia_transactions_20260322.csv` |
| KGILS Penta    | Inbound   | `penta_transactions_YYYYMMDD.csv`                | `penta_transactions_20260322.csv`    |
| SAP FICO       | Outbound  | `sap_payout_YYYYMMDD_HHMMSS.csv`                | `sap_payout_20260322_143000.csv`     |
| Oracle         | Outbound  | `oracle_payout_YYYYMMDD_HHMMSS.csv`             | `oracle_payout_20260322_143000.csv`  |
| Persistency    | Upload    | `persistency_YYYYMM.csv`                        | `persistency_202603.csv`             |

---

## 6. Integration Touchpoints Summary

| # | Source System          | Target System          | Protocol       | Direction | Frequency                      | Data                                        | Auth              |
|---|------------------------|------------------------|----------------|-----------|--------------------------------|---------------------------------------------|-------------------|
| 1 | Life Asia (AS400)      | Incentive System       | SFTP (CSV)     | Inbound   | Daily batch (nightly)          | Policy transactions (NB, renewals, lapses)  | SFTP credentials  |
| 2 | KGILS Penta            | Incentive System       | REST API       | Inbound   | Real-time                      | Policy transactions, status changes         | JWT Bearer token  |
| 3 | KGILS Penta            | Incentive System       | SFTP (CSV)     | Inbound   | Daily batch (reconciliation)   | Policy transactions (fallback)              | SFTP credentials  |
| 4 | Internal Hierarchy     | Incentive System       | REST API       | Inbound   | Daily sync at 2:00 AM          | Agent master, hierarchy, org structure      | JWT Bearer token  |
| 5 | Incentive System       | SAP FICO               | CSV / REST API | Outbound  | On-demand (manual trigger)     | Approved incentive payout file              | JWT Bearer token  |
| 6 | Incentive System       | Oracle Financials      | CSV / REST API | Outbound  | On-demand (manual trigger)     | Approved incentive payout file              | JWT Bearer token  |
| 7 | Finance User (Browser) | Incentive System       | HTTPS          | Inbound   | On-demand                      | Login, view payouts, generate files         | JWT (login)       |
| 8 | Finance User (Browser) | Incentive System       | HTTPS (Upload) | Inbound   | Monthly                        | Persistency data CSV upload                 | JWT (login)       |

---

## 7. Data Flow Summary

```
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │   Life Asia   │──CSV──▶│               │        │               │
 │   (AS400)     │  SFTP  │               │        │               │
 └───────────────┘        │               │        │               │
                          │               │  CSV   │   SAP FICO    │
 ┌───────────────┐  API   │   INCENTIVE   │──────▶ │               │
 │  KGILS Penta  │──────▶ │   MANAGEMENT  │        └───────────────┘
 │               │  +CSV  │    SYSTEM     │
 └───────────────┘        │               │        ┌───────────────┐
                          │  ┌──────────┐ │  CSV   │    Oracle     │
 ┌───────────────┐  API   │  │ Postgres │ │──────▶ │  Financials   │
 │   Hierarchy   │──────▶ │  │    DB    │ │        └───────────────┘
 │   System      │        │  └──────────┘ │
 └───────────────┘        │               │        ┌───────────────┐
                          │  ┌──────────┐ │  JWT   │   Finance     │
                          │  │ React UI │◀├──────▶ │   Users       │
                          │  └──────────┘ │        └───────────────┘
                          └───────────────┘
```

---

## 8. Error Handling & Retry Strategy

| Integration        | Error Handling                                                                 |
|--------------------|--------------------------------------------------------------------------------|
| Life Asia SFTP     | Files that fail parsing are moved to an error folder; alerts sent to admin     |
| Penta REST API     | Automatic retry with exponential backoff (3 attempts); falls back to CSV       |
| Penta CSV fallback | Daily reconciliation detects and backfills missing API records                 |
| Hierarchy Sync     | Retry up to 3 times; failure logged, previous hierarchy data retained          |
| SAP/Oracle Export  | Generation failures shown in UI; user can retry                                |

---

## 9. Scheduling Overview

| Job                           | Schedule                | Trigger       |
|-------------------------------|-------------------------|---------------|
| Life Asia CSV ingestion       | Daily, nightly window   | Cron / batch  |
| Penta real-time API           | Continuous               | Event-driven  |
| Penta CSV reconciliation      | Daily, after API window | Cron / batch  |
| Hierarchy sync                | Daily at 2:30 AM IST    | Cron          |
| SAP payment file generation   | On-demand               | Manual (UI)   |
| Oracle payment file generation| On-demand               | Manual (UI)   |
| Persistency data upload       | Monthly                 | Manual (UI)   |

---

## 10. Environment & Connectivity

| Component              | Technology                     |
|------------------------|--------------------------------|
| Application Server     | Node.js (Express)              |
| Database               | PostgreSQL                     |
| Frontend               | React (Vite)                   |
| File Transfer          | SFTP                           |
| API Protocol           | REST over HTTPS                |
| Authentication         | JWT Bearer tokens              |
| File Format            | CSV                            |
