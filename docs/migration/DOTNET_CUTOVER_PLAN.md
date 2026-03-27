# .NET Cutover Plan

## Prerequisites
- [ ] All 4 waves implemented and building
- [ ] Integration tests passing
- [ ] Regression tests passing
- [ ] Side-by-side parity verification completed (see NODE_DOTNET_PARITY_RUNBOOK.md)
- [ ] UAT signoff obtained

## Cutover Steps

### Phase 1: Parallel Running (1-2 weeks)
1. Deploy .NET API alongside Node.js
2. Configure reverse proxy to route to .NET for Wave 1-3 endpoints
3. Keep Node.js handling Wave 4 endpoints initially
4. Monitor error rates and response times

### Phase 2: Full .NET Routing (1 week)
1. Route ALL API traffic to .NET backend
2. Keep Node.js running as hot standby
3. Monitor calculation results, export outputs, status transitions
4. Verify background job triggers working

### Phase 3: Node.js Decommission
1. Disable Node.js business routes (keep health check)
2. Monitor for 1 week
3. Decommission Node.js server
4. Archive Node.js codebase

## API Base URL Switch Strategy
- **Option A**: Reverse proxy (nginx/HAProxy) path-based routing
- **Option B**: DNS switch (simple but all-or-nothing)
- **Option C**: Feature flag in React frontend (most granular)
- **Recommended**: Option A with gradual endpoint migration

## Rollback Steps
1. Switch reverse proxy back to Node.js
2. Verify Node.js health check
3. Verify frontend connectivity
4. No database changes needed (same DB, same schema)

## Monitoring After Cutover
- API response times (P50, P95, P99)
- Error rate by endpoint
- Calculation total pool consistency
- Export file generation success rate
- Status transition counts per day
