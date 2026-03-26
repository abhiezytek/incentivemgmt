# Incident Response Matrix

> Incident classification and response procedures for the Incentive Management API.
> Last updated: March 2026

---

## Severity Classification

| Severity | Definition | Response Time | Resolution Target |
|----------|-----------|--------------|------------------|
| **SEV-1** | System completely down, all users affected | Immediate (< 5 min) | 1 hour |
| **SEV-2** | Critical feature broken, business blocked | 30 minutes | 4 hours |
| **SEV-3** | Feature degraded, workaround available | 2 hours | 24 hours |
| **SEV-4** | Minor issue, cosmetic, non-blocking | Next business day | 1 week |

---

## Incident Scenarios

### API / Infrastructure

| Scenario | Severity | Owner | First Response | Escalation |
|----------|----------|-------|----------------|-----------|
| API health endpoint down | SEV-1 | DevOps | Restart service, check server | Tech Lead |
| Database connection failure | SEV-1 | DBA / DevOps | Check DB server, connection string | Tech Lead |
| Out of memory / process crash | SEV-1 | DevOps | Restart, check memory config | Tech Lead |
| SSL certificate expired | SEV-1 | DevOps | Renew cert, restart proxy | — |
| Disk space exhausted | SEV-2 | DevOps | Clear logs, expand storage | — |
| High latency (>5s P95) | SEV-3 | Dev | Check slow queries, connection pool | DBA |

### Authentication

| Scenario | Severity | Owner | First Response | Escalation |
|----------|----------|-------|----------------|-----------|
| All logins failing | SEV-1 | Dev | Check JWT config, DB connectivity | Tech Lead |
| Token validation errors | SEV-2 | Dev | Check JWT secret, clock skew | — |
| Specific user can't login | SEV-4 | Support | Check user status in `users` table | Dev |
| System token rejected | SEV-2 | Dev | Check `api_clients` table, secret | — |

### Business Logic

| Scenario | Severity | Owner | First Response | Escalation |
|----------|----------|-------|----------------|-----------|
| Calculation produces wrong results | SEV-2 | Dev | Compare with Node baseline, check data | Tech Lead |
| Export generates corrupt CSV | SEV-2 | Dev | Check export logic, data integrity | — |
| Upload fails for valid CSV | SEV-3 | Dev | Check validation logic, file format | — |
| Approval workflow stuck | SEV-2 | Dev | Check status transitions, DB state | — |
| Payout marks paid incorrectly | SEV-2 | Dev | Check status update logic | Tech Lead |
| Dashboard shows stale data | SEV-3 | Dev | Check query, caching, DB | — |

### Integration

| Scenario | Severity | Owner | First Response | Escalation |
|----------|----------|-------|----------------|-----------|
| SFTP polling fails | SEV-3 | Dev | Use manual upload fallback | — |
| Hierarchy sync fails | SEV-3 | Dev | Manual trigger, check API connectivity | — |
| Penta sync fails | SEV-3 | Dev | Manual CSV upload fallback | — |
| Cron jobs not running | SEV-3 | DevOps | Check cron schedule, scripts | Dev |

### Frontend

| Scenario | Severity | Owner | First Response | Escalation |
|----------|----------|-------|----------------|-----------|
| Frontend can't reach API | SEV-1 | DevOps | Check CORS, network, API health | Dev |
| CORS errors in browser | SEV-2 | Dev | Check `Cors:AllowedOrigins` config | — |
| API returns unexpected format | SEV-2 | Dev | Check response contract, JSON serialization | — |
| Specific screen broken | SEV-3 | Dev | Check API endpoint, data | — |

---

## Key Logs to Monitor

| Log Source | What to Watch | Alert Threshold |
|-----------|--------------|----------------|
| Application stdout/stderr | Unhandled exceptions (`GEN_001`) | Any occurrence |
| Application structured logs | `LogWarning` from ExceptionHandlerMiddleware | > 10/minute |
| Application structured logs | Auth failures (`AUTH_*` codes) | > 20/minute |
| Application structured logs | Rate limit rejections (429s) | > 50/minute |
| Reverse proxy access logs | 5xx response codes | > 1% of requests |
| Reverse proxy access logs | Response time P95 | > 5 seconds |
| Database logs | Connection failures | Any occurrence |
| Database logs | Slow queries (>2s) | > 5/minute |

---

## Escalation Path

```
Level 1: On-Call Engineer
    ↓ (15 min unresolved for SEV-1, 1 hour for SEV-2)
Level 2: Tech Lead
    ↓ (30 min unresolved for SEV-1)
Level 3: Engineering Manager + Product Owner
    ↓ (if rollback decision needed)
Level 4: VP Engineering (rollback approval)
```

---

## Communication Templates

### SEV-1 Initial Alert
```
🔴 SEV-1 INCIDENT — Incentive API
Time: [TIMESTAMP]
Impact: [DESCRIPTION]
Status: Investigating
On-call: [NAME]
Next update: 15 minutes
```

### Status Update
```
🟡 UPDATE — Incentive API Incident
Time: [TIMESTAMP]
Status: [Investigating / Mitigating / Resolved]
Root cause: [DESCRIPTION or "Under investigation"]
ETA: [ESTIMATE]
Next update: [TIME]
```

### Resolution
```
🟢 RESOLVED — Incentive API Incident
Time: [TIMESTAMP]
Duration: [DURATION]
Root cause: [DESCRIPTION]
Resolution: [WHAT WAS DONE]
Follow-up: [POST-INCIDENT REVIEW DATE]
```

---

## Post-Incident Review

For SEV-1 and SEV-2 incidents, conduct a post-incident review within 48 hours:

1. **Timeline**: Reconstruct the incident timeline
2. **Root Cause**: Identify the root cause
3. **Impact**: Quantify the business impact
4. **Response**: Evaluate the response effectiveness
5. **Prevention**: Identify preventive measures
6. **Action Items**: Assign follow-up tasks with owners and deadlines
