# Job Trigger Runbook

> Production runbook for triggering background jobs via external cron scheduler.
> Quartz.NET is deferred; use external cron + HTTP triggers as the go-live pattern.
> Last updated: March 2026

---

## Overview

The Incentive Management API includes endpoints that trigger background processing tasks. In production, these should be invoked on a schedule using an external scheduler (cron, Azure Timer Function, AWS EventBridge, etc.).

---

## Job Trigger Endpoints

### 1. SFTP File Poll

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/integration/trigger/sftp-poll` |
| **Auth** | System token (Bearer JWT with `type=SYSTEM`) |
| **Schedule** | Every 15 minutes during business hours |
| **Purpose** | Poll SFTP server for new Life Asia CSV files |
| **Cron** | `*/15 8-18 * * 1-5` |
| **Fallback** | Manual upload via `/api/v1/upload/*` endpoints |

### 2. Hierarchy Sync

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/integration/trigger/hierarchy-sync` |
| **Auth** | System token |
| **Schedule** | Daily at 02:00 UTC |
| **Purpose** | Sync agent hierarchy from internal Hierarchy API |
| **Cron** | `0 2 * * *` |
| **Fallback** | Manual trigger via API or admin UI |

### 3. Penta Sync

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/v1/integration/trigger/penta-sync` |
| **Auth** | System token |
| **Schedule** | Daily at 03:00 UTC |
| **Purpose** | Sync policy/product data from KGILS Penta |
| **Cron** | `0 3 * * *` |
| **Fallback** | Manual CSV upload |

---

## System Token Generation

Obtain a system token for cron job authentication:

```bash
# Generate system token (valid for 24 hours by default)
curl -X POST https://api.incentive.yourdomain.com/api/auth/system-token \
  -H "Content-Type: application/json" \
  -d '{"client_id": "incentive_cron", "client_secret": "YOUR_CLIENT_SECRET"}'
```

Response:
```json
{ "token": "eyJhbGciOiJI..." }
```

---

## Example Cron Setup (Linux crontab)

```bash
#!/bin/bash
# /opt/incentive/cron-jobs.sh

API_BASE="https://api.incentive.yourdomain.com"
TOKEN=$(curl -s -X POST $API_BASE/api/auth/system-token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"incentive_cron","client_secret":"SECRET"}' | jq -r '.token')

# SFTP Poll
curl -s -X POST $API_BASE/api/v1/integration/trigger/sftp-poll \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Hierarchy Sync
curl -s -X POST $API_BASE/api/v1/integration/trigger/hierarchy-sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

```crontab
# SFTP poll every 15 minutes (business hours)
*/15 8-18 * * 1-5  /opt/incentive/cron-sftp-poll.sh >> /var/log/incentive-cron.log 2>&1

# Hierarchy sync daily at 2 AM UTC
0 2 * * * /opt/incentive/cron-hierarchy-sync.sh >> /var/log/incentive-cron.log 2>&1

# Penta sync daily at 3 AM UTC
0 3 * * * /opt/incentive/cron-penta-sync.sh >> /var/log/incentive-cron.log 2>&1
```

---

## Monitoring

| Check | Action |
|-------|--------|
| Cron job exit code ≠ 0 | Alert on-call engineer |
| No SFTP files processed in 24h | Check SFTP connectivity and file availability |
| Hierarchy sync returns errors | Check Hierarchy API availability |
| Token generation fails | Check `api_clients` table and secrets |

---

## Quartz.NET Migration Path

When Quartz.NET is implemented:
1. Register hosted services in `InfrastructureServiceCollectionExtensions.cs`
2. Configure job schedules in appsettings
3. Remove external cron scripts
4. Keep trigger endpoints as manual override option
