# UAT Sign-Off Checklist — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26
**Program:** Agency Monthly Contest – Jan 2026
**Environment:** UAT

---

## Instructions

For each item, mark one of:
- ✅ **PASS** — Tested and working as expected
- ❌ **FAIL** — Defect found (log in Defect Log)
- ⏭️ **N/A** — Not applicable to this release
- 🔲 **NOT TESTED** — Not yet tested

---

## 1. Functional Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 1.1 | User login works for all 5 seeded users (ADMIN, FINANCE, OPS, MANAGER) | 🔲 | | | |
| 1.2 | Dashboard loads with correct KPI cards and chart data | 🔲 | | | |
| 1.3 | Scheme list displays all programs with correct statuses | 🔲 | | | |
| 1.4 | New scheme can be created and saved as DRAFT | 🔲 | | | |
| 1.5 | Scheme preview shows KPIs, payout rules, agent count, and results | 🔲 | | | |
| 1.6 | KPI Config registry displays all KPI definitions with program mapping | 🔲 | | | |
| 1.7 | KPI validation runs and shows PASS/FAIL results | 🔲 | | | |
| 1.8 | Review & Adjustments page lists all 20 incentive results | 🔲 | | | |
| 1.9 | Exception Log shows correct summary counts and filters work | 🔲 | | | |
| 1.10 | Org & Domain Mapping shows all 20 agents across 6 regions | 🔲 | | | |
| 1.11 | Integration Monitor / System Status shows database CONNECTED | 🔲 | | | |
| 1.12 | Notifications list loads and mark-read works | 🔲 | | | |
| 1.13 | All navigation links in sidebar work correctly | 🔲 | | | |
| 1.14 | Leaderboard shows agents ranked by total incentive (AGT-JR-005 first) | 🔲 | | | |

---

## 2. Calculation Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 2.1 | Total incentive pool = ₹1,43,460 for Jan 2026 program | 🔲 | | | |
| 2.2 | Top earner is AGT-JR-005 with ₹34,800 | 🔲 | | | |
| 2.3 | AGT-JR-004 shows total = ₹2,200 with gate failed | 🔲 | | | |
| 2.4 | Total self incentive (JR agents) = ₹1,27,550 | 🔲 | | | |
| 2.5 | Total override incentive = ₹15,910 (L1: ₹10,184 + L2: ₹5,726) | 🔲 | | | |
| 2.6 | Self + Override = Total Pool (₹1,27,550 + ₹15,910 = ₹1,43,460) | 🔲 | | | |
| 2.7 | Gate-passed count = 19, gate-failed count = 1 | 🔲 | | | |
| 2.8 | Each SA agent's L1 override matches expected value | 🔲 | | | |
| 2.9 | Each BM agent's L2 override matches expected value | 🔲 | | | |
| 2.10 | Re-running calculation produces identical results (idempotent) | 🔲 | | | |

---

## 3. Approval Workflow Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 3.1 | Single agent can be approved (DRAFT → APPROVED) | 🔲 | | | |
| 3.2 | Bulk approve works: 19 approved, 1 skipped (AGT-JR-004) | 🔲 | | | |
| 3.3 | Gate-failed agent cannot be approved (individual or bulk) | 🔲 | | | |
| 3.4 | Approved records show approver name and timestamp | 🔲 | | | |
| 3.5 | APPROVED → INITIATED transition works (via payment initiation or export) | 🔲 | | | |
| 3.6 | INITIATED → PAID transition works with payment reference | 🔲 | | | |
| 3.7 | Paid records create entry in payout disbursement log | 🔲 | | | |
| 3.8 | Status transitions are one-way only (no backward movement) | 🔲 | | | |
| 3.9 | Stage summary counts are correct at each pipeline stage | 🔲 | | | |

---

## 4. Adjustment Control Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 4.1 | Manual adjustment stores amount in separate `incentive_adjustments` table | 🔲 | | | |
| 4.2 | Base `nb_incentive` is NOT modified after adjustment | 🔲 | | | |
| 4.3 | Base `renewal_incentive` is NOT modified after adjustment | 🔲 | | | |
| 4.4 | Base `total_incentive` is NOT modified after adjustment | 🔲 | | | |
| 4.5 | Adjusted payout is displayed separately (derived, not stored in base) | 🔲 | | | |
| 4.6 | Hold action prevents agent from being batch-approved | 🔲 | | | |
| 4.7 | Release action allows agent to be approved again | 🔲 | | | |
| 4.8 | Multiple adjustments accumulate correctly | 🔲 | | | |
| 4.9 | Hold/release does not change the base result status | 🔲 | | | |

---

## 5. Export Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 5.1 | Oracle AP CSV generated with correct column headers | 🔲 | | | |
| 5.2 | SAP FICO CSV generated with correct column headers | 🔲 | | | |
| 5.3 | Export uses base `total_incentive` (NOT adjusted amount) | 🔲 | | | |
| 5.4 | Export includes only APPROVED/INITIATED records | 🔲 | | | |
| 5.5 | AGT-JR-004 (gate failed) does NOT appear in export | 🔲 | | | |
| 5.6 | After export, records move from APPROVED to INITIATED | 🔲 | | | |
| 5.7 | Export log entry created in outbound_file_log | 🔲 | | | |
| 5.8 | CSV record count matches expected (19 agents after full approval) | 🔲 | | | |
| 5.9 | CSV total amount matches expected (₹1,41,260) | 🔲 | | | |
| 5.10 | No duplicate rows in export (no additive table joins) | 🔲 | | | |

---

## 6. Security / Access Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 6.1 | Login with wrong password is rejected | 🔲 | | | |
| 6.2 | API calls without auth token return 401 | 🔲 | | | |
| 6.3 | OPS user cannot export files (403 returned) | 🔲 | | | |
| 6.4 | MANAGER user cannot approve results | 🔲 | | | |
| 6.5 | FINANCE user cannot create or edit schemes | 🔲 | | | |
| 6.6 | System token authentication works (Penta API) | 🔲 | | | |
| 6.7 | All new API endpoints require authentication | 🔲 | | | |

---

## 7. Auditability Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 7.1 | Every approval action is logged in `incentive_review_actions` | 🔲 | | | |
| 7.2 | Every adjustment is logged with actor, timestamp, and reason | 🔲 | | | |
| 7.3 | Every hold/release is logged in audit trail | 🔲 | | | |
| 7.4 | Batch approval logs an entry for each approved result | 🔲 | | | |
| 7.5 | Export history shows file name, system, record count, and amount | 🔲 | | | |
| 7.6 | Payout disbursement log records paid_at, paid_by, and reference | 🔲 | | | |
| 7.7 | Exception resolution records resolver, time, and note | 🔲 | | | |

---

## 8. UI / UX Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 8.1 | All pages load without JavaScript errors | 🔲 | | | |
| 8.2 | Tables are sortable and filterable where applicable | 🔲 | | | |
| 8.3 | Pagination works on large lists (review, exceptions, notifications) | 🔲 | | | |
| 8.4 | Status badges show correct colors (Draft=gray, Approved=blue, Paid=green) | 🔲 | | | |
| 8.5 | Sidebar navigation groups are logical and complete | 🔲 | | | |
| 8.6 | Mobile-responsive layout works (hamburger menu) | 🔲 | | | |
| 8.7 | Error messages are clear and user-friendly | 🔲 | | | |
| 8.8 | Loading spinners display during data fetch | 🔲 | | | |
| 8.9 | Success/error toast notifications appear after actions | 🔲 | | | |

---

## 9. Regression Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 9.1 | All 36 automated regression tests pass (R01–R36) | 🔲 | | | |
| 9.2 | All 46 E2E tests pass (T01–T46) | 🔲 | | | |
| 9.3 | Additive APIs do not alter base calculation values | 🔲 | | | |
| 9.4 | Exception resolution does not change any result status | 🔲 | | | |
| 9.5 | Notification mark-read does not change any business data | 🔲 | | | |
| 9.6 | Legacy routes (/admin/plans, /data/upload, etc.) still work | 🔲 | | | |
| 9.7 | Dashboard totals match before and after additive feature usage | 🔲 | | | |

---

## 10. Production Readiness Checks

| # | Check Item | Status | Tested By | Date | Comments |
|---|-----------|--------|-----------|------|----------|
| 10.1 | Database migration 006_additive_tables.sql runs without errors | 🔲 | | | |
| 10.2 | No existing table is altered or dropped by new migration | 🔲 | | | |
| 10.3 | All new routes are registered under both /api/ and /api/v1/ | 🔲 | | | |
| 10.4 | Swagger API docs at /api/docs reflect all endpoints | 🔲 | | | |
| 10.5 | Environment variables documented for new features | 🔲 | | | |
| 10.6 | No hardcoded secrets in source code | 🔲 | | | |
| 10.7 | Error codes and messages follow standard format (errorCodes.js) | 🔲 | | | |
| 10.8 | Rollback plan documented (drop 4 additive tables only) | 🔲 | | | |
| 10.9 | Performance acceptable with 20 agents (response time < 2s) | 🔲 | | | |
| 10.10 | Post-change calculation audit completed and documented | 🔲 | | | |

---

## UAT Summary

| Category | Total Items | Passed | Failed | N/A | Not Tested |
|----------|-----------|--------|--------|-----|------------|
| Functional | 14 | | | | |
| Calculation | 10 | | | | |
| Approval Workflow | 9 | | | | |
| Adjustment Controls | 9 | | | | |
| Export | 10 | | | | |
| Security / Access | 7 | | | | |
| Auditability | 7 | | | | |
| UI / UX | 9 | | | | |
| Regression | 7 | | | | |
| Production Readiness | 10 | | | | |
| **TOTAL** | **92** | | | | |

---

## Sign-Off

### Business Owner

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ APPROVED FOR PRODUCTION  ☐ CONDITIONALLY APPROVED  ☐ NOT APPROVED |
| Conditions (if any) | |
| Signature | |
| Date | |

### Operations Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ APPROVED FOR PRODUCTION  ☐ CONDITIONALLY APPROVED  ☐ NOT APPROVED |
| Conditions (if any) | |
| Signature | |
| Date | |

### Finance Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ APPROVED FOR PRODUCTION  ☐ CONDITIONALLY APPROVED  ☐ NOT APPROVED |
| Conditions (if any) | |
| Signature | |
| Date | |

### QA Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ APPROVED FOR PRODUCTION  ☐ CONDITIONALLY APPROVED  ☐ NOT APPROVED |
| Conditions (if any) | |
| Signature | |
| Date | |

### Technology Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ APPROVED FOR PRODUCTION  ☐ CONDITIONALLY APPROVED  ☐ NOT APPROVED |
| Conditions (if any) | |
| Signature | |
| Date | |

---

### Final UAT Verdict

| Field | Value |
|-------|-------|
| UAT Start Date | |
| UAT End Date | |
| Total Defects Found | |
| Critical Defects Open | |
| Go-Live Decision | ☐ GO  ☐ NO-GO  ☐ CONDITIONAL GO |
| Go-Live Date | |
| Notes | |

---

**Document prepared by:** ___________________________  **Date:** ____________

**Document reviewed by:** ___________________________  **Date:** ____________
