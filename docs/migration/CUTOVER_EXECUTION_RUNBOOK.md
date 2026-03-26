# Cutover Execution Runbook

> Step-by-step procedure for switching from Node.js to .NET 10 as the active business backend.
> This runbook is reversible at every phase.

---

## Pre-Cutover Checklist

- [ ] .NET build: `cd backend-dotnet && dotnet build` → 0 errors
- [ ] .NET tests: `cd backend-dotnet && dotnet test` → 163 tests pass
- [ ] Database connectivity verified from .NET
- [ ] `Jwt:Secret` and `Jwt:SystemSecret` set in appsettings (not defaults)
- [ ] Health check verified: `GET /api/health` → `{ "status": "ok" }`
- [ ] Node.js backend still running as fallback
- [ ] Rollback plan understood by team

---

## Phase 1: Deploy .NET API Alongside Node (Day 0)

### Actions
1. Deploy .NET 10 API to target environment
   ```bash
   cd backend-dotnet
   dotnet publish -c Release -o publish/
   ```
2. Configure .NET API to run on port 5001 (or designated port)
3. Configure database connection string
4. Configure JWT secrets
5. Start .NET API
6. Verify health check: `GET http://<dotnet-host>:5001/api/health`
7. Keep Node.js running on port 5000

### Verification
- [ ] .NET API responds to health check
- [ ] .NET API can query database
- [ ] Swagger UI accessible at `/api/docs`
- [ ] Node.js still running as fallback

### Rollback
- No action needed — Node.js is still primary

---

## Phase 2: Switch Frontend to .NET API (Day 0-1)

### Actions
1. Set `VITE_API_URL` to .NET API URL
   ```
   VITE_API_URL=http://<dotnet-host>:5001/api
   ```
2. Rebuild frontend:
   ```bash
   cd client && npm run build
   ```
3. Deploy updated frontend
4. Verify all screens load correctly

### Verification
- [ ] Dashboard loads
- [ ] Programs list loads
- [ ] KPI Config screens work
- [ ] Notifications display
- [ ] No console errors in browser

### Rollback
1. Set `VITE_API_URL` back to Node URL
2. Rebuild and redeploy frontend

---

## Phase 3: Verify All Business Functions (Day 1-3)

### Actions
1. Test each major workflow:
   - Create/edit program
   - Configure KPIs
   - Upload CSV data
   - Run calculation
   - Review adjustments
   - Approve results
   - Generate export
   - Mark paid
2. Compare results with Node.js baseline if available
3. Monitor error rates

### Verification
- [ ] Program CRUD works
- [ ] KPI config works
- [ ] CSV uploads process correctly
- [ ] Calculation produces expected results
- [ ] Review/adjust/hold/release works
- [ ] Bulk approve works
- [ ] Export generates correct CSV
- [ ] Mark paid completes
- [ ] Exception log works
- [ ] Integration endpoints respond

### Rollback
1. Set `VITE_API_URL` back to Node URL
2. Rebuild and redeploy frontend

---

## Phase 4: Monitor and Stabilize (Day 3-10)

### Actions
1. Monitor daily per POST_CUTOVER_MONITORING_CHECKLIST.md
2. Check error rates
3. Check response times
4. Verify data integrity
5. Collect user feedback

### Success Criteria
- Error rate below 0.1%
- No data integrity issues
- All business workflows functioning
- No user-reported blockers

### Rollback
- Still available via env var switch until Phase 5

---

## Phase 5: Disable Node Business Routes (Day 10+)

### Actions
1. Confirm 7+ days of stable .NET operation
2. Stop Node.js process (or disable business routes)
3. Keep Node.js code for 30 more days
4. Follow NODE_ARCHIVE_OR_DELETE_PLAN.md

### Verification
- [ ] Frontend still works with Node.js stopped
- [ ] No traffic reaching Node.js
- [ ] .NET handles all requests

### Rollback
- Restart Node.js if needed
- Switch `VITE_API_URL` back

---

## Emergency Rollback Procedure

If a critical issue is found at any phase:

1. **Immediate**: Set `VITE_API_URL` back to Node.js URL
2. **Rebuild**: `cd client && npm run build`
3. **Redeploy**: Deploy the rebuilt frontend
4. **Verify**: Confirm frontend works with Node.js
5. **Investigate**: Root cause the .NET issue
6. **Retry**: Fix and attempt cutover again

**Rollback time: ~5 minutes** (rebuild + redeploy)

---

## Communication Template

```
Subject: [CUTOVER] Switching business API to .NET 10

Team,

We are executing the planned cutover from Node.js to .NET 10.

Phase: [1/2/3/4/5]
Status: [In Progress / Complete / Rolled Back]
Impact: [None expected — same database, same API contracts]
Rollback: [Available — env var switch + frontend rebuild]

Action required: [None / Test your workflows / Report issues to #channel]
```
