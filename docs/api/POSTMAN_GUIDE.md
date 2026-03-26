# Postman Collection — Usage Guide

> Companion guide for **IncentiveSystem.postman_collection.json**

---

## Quick Start

### 1. Import the Collection

1. Open **Postman** (desktop or web).
2. Click **Import** → **Upload Files**.
3. Select `docs/api/IncentiveSystem.postman_collection.json`.
4. The collection "**Insurance Incentive Management System**" appears in your sidebar with 18 folders.

### 2. Check Collection Variables

Click the collection name → **Variables** tab. You'll see these pre-configured:

| Variable | Default | Purpose |
|----------|---------|---------|
| `base_url` | `http://localhost:5000/api` | API base URL |
| `user_token` | *(empty)* | Auto-filled after login |
| `system_token` | *(empty)* | Auto-filled after system token request |
| `program_id` | `1` | Used across program-scoped endpoints |
| `period_start` | `2026-01-01` | Start of incentive period |
| `period_end` | `2026-01-31` | End of incentive period |
| `agent_code` | `AGT001` | Sample agent code |

> **Tip:** Change `base_url` to `https://api.incentive.yourdomain.com/api` for production.

### 3. Start the Server

```bash
cd server
npm install
cp .env.example .env    # configure DB credentials
npm start               # starts on port 5000
```

### 4. Get Your Tokens

1. **Run "Get System Token"** in the `01 - Authentication` folder.
   - The test script automatically saves the JWT to `{{system_token}}`.
2. **Run "Login (User Auth)"** if user auth is enabled.
   - Saves JWT to `{{user_token}}`.

All subsequent requests will use these tokens automatically.

---

## Folder Structure

| # | Folder | Requests | Auth | Description |
|---|--------|----------|------|-------------|
| 01 | Authentication | 3 | None/User | Login, refresh, system token |
| 02 | Programs & Groups | 10 | User | CRUD for programs and user groups |
| 03 | KPI Configuration | 7 | User | KPI rules and milestone tiers |
| 04 | Payout Rules | 7 | User | Commission rules, slabs, qualifying gates |
| 05 | Data Upload | 6 | User | CSV uploads (policies, agents, rates) |
| 06 | Calculations | 3 | User | Run, check status, recompute |
| 07 | Incentive Results | 8 | User | View, approve, pay, pipeline summary |
| 08 | Leaderboard & Dashboard | 2 | User | Analytics and executive dashboard |
| 09 | Integration Inbound | 4 | System | Penta policy push + heartbeat |
| 10 | Integration Outbound | 3 | User | SAP FICO / Oracle AP exports |
| 11 | Integration Monitoring | 7 | User | Status, logs, manual triggers |
| 12 | Review Adjustments | 7 | User | Review, adjust, hold, release, batch-approve, audit |
| 13 | Exception Log | 3 | User | List, view, resolve exceptions |
| 14 | Executive Summary | 1 | User | Executive dashboard data |
| 15 | System Status | 1 | User | System health check |
| 16 | Notifications | 3 | User | List, read, mark-all-read |
| 17 | Org & Domain Mapping | 1 | User | Org hierarchy by dimension |
| 18 | KPI Config Helpers | 3 | User | Registry, validate, summary |

---

## Suggested Testing Sequence

Follow this order when setting up a **new environment** to ensure
data dependencies are satisfied:

### Phase 1: Setup & Authentication
```
01 - Authentication
  ├── Get System Token          ← run first
  └── Login (User Auth)         ← run second
```

### Phase 2: Configure Programs
```
02 - Programs & Groups
  ├── Create Program            ← saves {{program_id}}
  ├── List All Programs
  ├── Get Program by ID
  ├── Create Group
  └── Add Members to Group
```

### Phase 3: Define Rules
```
03 - KPI Configuration
  ├── Create KPI                ← needs program_id
  └── Create KPI Milestone

04 - Payout Rules
  ├── Create Payout Rule        ← needs program_id
  ├── Create Payout Slab
  └── Create Qualifying Rule
```

### Phase 4: Load Data
```
05 - Data Upload
  ├── Upload Agents             ← CSV file required
  ├── Upload Policy Transactions
  ├── Upload Persistency
  └── Upload Incentive Rates
```

### Phase 5: Calculate & Approve
```
06 - Calculations
  └── Run Calculation           ← needs data from Phase 4

07 - Incentive Results & Approval
  ├── List Incentive Results
  ├── Get Stage Summary
  ├── Bulk Approve Results
  ├── Initiate Payment
  └── Mark as Paid
```

### Phase 6: Review & Export
```
08 - Leaderboard & Dashboard
  ├── Get Leaderboard
  └── Get Dashboard Summary

10 - Integration Outbound
  └── Export to Oracle Financials
```

### Phase 7: Integration Testing
```
09 - Integration Inbound
  ├── Penta: Push Policy Batch  ← uses system_token
  └── Penta: Sync Status

11 - Integration Monitoring
  ├── Get Integration Status
  ├── Get Audit Log
  └── Trigger Reprocess
```

### Phase 8: Review & Monitoring
```
12 - Review Adjustments
  ├── Review calculation results
  ├── Apply adjustments
  ├── Hold/Release
  └── Batch approve

13 - Exception Log
  ├── Check exception log
  └── Resolve exceptions

14–18 - Supporting Modules
  ├── View executive summary
  ├── System status
  ├── Notifications
  ├── Browse org/domain mapping
  └── KPI config helpers
```

---

## Environment Setup

### Pre-built Environment Files

Three ready-to-import environment files are available in `docs/api/environments/`:

| File | Environment | Base URL |
|------|-------------|----------|
| `incentive_local.postman_environment.json` | LOCAL | `http://localhost:5000/api` |
| `incentive_uat.postman_environment.json` | UAT | `https://uat-api.incentive.yourdomain.com/api` |
| `incentive_prod.postman_environment.json` | PRODUCTION | `https://api.incentive.yourdomain.com/api` |

**To import:**
1. In Postman, click the ⚙️ gear icon (top-right) → **Import**.
2. Select the environment JSON file.
3. Select the environment from the dropdown (top-right).

> ⚠️ **PRODUCTION WARNING:** The PROD environment is for read-only verification only.
> Do **NOT** run DELETE requests, bulk-approve, or any destructive operations in production.

### Environment Variables

Each environment file includes these variables:

| Variable | Purpose | Filled by |
|----------|---------|-----------|
| `base_url` | API base URL | Pre-set per environment |
| `user_token` | User JWT | Auto-saved after login |
| `system_token` | System JWT | Auto-saved after system-token call |
| `program_id` | Target program | Manual or auto-saved |
| `period_start` | Period start date | Manual |
| `period_end` | Period end date | Manual |
| `agent_code` | Sample agent code | Manual |
| `client_id` | API client ID for system auth | Manual |
| `client_secret` | API client secret | Manual (secret type) |
| `env_name` | Environment label | Pre-set |

> Environment variables override collection variables with the same name.

---

## File Upload Endpoints

The `05 - Data Upload` folder uses **form-data** requests. To attach a file:

1. Open the request (e.g. "Upload Policy Transactions").
2. In the **Body** tab, find the `file` key.
3. Click **Select Files** and choose your CSV.
4. Click **Send**.

### Sample CSV Headers

**Policy Transactions:**
```csv
policy_number,agent_code,product_code,transaction_type,premium_amount,annualized_premium,paid_date
POL-2026-001234,AGT001,LIFE-ENDOW-20,NEW_BUSINESS,25000,300000,2026-01-15
```

**Agents:**
```csv
agent_code,agent_name,channel_code,region_code,hierarchy_level
AGT001,Rajesh Kumar,AGENCY,NORTH,2
AGT002,Priya Sharma,BANCASSURANCE,WEST,3
```

**Persistency:**
```csv
agent_code,persistency_month,period_start,period_end,policies_due,policies_renewed
AGT001,13,2026-01-01,2026-01-31,100,88
```

---

## Test Scripts

Every request includes at least one **Test** script that runs automatically:

```javascript
// Basic status check (included on all requests)
pm.test("Status 200", () => pm.response.to.have.status(200));

// Auth endpoints auto-save tokens
const json = pm.response.json();
if (json.token) {
    pm.collectionVariables.set("system_token", json.token);
}
```

### Running All Tests

1. Click **...** on the collection → **Run collection**.
2. Select the folders you want to test.
3. Click **Run Insurance Incentive Management System**.
4. View results in the **Runner** tab.

> **Note:** Run folders in sequence (01 → 18) for best results.
> Upload endpoints require actual CSV files, so skip folder 05 in automated runs
> unless you've configured file paths.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` on integration endpoints | Run "Get System Token" first |
| `401 ENDPOINT_NOT_ALLOWED` | Check `api_clients.allowed_endpoints` in the database |
| `Cannot connect to server` | Ensure `npm start` is running on port 5000 |
| `Empty response from dashboard` | Run calculation first to populate results |
| File upload returns error | Check CSV column names match expected headers |
| `Token expired` | Re-run the token request — tokens expire after 24h |

---

## Related Documentation

- [API Reference (Markdown)](./API_REFERENCE.md) — Full endpoint documentation
- [OpenAPI Spec](./openapi.yaml) — Machine-readable spec (Swagger UI at `/api/docs`)
- [Inbound Penta API](./INBOUND_PENTA_API.md) — Penta integration details
- [Outbound Oracle Financials](./OUTBOUND_ORACLE_FINANCIALS.md) — Export format spec
