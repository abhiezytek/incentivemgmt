# UAT Defect Fix Workflow — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## 1. Purpose

Step-by-step workflow for developers receiving, triaging, fixing, and handing off UAT defects. Calculation integrity is the highest priority — every fix must prove it does not alter incentive amounts, approval flow, or export output.

---

## 2. Defect Intake

### 2.1 Receive the Defect

| Step | Action |
|------|--------|
| 1 | Developer receives defect from the Defect Log (UAT_DEFECT_LOG_TEMPLATE.xlsx) via the triage lead |
| 2 | Confirm defect ID, severity, priority, module, and related test case ID |
| 3 | Read the full reproduction steps and expected vs actual results |
| 4 | Acknowledge assignment within **1 hour** (Critical/High) or **4 hours** (Medium/Low) |

### 2.2 Verify Completeness

Before starting, ensure the defect record has:

- [ ] Clear steps to reproduce
- [ ] Expected result (with concrete values if calculation-related, e.g., "₹34,800 for AGT-JR-005")
- [ ] Actual result (screenshot or API response)
- [ ] Test user and role used (ADMIN / FINANCE / OPS / MANAGER)
- [ ] Browser and environment details

If any are missing, return to tester within 30 minutes with specific questions.

---

## 3. Classify the Defect

### 3.1 Impact Classification

Determine which area(s) the defect touches:

| Impact Area | How to Identify | Risk Level |
|-------------|----------------|------------|
| **Calculation** | Involves `insuranceCalcEngine.js`, `calculateIncentive.js`, or any value in `ins_incentive_results` | 🔴 Critical — full regression required |
| **Approval Workflow** | Involves status transitions (DRAFT → APPROVED → INITIATED → PAID) or `reviewAdjustments.js` | 🔴 High — approval + export retest required |
| **Export** | Involves `integration/export.js`, `outbound_file_log`, Oracle AP or SAP FICO output | 🔴 High — export + payout retest required |
| **Manual Adjustments** | Involves `incentive_adjustments` table or adjustment endpoints | 🟡 Medium — must prove base values unchanged |
| **Security / Access** | Involves `auth/`, role checks, session management | 🟡 Medium — retest all role permutations |
| **Integration** | Involves `integration/lifeasia.js`, `integration/penta.js`, `integration/status.js` | 🟡 Medium — retest integration + system status |
| **UI Only** | Frontend display, styling, layout — no API or DB changes | 🟢 Low — retest affected page only |
| **Notification / Audit** | Involves `notifications.js`, `notification_events`, `incentive_review_actions` | 🟢 Low — retest feature only |

### 3.2 Decision: Does This Need Regression?

| Condition | Regression Required? |
|-----------|---------------------|
| Any change to `server/src/engine/` files | **YES** — run all 36 regression tests (R01–R36) + all 46 E2E tests (T01–T46) |
| Any change to `ins_incentive_results` table or UPSERT logic | **YES** — full regression |
| Any change to status transition logic in `reviewAdjustments.js` | **YES** — approval + export regression |
| Any change to `integration/export.js` | **YES** — export + payout regression |
| Change to additive tables only (incentive_adjustments, incentive_review_actions, operational_exceptions, notification_events) | **NO** — these tables are isolated from calculation engine |
| UI-only change (no API/DB change) | **NO** — retest affected page only |

---

## 4. Reproduce the Defect

### 4.1 Reproduction Steps

| Step | Action |
|------|--------|
| 1 | Set up UAT environment with seeded data (program: Agency Monthly Contest – Jan 2026) |
| 2 | Log in with the same user/role as the tester |
| 3 | Follow the exact reproduction steps from the defect log |
| 4 | Capture evidence: screenshot, API response body, console errors, server logs |
| 5 | If reproduction fails, try with a fresh browser/incognito session |

### 4.2 Cannot Reproduce?

| Situation | Action |
|-----------|--------|
| Steps are ambiguous | Return to tester for clarification — do NOT close |
| Data-dependent | Check if tester's data state differs from yours (e.g., records already approved) |
| Timing-dependent | Try rapid repeated actions; check for race conditions |
| Still cannot reproduce after 2 attempts | Mark as "Cannot Reproduce" and return to tester with detailed notes |

---

## 5. Identify Impacted Modules

Use the **UAT_DEFECT_TO_MODULE_MAPPING.md** to determine:

1. Which route file(s) are involved
2. Which frontend page(s) are involved
3. Which DB table(s) are read/written
4. Which tests cover this area
5. Who the business owner is

### 5.1 Cross-Module Impact Check

Always check these cross-module dependencies:

```
Calculation Engine
  └── ins_incentive_results (written by engine)
        ├── Review & Adjustments (reads results)
        ├── Approval Workflow (updates status)
        ├── Export (reads approved results)
        ├── Payout Disbursement (reads initiated results)
        └── Dashboard (aggregates results)

Manual Adjustments
  └── incentive_adjustments (separate table)
        ├── Review & Adjustments (displays adjusted view)
        └── Audit Trail (incentive_review_actions)
        NOTE: Does NOT flow into export or calculation
```

---

## 6. Fix the Defect

### 6.1 Before Coding

- [ ] Create a branch from the current UAT release branch
- [ ] Document the root cause in the defect log
- [ ] List all files you plan to change
- [ ] If touching calculation-adjacent code, review `docs/POST_CHANGE_CALCULATION_AUDIT.md`

### 6.2 While Coding

**Absolute Rules:**

| Rule | Why |
|------|-----|
| Never modify `insuranceCalcEngine.js` without explicit approval from QA Lead + Business Owner | Calculation integrity is the highest priority |
| Never add columns to or modify existing core tables (ins_incentive_results, ins_agents, etc.) | Schema stability during UAT |
| Never change the UPSERT logic for `ins_incentive_results` | This is the single write path for calculations |
| Never modify status transition order (DRAFT → APPROVED → INITIATED → PAID) | Approval flow is tested end-to-end |
| Always use the additive table pattern for new data storage | Keep calculation engine isolated |

### 6.3 After Coding

- [ ] Self-review the diff — no unintended changes
- [ ] Run the client build: `cd client && npx vite build`
- [ ] Run the linter: `cd client && npx eslint .` (accept pre-existing errors only)
- [ ] Run E2E tests: `node src/tests/e2e/fullFlowTest.js` (46 tests)
- [ ] Run regression tests: `node src/tests/regression/calculationRegressionTest.js` (36 tests)
- [ ] Verify key seeded values are unchanged:
  - Total pool: ₹1,43,460
  - Top earner AGT-JR-005: ₹34,800
  - Gate-failed AGT-JR-004: blocked
  - Approval eligible: 19 of 20

---

## 7. Batch vs Immediate Release

| Severity | Release Strategy |
|----------|-----------------|
| Critical (P1) | Immediate hotfix — deploy to UAT within 4 hours |
| High (P2) | Same-day fix — batch with other high-priority fixes, deploy by end of day |
| Medium (P3) | Next-day batch — group with other medium fixes, deploy next morning |
| Low (P4) | Weekly batch or defer to Phase 2 |

### Batch Release Rules

- Maximum 5 fixes per batch release
- Each fix must have its own defect ID and evidence
- All fixes in the batch must pass regression together
- Release note must list all included defect IDs

---

## 8. Evidence Before Marking Fixed

Before changing defect status to "Fixed", provide:

| Evidence Item | Required For |
|---------------|-------------|
| Root cause description (1–2 sentences) | All defects |
| Files changed (list with line ranges) | All defects |
| Screenshot/response showing fix works | All defects |
| Regression test results (all pass) | Calculation, Approval, Export defects |
| E2E test results (all pass) | Any backend change |
| Seeded value verification (pool, top earner, gate) | Calculation defects |
| Build success confirmation | Any code change |

---

## 9. Handoff to QA/UAT Retest

### 9.1 Handoff Checklist

| Step | Action |
|------|--------|
| 1 | Update defect status to "Fixed" in the Defect Log |
| 2 | Add fix description and evidence to the defect record |
| 3 | Notify the original tester that the fix is deployed to UAT |
| 4 | Specify which test case(s) to retest (by ID) |
| 5 | Specify any additional retest scope (from UAT_RISK_BASED_RETEST_MATRIX.md) |
| 6 | Remain available for 2 hours after handoff for questions |

### 9.2 Retest Outcomes

| Outcome | Next Step |
|---------|-----------|
| Retest PASS | Tester marks defect "Closed" |
| Retest FAIL | Defect reopened → returns to developer with new evidence |
| Retest PASS but side-effect found | New defect logged → triage as separate item |

---

## 10. Workflow Summary

```
DEFECT LOGGED IN DEFECT LOG
          │
          ▼
    ┌──────────────┐
    │  INTAKE       │  Developer receives, acknowledges
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  CLASSIFY     │  Impact area + regression decision
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  REPRODUCE    │  Follow exact steps, capture evidence
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  IDENTIFY     │  Map to modules, check cross-impact
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  FIX          │  Code, test, verify seeded values
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  EVIDENCE     │  Root cause, files, screenshots, tests
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  HANDOFF      │  Update log, notify tester, specify retest
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  RETEST       │  Tester verifies → CLOSED or REOPENED
    └──────────────┘
```

---

## 11. Reference Documents

| Document | Use |
|----------|-----|
| UAT_DEFECT_LOG_TEMPLATE.xlsx | Log and track all defects |
| UAT_DEFECT_TRIAGE_GUIDE.md | Severity/priority classification rules |
| UAT_DEFECT_TO_MODULE_MAPPING.md | Module → files → tables → tests → owners |
| UAT_RISK_BASED_RETEST_MATRIX.md | Defect type → retest scope |
| UAT_HOTFIX_CHECKLIST.md | Pre-deploy checklist for every fix |
| POST_CHANGE_CALCULATION_AUDIT.md | Proof that calculation engine is isolated |

---

**Prepared by:** ___________________________  **Date:** ____________
