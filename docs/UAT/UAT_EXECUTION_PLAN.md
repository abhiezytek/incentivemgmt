# UAT Execution Plan — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26
**Program Under Test:** Agency Monthly Contest – Jan 2026
**Environment:** UAT
**Duration:** 5 business days

---

## 1. Objective

Validate that the Insurance Incentive Management System correctly calculates, reviews, approves, adjusts, and exports agent incentive payouts — end to end — using real business scenarios and seeded production-like data.

All new features (Review & Adjustments, Exception Log, Manual Adjustments, Notifications, Org Mapping, KPI Config, System Status) are additive. The base calculation engine and payout flow are structurally unchanged. This UAT confirms both new features and regression safety.

---

## 2. Scope

### In Scope

| Area | What We Test |
|------|-------------|
| Login & Access | All 4 roles (ADMIN, FINANCE, OPS, MANAGER) can log in and see only permitted screens |
| Dashboard | KPI cards, top agents, pipeline status, channel breakdown refresh correctly |
| KPI Config | Registry view, detail panel, validation — read-only for non-ADMIN |
| Scheme Management | Create draft, configure, publish, preview |
| Calculation | Run engine, verify ₹1,43,460 pool, verify top earner AGT-JR-005 = ₹34,800 |
| Persistency Gate | AGT-JR-004 blocked, remaining 19 agents eligible |
| Approvals | Single approve, bulk approve, gate-block enforcement |
| Review & Adjustments | View results, apply manual adjustment, verify base unchanged |
| Hold / Release | Hold a payout row, confirm excluded from export, release and re-include |
| Export | Oracle AP and SAP FICO file generation with correct record counts |
| Payout Disbursement | Initiate → Mark Paid flow |
| Exception Log | View, resolve, dismiss exceptions |
| Notifications | List, mark read, mark all read |
| Org & Domain Mapping | Region, channel, hierarchy views |
| Integration / System Status | Database connected, sync timestamps |
| Audit Trail | Every approval, adjustment, hold, release logged with actor and timestamp |

### Out of Scope

- Performance / load testing
- Penetration testing
- Data migration from legacy systems
- Mobile browser testing
- Calculation engine code changes (engine is unchanged — confirmed by post-change audit)

---

## 3. Entry Criteria

All of the following must be true before UAT begins:

| # | Criterion | Owner | Status |
|---|-----------|-------|--------|
| 1 | UAT environment deployed and accessible | Technology Lead | 🔲 |
| 2 | Seed data loaded (5 users, 20 agents, 1 program, 20 results) | Technology Lead | 🔲 |
| 3 | Post-change calculation audit completed and documented | Technology Lead | 🔲 |
| 4 | All 46 E2E tests passing (T01–T46) | QA Lead | 🔲 |
| 5 | All 36 regression tests passing (R01–R36) | QA Lead | 🔲 |
| 6 | UAT test scripts reviewed by business stakeholders | Business Owner | 🔲 |
| 7 | Test user credentials distributed to testers | Operations Lead | 🔲 |
| 8 | Defect log template and triage guide distributed | QA Lead | 🔲 |

---

## 4. Exit Criteria

UAT is complete when:

| # | Criterion | Target |
|---|-----------|--------|
| 1 | All test cases executed | 100% |
| 2 | Pass rate | ≥ 95% |
| 3 | Critical defects open | 0 |
| 4 | High defects open | 0 |
| 5 | Medium defects open | ≤ 3 (with business acceptance) |
| 6 | Calculation values match expected results | 100% match |
| 7 | Export file content verified | Oracle AP + SAP FICO both correct |
| 8 | All sign-off blocks completed | All 5 leads signed |
| 9 | Go-Live Readiness checklist completed | All mandatory items PASS |

---

## 5. Tester Roles and Assignments

| Role | Suggested Tester | Responsibilities |
|------|-----------------|-----------------|
| UAT Lead | Business Owner or delegate | Coordinate execution, daily status, defect triage, final sign-off |
| Business Tester 1 | Operations team member | Login as OPS user. Test calculation, review, exceptions, data uploads |
| Business Tester 2 | Finance team member | Login as FINANCE user. Test approvals, adjustments, export, payout |
| Business Tester 3 | Manager representative | Login as MANAGER user. Test view-only access, dashboard, leaderboard |
| Admin Tester | IT or senior business user | Login as ADMIN. Test scheme management, KPI config, system status, settings |
| QA Support | QA team member | Assist with defect logging, retest, regression spot-checks |

### Login Credentials (from seed data)

| Tester Role | Login Email | System Role |
|-------------|------------|-------------|
| Admin Tester | rajesh@insure.com | ADMIN |
| Admin Tester (backup) | priya@insure.com | ADMIN |
| Finance Tester | suresh@insure.com | FINANCE |
| Ops Tester | meena@insure.com | OPS |
| Manager Tester | arjun@insure.com | MANAGER |

---

## 6. Day-Wise Execution Plan

### Day 1 — Foundation & Access

| Time Block | Activity | Tester(s) | Modules |
|-----------|---------|-----------|---------|
| Morning | Environment smoke test — confirm app loads, DB connected | All | System Status |
| Morning | Login tests for all 4 roles (UAT-LOGIN-01 to 07) | All | Login |
| Morning | Role-based access verification — each tester confirms visible/hidden screens | All | Access Control |
| Afternoon | Dashboard tests (UAT-DASH-01 to 06) | All | Dashboard |
| Afternoon | Verify seeded data: 20 agents, 1 program, 20 results visible | Admin Tester | Dashboard, Review |
| End of Day | Daily status report, log any access or environment defects | UAT Lead | — |

**Day 1 Target:** 25 test cases executed. All testers confirmed access.

### Day 2 — Configuration & Calculation

| Time Block | Activity | Tester(s) | Modules |
|-----------|---------|-----------|---------|
| Morning | KPI Config tests (UAT-KPI-01 to 04) | Admin Tester | KPI Config |
| Morning | Scheme Management tests (UAT-SCHEME-01 to 07) | Admin Tester | Scheme Management |
| Morning | Org & Domain Mapping tests (UAT-ORG-01 to 04) | Ops Tester | Org Mapping |
| Afternoon | Calculation verification — run engine, verify pool = ₹1,43,460 | Admin Tester | Calculation |
| Afternoon | Verify individual agent values against Expected Results sheet | Finance Tester | Review |
| Afternoon | Verify AGT-JR-005 = ₹34,800 (top earner) | Finance Tester | Review |
| Afternoon | Verify AGT-JR-004 gate-failed and blocked | Finance Tester | Review |
| End of Day | Daily status, defect triage for any calculation mismatches | UAT Lead | — |

**Day 2 Target:** 25 test cases executed. Calculation values confirmed.

### Day 3 — Approvals, Adjustments & Exceptions

| Time Block | Activity | Tester(s) | Modules |
|-----------|---------|-----------|---------|
| Morning | Approval tests — single approve, bulk approve (UAT-APPR-01 to 05) | Finance Tester | Approvals |
| Morning | Verify gate-failed AGT-JR-004 remains blocked after bulk approve | Finance Tester | Approvals |
| Morning | Review & Adjustment tests (UAT-REV-01 to 09) | Admin Tester | Review |
| Afternoon | Manual adjustment — apply +₹500 to AGT-JR-001, verify base unchanged | Admin Tester | Adjustments |
| Afternoon | Hold/release payout row (UAT-REV-05 to 07) | Finance Tester | Adjustments |
| Afternoon | Exception log tests (UAT-EXC-01 to 06) | Ops Tester | Exception Log |
| Afternoon | Notification tests (UAT-NOTIF-01 to 04) | All | Notifications |
| End of Day | Daily status, defect triage | UAT Lead | — |

**Day 3 Target:** 30 test cases executed. Approval and adjustment flows confirmed.

### Day 4 — Export, Payout & End-to-End Flows

| Time Block | Activity | Tester(s) | Modules |
|-----------|---------|-----------|---------|
| Morning | Export tests — Oracle AP (UAT-EXP-01) and SAP FICO (UAT-EXP-02) | Finance Tester | Export |
| Morning | Verify export record count = 19 (excludes gate-failed AGT-JR-004) | Finance Tester | Export |
| Morning | Verify export uses base total_incentive (not adjusted amounts) | Finance Tester | Export |
| Afternoon | Payout disbursement tests (UAT-PAY-01 to 04) — initiate and mark paid | Finance Tester | Payout |
| Afternoon | End-to-end flows 1–5 (see UAT_TEST_SCRIPT.md E2E section) | Admin + Finance | E2E |
| Afternoon | End-to-end flows 6–10 | Admin + Ops | E2E |
| End of Day | Daily status, critical defect review | UAT Lead | — |

**Day 4 Target:** 25 test cases + 10 E2E flows executed. Export files reviewed.

### Day 5 — Retest, Regression & Sign-Off

| Time Block | Activity | Tester(s) | Modules |
|-----------|---------|-----------|---------|
| Morning | Retest all fixed defects | QA Support | Varies |
| Morning | Regression spot-checks — re-verify calculation pool, top earner, gate check | Finance Tester | Calculation |
| Morning | Security spot-checks — confirm OPS cannot export, MANAGER cannot approve | Ops + Manager Tester | Access |
| Afternoon | Complete UAT Sign-Off Checklist (all 92 items) | All | All |
| Afternoon | Final defect triage — accept, defer, or block | UAT Lead + All | — |
| Afternoon | Complete Go-Live Readiness checklist | UAT Lead | — |
| End of Day | Collect sign-off signatures from all 5 leads | UAT Lead | — |

**Day 5 Target:** All retests complete. Sign-off collected. Go/No-Go decision made.

---

## 7. Module Execution Sequence

Modules are tested in dependency order:

```
Day 1:  Login → Access Control → Dashboard → System Status
Day 2:  KPI Config → Scheme Management → Org Mapping → Calculation
Day 3:  Approvals → Review & Adjustments → Exception Log → Notifications
Day 4:  Export → Payout → End-to-End Flows
Day 5:  Retest → Regression → Sign-Off
```

**Why this order?**
- Login must work before anything else
- Dashboard confirms seeded data is present
- KPI and Scheme must be verified before calculation testing
- Calculation must be confirmed before approval testing
- Approvals must work before export testing
- Export and payout are the final business outputs

---

## 8. Dependency Handling

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| UAT environment down | Testers blocked entirely | Technology Lead on standby; backup environment URL documented |
| Seed data missing or corrupted | Calculation tests will fail | Run seed verification query before Day 1; re-seed if needed |
| Defect in login blocks all testing | Full stop | Priority P1 fix within 2 hours or postpone UAT |
| Calculation mismatch | Cannot proceed to approvals or export | Escalate immediately; compare against regression test baselines |
| Export system connectivity | Cannot test Oracle/SAP export | Generate file locally; validate content; mark integration as conditional |

---

## 9. Defect Severity Definitions

| Severity | Definition | Examples | Fix SLA |
|----------|-----------|----------|---------|
| **Critical** | System unusable. Data loss. Security breach. | Login broken for all users. Calculation produces wrong totals. Paid records can be reversed. | Fix within 4 hours |
| **High** | Major feature broken. No workaround. | Bulk approve fails. Export generates empty file. Gate-failed agent gets approved. | Fix within 1 business day |
| **Medium** | Feature works but with issues. Workaround exists. | Filter not working on exception log. Dashboard chart shows wrong label. Pagination off by one. | Fix before go-live (or defer with acceptance) |
| **Low** | Cosmetic or minor usability issue. | Button alignment off. Tooltip text has typo. Column too narrow on one screen. | Defer to Phase 2 |

---

## 10. Retest Cycle

| Step | Who | When |
|------|-----|------|
| Defect logged in Defect Log | Tester | During execution |
| Defect triaged (severity, priority, assignment) | UAT Lead | Daily triage (end of each day) |
| Fix deployed to UAT environment | Development Team | Next morning (or same day for Critical) |
| Tester notified that fix is ready | QA Support | After deployment |
| Retest executed using original test steps | Original tester | Day 5 morning (or same day for Critical) |
| Retest result recorded (Pass/Fail) | Original tester | In Defect Log |
| Defect closed if retest passes | UAT Lead | After retest |

---

## 11. Sign-Off Path

```
┌─────────────────────────────┐
│  All test cases executed     │
│  Exit criteria met           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  UAT Sign-Off Checklist      │
│  completed (92 items)        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Go-Live Readiness Checklist │
│  all mandatory items PASS    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Sign-off collected from:    │
│  • Business Owner            │
│  • Operations Lead           │
│  • Finance Lead              │
│  • QA Lead                   │
│  • Technology Lead           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  GO / NO-GO Decision         │
└─────────────────────────────┘
```

---

## 12. Reference Documents

| Document | Purpose |
|----------|---------|
| UAT_TEST_SCRIPT.md | Step-by-step test cases (101 items + 10 E2E flows) |
| UAT_EXPECTED_RESULTS.md | Concrete expected values from seeded data |
| UAT_TEST_DATA_MATRIX.md | User credentials, agent data, role-access matrix |
| UAT_DEFECT_LOG_TEMPLATE.xlsx | Log defects during execution |
| UAT_SIGNOFF_CHECKLIST.md | 92-item checklist grouped by category |
| UAT_DAILY_STATUS_TEMPLATE.md | Daily progress tracker |
| UAT_DEFECT_TRIAGE_GUIDE.md | Severity/priority rules and defect lifecycle |
| UAT_GO_LIVE_READINESS.md | Final go/no-go decision framework |
| POST_CHANGE_CALCULATION_AUDIT.md | Proof that calculation engine is unchanged |

---

**Prepared by:** ___________________________  **Date:** ____________

**Approved by:** ___________________________  **Date:** ____________
