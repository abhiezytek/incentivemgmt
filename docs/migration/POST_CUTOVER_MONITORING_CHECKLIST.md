# Post-Cutover Monitoring Checklist

> Daily monitoring checklist for the first 7 days after switching to .NET 10 backend.
> Complete each item daily and note any issues.

---

## Day 1 — Immediate Post-Cutover

### Critical Checks
- [ ] API health check: `GET /api/health` → 200
- [ ] Frontend loads without errors
- [ ] Login works (POST /api/auth/login)
- [ ] Dashboard data displays correctly
- [ ] No 5xx errors in logs

### Functional Checks
- [ ] Programs list loads
- [ ] KPI Config registry loads
- [ ] Notifications display
- [ ] System status shows health data

### Infrastructure
- [ ] Database connections stable
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] Response times acceptable (<500ms P95)

---

## Day 2 — Business Workflow Verification

### CRUD Operations
- [ ] Create program works
- [ ] Update program works
- [ ] Status transitions work (DRAFT → ACTIVE → CLOSED)
- [ ] Delete draft program works

### Upload Processing
- [ ] CSV upload succeeds (any upload type)
- [ ] Validation errors reported correctly
- [ ] Upload counts match expected

### Authentication
- [ ] Auth token refresh working (if applicable)
- [ ] Role-based access enforced
- [ ] Unauthorized requests rejected

---

## Day 3 — Calculation & Results

### Calculation
- [ ] Bulk calculation runs successfully
- [ ] Single calculation produces correct results
- [ ] Calculation results match baseline (if available)
- [ ] Error handling works (no data scenarios)

### Results Pipeline
- [ ] Stage summary returns correct counts
- [ ] Results summary aggregates correctly
- [ ] Bulk approve works (DRAFT → APPROVED)
- [ ] Persistency gate check enforced

---

## Day 4 — Approval & Payment Flow

### Approval Workflow
- [ ] Initiate payment works (APPROVED → INITIATED)
- [ ] Mark paid works (INITIATED → PAID)
- [ ] Single approve works
- [ ] Status counts update correctly

### Review & Adjustments
- [ ] Review adjustments list loads
- [ ] Manual adjustment works
- [ ] Hold/release works
- [ ] Batch approve works
- [ ] Audit trail records correctly

---

## Day 5 — Export & Integration

### Export
- [ ] Oracle AP export generates correct CSV
- [ ] SAP FICO export generates correct CSV
- [ ] Export history records correctly
- [ ] CSV download works in browser

### Integration
- [ ] Integration status endpoint responds
- [ ] File log displays correctly
- [ ] Audit log displays correctly
- [ ] Failed records endpoint works

### Exception Log
- [ ] Exception list loads
- [ ] Exception resolution works

---

## Day 6 — Data & Edge Cases

### Data Endpoints
- [ ] Agent list loads with filters
- [ ] Product list loads
- [ ] Persistency data loads
- [ ] Policy transactions load
- [ ] Performance data loads
- [ ] Leaderboard loads

### Edge Cases
- [ ] Empty dataset handling (no 500 errors)
- [ ] Large result sets paginate correctly
- [ ] Concurrent requests handled
- [ ] Error responses return correct format

---

## Day 7 — Final Stability Assessment

### Stability Metrics
- [ ] No unresolved 5xx errors
- [ ] Error rate below 0.1%
- [ ] P95 response time below 500ms
- [ ] No data integrity issues found
- [ ] No user-reported blockers

### Decision
- [ ] **STABLE**: Proceed to disable Node.js (Phase 5 of cutover)
- [ ] **UNSTABLE**: Extend monitoring or rollback

---

## Daily Metrics Template

| Metric | Target | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
|--------|--------|-------|-------|-------|-------|-------|-------|-------|
| Health check | 200 | | | | | | | |
| 5xx error count | 0 | | | | | | | |
| Auth failures | < 5 | | | | | | | |
| P95 latency (ms) | < 500 | | | | | | | |
| DB connections | Stable | | | | | | | |
| User reports | 0 | | | | | | | |

---

## Escalation

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | API down, data loss, auth broken | Immediate rollback to Node.js |
| **High** | Workflow broken, export wrong | Investigate + fix within 4 hours |
| **Medium** | Slow responses, cosmetic errors | Fix within 24 hours |
| **Low** | Minor differences from Node | Document and fix post-stabilization |
