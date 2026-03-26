# Jobs and SFTP Go-Live Decision

> Decision document for deferred background jobs and SFTP integration.

---

## A. Quartz.NET Scheduler

### Current State
- **Node.js**: Runs SFTP poller and hierarchy sync as in-process background loops
- **.NET**: Has trigger endpoints (`POST /api/integration/trigger/sftp-poll`, `POST /api/integration/trigger/hierarchy-sync`) but no in-process scheduling

### Decision: DEFER — Trigger Endpoints + External Scheduler Sufficient

**Rationale:**
1. Trigger endpoints are implemented and functional in .NET
2. External scheduling (cron, Azure Timer, AWS EventBridge) can call trigger endpoints on any required interval
3. Quartz.NET adds operational complexity (persistent job store, recovery logic) that is not needed for 2 simple periodic tasks
4. Node.js in-process loops have no retry, persistence, or clustering features — external cron provides equivalent or better reliability

**Go-Live Plan:**
- DevOps configures external cron/timer to call:
  - `POST /api/integration/trigger/sftp-poll` — every 15 minutes (matches Node.js interval)
  - `POST /api/integration/trigger/hierarchy-sync` — every 6 hours (matches Node.js interval)
- Monitor integration status via `GET /api/integration/status`

**Post-Go-Live Enhancement:**
- Evaluate Quartz.NET if more complex scheduling needs arise (e.g., multi-step workflows, failure recovery, job dependencies)

---

## B. SFTP Client

### Current State
- **Node.js**: Uses `ssh2-sftp-client` to poll Life Asia SFTP server for new CSV files
- **.NET**: SFTP trigger endpoint exists but actual SSH/SFTP client library (SSH.NET) not integrated

### Decision: DEFER — Manual Upload Covers Business Process

**Rationale:**
1. All CSV upload endpoints are fully migrated with complete validation, parsing, and persistence
2. Files can be manually uploaded via `POST /api/upload/policy-transactions`, `POST /api/upload/persistency`, etc.
3. SFTP polling frequency in Node.js is low (every 15 minutes) — manual check + upload is operationally feasible
4. SSH.NET integration requires SFTP server credentials, host key verification, and connection management that should be configured carefully

**Go-Live Plan:**
- Operators manually download files from SFTP and upload via UI/API endpoints
- All validation, duplicate detection, and audit logging works identically to automated SFTP flow

**Post-Go-Live Enhancement:**
- Add SSH.NET dependency and implement `SftpPollerService` as a hosted service
- Configure SFTP credentials via `appsettings.json` or secrets manager
- Wire into existing trigger endpoint for consistent interface

---

## Summary

| Deferred Item | Go-Live Decision | Sufficient for UAT? | Sufficient for Production? |
|---|---|---|---|
| Quartz.NET scheduler | External cron/timer | ✅ Yes | ✅ Yes |
| SFTP client (SSH.NET) | Manual upload | ✅ Yes | ✅ Yes (with operator procedure) |

### Verdict
**Neither Quartz.NET nor SFTP must be completed before cutover.**
Both have proven workarounds that provide equivalent business outcomes.
