# Hypercare Runbook

> Post-go-live hypercare procedures for the first 7 days after .NET 10 cutover.
> Last updated: March 2026

---

## Hypercare Period: Day 1 through Day 7

### Support Model

| Day | Coverage | Escalation |
|-----|----------|-----------|
| Day 1 | 24/7 on-call | Immediate escalation to tech lead |
| Day 2-3 | Extended hours (8am-10pm) | 30-minute response SLA |
| Day 4-7 | Business hours + on-call | 1-hour response SLA |

---

## Daily Health Checks

### Morning Check (9:00 AM)

| Check | Command/URL | Expected |
|-------|-------------|----------|
| API health | `GET /api/health` | `{ "status": "ok" }` (200) |
| Auth works | `POST /api/auth/login` | Returns JWT (200) |
| Dashboard loads | `GET /api/v1/dashboard/executive-summary` | Data returned (200/401) |
| Error rate | Check logs/monitoring | < 0.1% |
| DB connections | Check pool stats | Stable, no exhaustion |
| Memory usage | Check process metrics | < 80% of allocated |
| Disk space | Check server | > 20% free |

### Afternoon Check (3:00 PM)

| Check | Command/URL | Expected |
|-------|-------------|----------|
| Repeat morning checks | — | Same expectations |
| Calculation endpoint | Test run if applicable | Completes without error |
| Export endpoint | Test if applicable | Generates valid CSV |
| Upload endpoint | Test with small file | Processes without error |

---

## Known Issues & Workarounds

### 1. SFTP Not Automated
- **Impact**: Life Asia files must be uploaded manually
- **Workaround**: Use `/api/v1/upload/*` endpoints
- **Resolution ETA**: Week 2-3 post-go-live

### 2. Background Jobs Via External Cron
- **Impact**: Jobs don't auto-schedule inside the app
- **Workaround**: External cron triggers API endpoints (see JOB_TRIGGER_RUNBOOK.md)
- **Resolution ETA**: When Quartz.NET is implemented

### 3. Rate Limiting Policies Need Controller Annotations
- **Impact**: Rate limits defined but not yet applied to specific controllers
- **Workaround**: Global rate limiting still provides protection
- **Resolution ETA**: Week 1 post-go-live

---

## Issue Response Procedures

### Severity 1: System Down
**Symptoms**: Health endpoint returns 5xx, all requests fail
**Response time**: Immediate
**Actions**:
1. Check application process is running
2. Check database connectivity
3. Check server resources (disk, memory, CPU)
4. Review application logs for startup errors
5. If unrecoverable in 15 minutes → **ROLLBACK to Node.js**

### Severity 2: Critical Feature Broken
**Symptoms**: Calculation fails, export broken, auth broken
**Response time**: 30 minutes
**Actions**:
1. Identify affected endpoint from logs
2. Check for recent config changes
3. Verify database schema/data
4. Apply hotfix if identified
5. If business-critical and unfixable in 2 hours → **ROLLBACK**

### Severity 3: Degraded Performance
**Symptoms**: Slow responses (>5s), intermittent errors
**Response time**: 1 hour
**Actions**:
1. Check database query performance
2. Check connection pool exhaustion
3. Check memory/CPU usage
4. Scale resources if needed
5. Monitor — rollback only if degradation persists > 4 hours

### Severity 4: Minor Issues
**Symptoms**: UI cosmetic issues, non-critical data discrepancies
**Response time**: Next business day
**Actions**:
1. Log issue in tracking system
2. Triage and schedule fix
3. No rollback needed

---

## Rollback Procedure

### When to Rollback
- Severity 1 issue not resolved in 15 minutes
- Severity 2 issue not resolved in 2 hours
- Data corruption detected
- Business stakeholder requests rollback

### Rollback Steps
1. **Frontend**: Set `VITE_API_URL` to Node.js backend URL
2. **Frontend**: Rebuild and redeploy
3. **Backend**: Verify Node.js backend is still running
4. **Verify**: Test all critical flows through Node.js
5. **Communicate**: Notify stakeholders of rollback
6. **Investigate**: Root cause analysis on .NET issues

### Post-Rollback
- Node.js backend and database remain unchanged (shared DB)
- No data loss expected (both backends use same PostgreSQL)
- Schedule retry deployment after fix

---

## Daily Report Template

```
HYPERCARE DAILY REPORT — Day [N]
Date: [DATE]
Status: GREEN / YELLOW / RED

Health Checks: [PASS/FAIL]
Error Rate: [X%]
Open Issues: [count]
New Issues Today: [count]
Resolved Issues: [count]

Key Events:
- [event 1]
- [event 2]

Action Items:
- [action 1] — Owner: [name] — Due: [date]
```

---

## Hypercare Exit Criteria

Exit hypercare when ALL are true:
- [ ] 7 consecutive days without Severity 1 or 2 issues
- [ ] Error rate consistently < 0.1%
- [ ] All critical business flows verified by business owner
- [ ] No rollback triggered during hypercare period
- [ ] Product owner signs off on production stability
