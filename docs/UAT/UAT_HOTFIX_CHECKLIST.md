# UAT Hotfix Checklist — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## Purpose

Every fix deployed to the UAT environment must pass this checklist. No exceptions for Critical/High severity — Low/Medium may skip items marked (Optional) with release manager approval.

Copy this checklist for each hotfix. Fill in all fields before requesting deployment.

---

## Hotfix Details

| Field | Value |
|-------|-------|
| Defect ID | DEF-___ |
| Defect Summary | |
| Severity / Priority | |
| Developer | |
| Date | |
| Branch | |
| Related Test Case | UAT-___-___ |

---

## Pre-Fix Checks

- [ ] **Defect reproduced** — I can reproduce the exact issue following the steps in the defect log
- [ ] **Root cause identified** — Documented in 1–2 sentences below:

> Root cause: _____________________________________________________________

- [ ] **Impacted files listed** — All files I will change:

| # | File Path | Change Type |
|---|-----------|-------------|
| 1 | | Add / Modify / Delete |
| 2 | | Add / Modify / Delete |
| 3 | | Add / Modify / Delete |

---

## Impact Analysis

### API Impact

- [ ] **Impacted API endpoints listed** (or "None — UI-only change"):

| # | Method | Endpoint | Change |
|---|--------|----------|--------|
| 1 | | | |
| 2 | | | |

### Database Impact

- [ ] **Impacted DB objects listed** (or "None — no DB changes"):

| # | Table / Column | Operation | New / Modified |
|---|---------------|-----------|----------------|
| 1 | | SELECT / INSERT / UPDATE | |
| 2 | | SELECT / INSERT / UPDATE | |

### Calculation Impact

- [ ] **Does this fix touch the calculation engine?**
  - [ ] NO — `insuranceCalcEngine.js` and `calculateIncentive.js` are not modified
  - [ ] YES — **STOP.** Requires QA Lead + Business Owner approval before proceeding

- [ ] **Does this fix modify `ins_incentive_results` write logic?**
  - [ ] NO — UPSERT path unchanged
  - [ ] YES — **STOP.** Full regression required. Notify QA Lead immediately.

- [ ] **Does this fix modify core DB tables (ins_agents, ins_incentive_rates, ins_products, ins_persistency_gates, ins_mlm_override_rates, ins_agent_kpi_summary)?**
  - [ ] NO — Schema unchanged
  - [ ] YES — **STOP.** Schema changes during UAT require release manager approval.

### Approval Workflow Impact

- [ ] **Does this fix change status transitions (DRAFT → APPROVED → INITIATED → PAID)?**
  - [ ] NO
  - [ ] YES — Retest full approval + export flow required

### Export Impact

- [ ] **Does this fix change Oracle AP or SAP FICO export logic?**
  - [ ] NO
  - [ ] YES — Retest export + verify record counts and amounts

### Security Impact

- [ ] **Does this fix change authentication, authorization, or role-based access?**
  - [ ] NO
  - [ ] YES — Retest all 4 roles (ADMIN, FINANCE, OPS, MANAGER) for affected screens

---

## Testing

### Automated Tests

- [ ] **E2E tests passed** (46 tests T01–T46)
  - Command: `cd server && node src/tests/e2e/fullFlowTest.js`
  - Result: ___ / 46 passed

- [ ] **Regression tests passed** (36 tests R01–R36)
  - Command: `cd server && node src/tests/regression/calculationRegressionTest.js`
  - Result: ___ / 36 passed

### Build Verification

- [ ] **Client build succeeds**
  - Command: `cd client && npx vite build`
  - Result: ☐ Success ☐ Failed (attach log)

- [ ] **Lint check** (Optional for Low severity)
  - Command: `cd client && npx eslint .`
  - Result: Only pre-existing errors (IntegrationDashboard.jsx setState-in-effect)

### Seeded Value Verification

- [ ] Total incentive pool = **₹1,43,460** ☐ Confirmed ☐ N/A (no calculation impact)
- [ ] Top earner AGT-JR-005 (Kiran Pawar) = **₹34,800** ☐ Confirmed ☐ N/A
- [ ] Gate-failed AGT-JR-004 (Pooja Sharma) = **Blocked** ☐ Confirmed ☐ N/A
- [ ] Approval eligible count = **19 of 20** ☐ Confirmed ☐ N/A

---

## Rollback Preparation

- [ ] **Rollback path prepared** — I can revert this change cleanly:

| Rollback Method | Details |
|----------------|---------|
| Git revert | `git revert <commit>` — commit hash: ____________ |
| DB rollback (if applicable) | SQL to undo: ____________ |
| Config rollback (if applicable) | Restore: ____________ |

- [ ] **Rollback tested** (Required for Critical/High; Optional for Medium/Low)

---

## Release Note

- [ ] **Release note entry added:**

```
DEF-___: [Brief description of fix]
Module: [Module name]
Impact: [None / Low / Medium / High] on calculation, approval, export
Files changed: [List]
```

---

## Approvals

| Role | Name | Approved | Date |
|------|------|----------|------|
| Developer (self) | | ☐ | |
| Peer reviewer | | ☐ | |
| QA Lead (required for Critical/High) | | ☐ | |
| Release Manager (required for all) | | ☐ | |
| Business Owner (required if calculation touched) | | ☐ | |

---

## Deployment

- [ ] **Deployed to UAT environment**
- [ ] **Smoke test passed** — Login + Dashboard loads + key values visible
- [ ] **Original tester notified** with:
  - Defect ID
  - Test case(s) to retest
  - Additional retest scope (from UAT_RISK_BASED_RETEST_MATRIX.md)
- [ ] **Defect status updated to "Fixed"** in Defect Log

---

## Post-Deployment

- [ ] **Retest result received** from tester
  - ☐ PASS → Defect closed
  - ☐ FAIL → Defect reopened → back to developer
- [ ] **No side effects reported** within 4 hours of deployment

---

**Developer Signature:** ___________________________  **Date:** ____________

**Release Manager Signature:** ___________________________  **Date:** ____________
