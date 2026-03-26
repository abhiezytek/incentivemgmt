# Change Impact Analysis

**Document:** Change Impact Analysis for Additive Module Extension  
**Version:** 1.0  
**Date:** March 2026

---

## 1. Scope of Changes

This analysis covers the additive modules introduced to support review/adjustment workflows, exception monitoring, executive dashboards, notifications, org mapping, and KPI configuration helpers.

### Changes Introduced

| Category | Item | Type |
|----------|------|------|
| Migration | `006_additive_tables.sql` | 4 new tables (no ALTER/DROP) |
| Routes | `reviewAdjustments.js` | 7 new endpoints |
| Routes | `exceptionLog.js` | 3 new endpoints |
| Routes | `executiveSummary.js` | 1 new endpoint |
| Routes | `systemStatus.js` | 1 new endpoint |
| Routes | `notifications.js` | 3 new endpoints |
| Routes | `orgDomainMapping.js` | 1 new endpoint |
| Routes | `kpiConfig.js` | 3 new endpoints |
| Routes | `programs.js` (extended) | 1 new endpoint (preview) |
| Frontend | 6 page rebuilds | UI-only, API-connected |
| Tests | Regression tests | 36 test cases |
| Tests | E2E tests | 46 test cases |

---

## 2. Impact on Existing Components

### 2.1 Calculation Engine — NO IMPACT

| File | Modified | Reason |
|------|----------|--------|
| `server/src/engine/insuranceCalcEngine.js` | ❌ No | Engine reads from `ins_agent_kpi_summary`, `ins_incentive_rates`, `ins_products`, `ins_persistency_gates`, `ins_agents`, `ins_mlm_override_rates` and writes to `ins_incentive_results`. Zero references to additive tables. |
| `server/src/routes/calculate.js` | ❌ No | Calculation route unchanged. |

### 2.2 Approval Workflow — MINIMAL IMPACT

| File | Modified | Reason |
|------|----------|--------|
| `server/src/routes/incentiveResults.js` | ❌ No | Existing bulk-approve, initiate-payment, mark-paid endpoints unchanged. |
| `server/src/routes/reviewAdjustments.js` | ✅ New | Batch-approve mirrors existing approval logic with additive audit trail. Updates `ins_incentive_results.status` to APPROVED (same as existing flow). |

### 2.3 Export Pipeline — NO IMPACT

| File | Modified | Reason |
|------|----------|--------|
| `server/src/routes/integration/export.js` | ❌ No | Oracle AP and SAP FICO exports read from `ins_incentive_results` directly. No dependency on additive tables. |

### 2.4 Integration Inbound — NO IMPACT

| File | Modified | Reason |
|------|----------|--------|
| `server/src/routes/integration/penta.js` | ❌ No | Penta data ingestion unchanged. |
| `server/src/routes/integration/lifeasia.js` | ❌ No | LifeAsia SFTP webhook unchanged. |

### 2.5 Database Schema — ADDITIVE ONLY

| Change | Impact |
|--------|--------|
| 4 new tables created | No existing tables modified |
| New indexes added | On new tables only |
| No ALTER statements | Confirmed via SQL audit |
| No DROP statements | Confirmed via SQL audit |
| No triggers added | Confirmed via SQL audit |
| No stored procedures | Confirmed via SQL audit |

---

## 3. Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|------------|
| Additive table FK violates referential integrity | Low | Medium | FKs reference existing `ins_incentive_results(id)` — only valid IDs accepted |
| Batch-approve changes result status incorrectly | Low | High | Same approval logic as existing bulk-approve; regression tests validate |
| New routes affect API response times | Low | Low | New routes are independent; no shared queries with calculation |
| Executive summary exposes sensitive data | Medium | Medium | Uses `userAuth`; consider adding role-based restrictions |
| Hold/release corrupts payout pipeline | Low | High | Hold is additive record only; batch-approve skips held results |

---

## 4. Regression Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| calculationRegressionTest.js | 36 | Baseline values, top earner, approval counts, export records, additive isolation |
| fullFlowTest.js | 46 | End-to-end flow including adjustments and exports |
| calculationQueryAudit.sql | Manual | SQL-level schema and query validation |

---

## 5. Conclusion

All changes are additive. The calculation engine, approval workflow, export pipeline, and integration inbound are unaffected. Regression tests confirm baseline integrity. The additive tables and routes operate independently of the core calculation path.

---

## Related Documents

- [POST_CHANGE_CALCULATION_AUDIT.md](./POST_CHANGE_CALCULATION_AUDIT.md)
- [BACKEND_SAFE_EXTENSION_NOTES.md](./BACKEND_SAFE_EXTENSION_NOTES.md)
- [UI_REDESIGN_EXECUTION_PLAN.md](./UI_REDESIGN_EXECUTION_PLAN.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Section 16: Calculation Engine Safety
