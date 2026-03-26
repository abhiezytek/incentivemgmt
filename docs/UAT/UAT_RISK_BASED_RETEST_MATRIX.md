# UAT Risk-Based Retest Matrix — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## Purpose

When a UAT defect is fixed, this matrix determines the minimum retest scope based on defect type. Wider scope = more safety but more time. Use the smallest scope that covers the risk.

---

## How to Use

1. Identify the defect type from column 1
2. Read the required retest scope
3. Run the mandatory tests listed
4. Get sign-off from the listed role(s)
5. Only after all mandatory tests pass, mark defect as "Closed"

---

## Retest Matrix

| Defect Type | Example | Retest Scope | Mandatory Tests | Sign-off Needed |
|-------------|---------|-------------|-----------------|-----------------|
| **Calculation — amount wrong** | AGT-JR-005 shows ₹30,000 instead of ₹34,800 | Full regression: all 20 agent values, pool total, overrides, persistency gates | R01–R36 (regression) + T01–T46 (E2E) + verify ₹1,43,460 pool + verify all 20 agent amounts | QA Lead + Business Owner |
| **Calculation — engine error** | Calculation API returns 500 | Full regression + error handling verification | R01–R36 + T01–T46 + recalculate from scratch + compare all outputs | QA Lead + Business Owner |
| **Persistency gate — wrong blocking** | AGT-JR-004 not blocked, or valid agent blocked | Persistency gate logic + approval eligibility + export record count | R01–R36 + verify 19/20 eligible + verify AGT-JR-004 blocked + export count check | QA Lead + Business Owner |
| **Approval — single approve** | DRAFT → APPROVED transition fails | Approval module + export eligibility + payout flow | T20–T30 (approval tests) + export test + payout status check | QA Lead |
| **Approval — bulk approve** | Bulk approve includes gate-failed agent | Bulk approval + gate enforcement + export | T25–T30 + verify AGT-JR-004 excluded + export record count = 19 | QA Lead |
| **Approval — status transition** | APPROVED record reverts to DRAFT | Full approval lifecycle + export + payout | T20–T46 + verify one-way transitions + export + payout | QA Lead + Business Owner |
| **Export — Oracle AP** | Export file has wrong columns or amounts | Export module + record count + payout status | T35–T40 (export tests) + verify 19 records + verify amounts match approved values | Finance Lead |
| **Export — SAP FICO** | SAP export missing records | Export module + record count + cross-check with Oracle export | T35–T40 + SAP-specific format check + record count parity with Oracle | Finance Lead |
| **Export — status change** | Export does not transition APPROVED → INITIATED | Export + payout flow | T35–T40 + payout initiation test + status verification | Finance Lead |
| **Manual adjustment** | Adjustment changes base total_incentive | Adjustment isolation + audit trail + export values | Verify base nb_incentive, renewal_incentive, total_incentive unchanged + audit entry exists + export uses base values | QA Lead |
| **Hold / Release** | Held record still appears in export | Hold/release flow + export + approval | T30–T35 (hold tests) + export record count + verify held record excluded | QA Lead |
| **Role access — wrong permission** | OPS user can export files | Auth module + all role permutations for affected screen | Test all 4 roles (ADMIN, FINANCE, OPS, MANAGER) on the affected screen + verify API returns 403 for unauthorized roles | QA Lead |
| **Role access — login failure** | Valid user cannot log in | Login flow + session management | Test all 5 user accounts + token verification + session persistence | QA Lead |
| **Dashboard — wrong data** | Total pool shows wrong number | Dashboard + data source verification | Verify dashboard KPIs match database values + compare with ₹1,43,460 baseline | QA Lead |
| **Dashboard — display error** | Chart does not render | Dashboard page only | Visual inspection + browser console check | Tester |
| **KPI Config — view error** | KPI registry doesn't load | KPI Config module only | Navigate to /kpi-config + verify table loads + check detail panel | Tester |
| **Scheme Management — create fail** | Cannot save draft scheme | Scheme management flow | Create → Save → Verify in list + check database | QA Lead |
| **Scheme Management — preview fail** | Preview shows wrong data | Preview endpoint + KPI linkage | Preview test + compare with expected values | Tester |
| **Exception Log — display** | Exceptions not loading | Exception log page only | Navigate to /exception-log + verify list loads + test resolve/dismiss | Tester |
| **Exception Log — resolve** | Resolve action doesn't persist | Exception log + audit trail | Resolve + refresh + verify database + check audit entry | QA Lead |
| **Notification — display** | Notification list empty | Notification module only | Check /notifications + verify mark-read + mark-all-read | Tester |
| **Notification — mark read** | Mark-read doesn't persist | Notification module + database | Mark read + refresh + verify database update | Tester |
| **Org Mapping — display** | Region grouping wrong | Org mapping page only | Navigate to /org-domain-mapping + verify all 4 views | Tester |
| **System Status — display** | Status page shows disconnected | System status page + DB connection | Check /system-status + verify DB connectivity | Tester |
| **Integration — sync error** | Integration status shows stale data | Integration module + system status | Check integration endpoints + verify timestamps | QA Lead |
| **Payout — initiate fail** | Cannot initiate payment | Payout flow + approval status + export | Payout initiation + verify INITIATED status + check prerequisites | Finance Lead |
| **Payout — mark paid fail** | Cannot mark as paid | Full payout lifecycle | Payout initiation → mark paid → verify PAID status + payment reference | Finance Lead |
| **Audit trail — missing entry** | Approval not logged | Audit module + incentive_review_actions table | Perform action + verify audit entry with actor, timestamp, action type | QA Lead |
| **UI — alignment/styling** | Button misaligned on review page | Affected page only | Visual inspection on the specific page | Tester |
| **UI — navigation** | Sidebar link goes to wrong page | Navigation framework | Test all sidebar links + verify correct routing | Tester |
| **UI — responsive** | Page breaks on smaller screen | Affected page only | Test at common breakpoints | Tester |

---

## Risk Level Summary

| Risk Level | Defect Types | Minimum Tests |
|------------|-------------|---------------|
| 🔴 **Critical Risk** | Calculation, persistency gate, status transition | R01–R36 + T01–T46 + all seeded values + export |
| 🟠 **High Risk** | Approval, export, payout, hold/release, adjustment | Module-specific E2E + export verification + status checks |
| 🟡 **Medium Risk** | Role access, dashboard data, scheme management, audit trail | Affected module + related cross-checks |
| 🟢 **Low Risk** | UI display, notification, exception log display, org mapping, system status | Affected page only |

---

## Seeded Value Verification Quick-Check

For any Critical or High risk fix, always verify:

| # | Checkpoint | Expected Value | Query / Check |
|---|-----------|---------------|---------------|
| 1 | Total incentive pool | ₹1,43,460 | Dashboard total or SUM(total_incentive) from ins_incentive_results |
| 2 | Top earner | AGT-JR-005 (Kiran Pawar) = ₹34,800 | Leaderboard rank 1 or query by agent_code |
| 3 | Gate-failed agent | AGT-JR-004 (Pooja Sharma) = Blocked | Review page gate status or query persistency_met = false |
| 4 | Approval eligible | 19 of 20 | Count of gate-passed agents |
| 5 | Export record count | 19 (after full approval) | Export file row count |
| 6 | Self + Override = Total | ₹1,27,550 + ₹15,910 = ₹1,43,460 | Sum verification |

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Critical Risk fix fails regression | **STOP** deployment. Escalate to QA Lead + Technology Lead immediately. |
| High Risk fix fails export verification | **HOLD** deployment. Re-verify fix. Notify Finance Lead. |
| Medium Risk fix introduces new failures | **HOLD** deployment. Investigate side effects before redeploying. |
| Low Risk fix fails visual check | **Redeploy** with correction. No escalation needed. |

---

**Prepared by:** ___________________________  **Date:** ____________
