# UAT Go-Live Readiness — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26
**Program:** Agency Monthly Contest – Jan 2026
**Environment:** UAT → Production

---

## Instructions

Complete each checklist section at the end of UAT. Every **Mandatory** item must be PASS for go-live. **Recommended** items should be PASS but can proceed with documented acceptance.

Mark each item:
- ✅ **PASS**
- ❌ **FAIL** — blocks go-live
- ⚠️ **ACCEPTED** — known issue, business owner accepted
- 🔲 **NOT VERIFIED**

---

## 1. Functional Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 1.1 | All 5 seeded users can log in and see correct role-based screens | Mandatory | 🔲 | | |
| 1.2 | Dashboard loads with correct KPI cards and data | Mandatory | 🔲 | | |
| 1.3 | Scheme list shows all programs with correct statuses | Mandatory | 🔲 | | |
| 1.4 | New scheme can be created, saved as draft, and published | Mandatory | 🔲 | | |
| 1.5 | KPI Config registry displays all KPI definitions | Recommended | 🔲 | | |
| 1.6 | KPI validation runs and shows results | Recommended | 🔲 | | |
| 1.7 | Review & Adjustments page lists all incentive results | Mandatory | 🔲 | | |
| 1.8 | Exception log displays, filters, resolves, and dismisses correctly | Mandatory | 🔲 | | |
| 1.9 | Org & Domain Mapping shows all agents across regions | Recommended | 🔲 | | |
| 1.10 | Notifications list, mark-read, and mark-all-read work | Recommended | 🔲 | | |
| 1.11 | All sidebar navigation links work correctly | Mandatory | 🔲 | | |

---

## 2. Calculation Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 2.1 | Total incentive pool = ₹1,43,460 for seeded Jan 2026 program | Mandatory | 🔲 | | |
| 2.2 | Top earner AGT-JR-005 (Kiran Pawar) = ₹34,800 | Mandatory | 🔲 | | |
| 2.3 | AGT-JR-004 (Pooja Sharma) shows gate-failed with ₹2,200 | Mandatory | 🔲 | | |
| 2.4 | Self incentive total (JR agents) = ₹1,27,550 | Mandatory | 🔲 | | |
| 2.5 | Override incentive total = ₹15,910 (L1: ₹10,184 + L2: ₹5,726) | Mandatory | 🔲 | | |
| 2.6 | Self + Override = Total Pool integrity check passes | Mandatory | 🔲 | | |
| 2.7 | Re-running calculation produces identical results (idempotent) | Mandatory | 🔲 | | |
| 2.8 | Each individual agent value matches Expected Results sheet | Mandatory | 🔲 | | |
| 2.9 | Calculation engine has zero references to additive tables (audit confirmed) | Mandatory | 🔲 | | |

---

## 3. Finance / Export Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 3.1 | Oracle AP export generates CSV with correct columns | Mandatory | 🔲 | | |
| 3.2 | SAP FICO export generates CSV with correct columns | Mandatory | 🔲 | | |
| 3.3 | Export includes only APPROVED/INITIATED records | Mandatory | 🔲 | | |
| 3.4 | AGT-JR-004 (gate-failed) does NOT appear in export | Mandatory | 🔲 | | |
| 3.5 | Export record count = 19 (after full approval) | Mandatory | 🔲 | | |
| 3.6 | Export uses base total_incentive (not adjusted amount) | Mandatory | 🔲 | | |
| 3.7 | Export log entry created in outbound_file_log | Mandatory | 🔲 | | |
| 3.8 | APPROVED → INITIATED status transition works on export | Mandatory | 🔲 | | |
| 3.9 | Payout initiate and mark-paid flow works end to end | Mandatory | 🔲 | | |
| 3.10 | No duplicate rows in export file | Mandatory | 🔲 | | |

---

## 4. Approval Workflow Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 4.1 | Single approve (DRAFT → APPROVED) works | Mandatory | 🔲 | | |
| 4.2 | Bulk approve works for eligible agents | Mandatory | 🔲 | | |
| 4.3 | Gate-failed agent (AGT-JR-004) cannot be approved | Mandatory | 🔲 | | |
| 4.4 | Held payout row excluded from batch approval | Mandatory | 🔲 | | |
| 4.5 | Status transitions are one-way (no backward movement) | Mandatory | 🔲 | | |
| 4.6 | INITIATED → PAID flow completes with payment reference | Mandatory | 🔲 | | |

---

## 5. Adjustment Controls Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 5.1 | Manual adjustment stored in separate table (incentive_adjustments) | Mandatory | 🔲 | | |
| 5.2 | Base nb_incentive NOT modified after adjustment | Mandatory | 🔲 | | |
| 5.3 | Base renewal_incentive NOT modified after adjustment | Mandatory | 🔲 | | |
| 5.4 | Base total_incentive NOT modified after adjustment | Mandatory | 🔲 | | |
| 5.5 | Hold prevents record from appearing in export | Mandatory | 🔲 | | |
| 5.6 | Release removes hold and makes record eligible again | Mandatory | 🔲 | | |

---

## 6. Access / Security Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 6.1 | Login with wrong password is rejected | Mandatory | 🔲 | | |
| 6.2 | API calls without auth token return 401 | Mandatory | 🔲 | | |
| 6.3 | OPS user cannot export files (HTTP 403) | Mandatory | 🔲 | | |
| 6.4 | MANAGER user cannot approve results | Mandatory | 🔲 | | |
| 6.5 | FINANCE user cannot create or edit schemes | Mandatory | 🔲 | | |
| 6.6 | Each role sees only permitted screens | Mandatory | 🔲 | | |
| 6.7 | No hardcoded secrets in source code | Mandatory | 🔲 | | |

---

## 7. Audit / Logging Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 7.1 | Every approval action logged in incentive_review_actions | Mandatory | 🔲 | | |
| 7.2 | Every adjustment logged with actor, timestamp, reason | Mandatory | 🔲 | | |
| 7.3 | Every hold/release logged in audit trail | Mandatory | 🔲 | | |
| 7.4 | Batch approval creates audit entry for each approved record | Mandatory | 🔲 | | |
| 7.5 | Export history records file name, system, record count, amount | Mandatory | 🔲 | | |
| 7.6 | Payout log records paid_at, paid_by, payment reference | Mandatory | 🔲 | | |
| 7.7 | Exception resolution records resolver, time, note | Mandatory | 🔲 | | |

---

## 8. Integration Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 8.1 | System status page shows database CONNECTED | Mandatory | 🔲 | | |
| 8.2 | All API routes registered at /api/ and /api/v1/ | Recommended | 🔲 | | |
| 8.3 | System token authentication works for integration APIs | Recommended | 🔲 | | |
| 8.4 | Migration 006 runs without errors (additive tables created) | Mandatory | 🔲 | | |
| 8.5 | No existing tables altered or dropped by new migration | Mandatory | 🔲 | | |

---

## 9. Regression Sign-Off

| # | Check Item | Mandatory | Status | Verified By | Date |
|---|-----------|-----------|--------|-------------|------|
| 9.1 | All 46 E2E tests passing (T01–T46) | Mandatory | 🔲 | | |
| 9.2 | All 36 regression tests passing (R01–R36) | Mandatory | 🔲 | | |
| 9.3 | Legacy routes (/admin/plans, /data/upload, etc.) still work | Recommended | 🔲 | | |
| 9.4 | Dashboard totals unchanged after additive feature usage | Mandatory | 🔲 | | |

---

## 10. Known Issues Accepted for Release

List all defects that are DEFERRED to Phase 2 with business acceptance:

| Defect ID | Summary | Severity | Accepted By | Date | Phase 2 Target |
|-----------|---------|----------|-------------|------|---------------|
| | | | | | |
| | | | | | |
| | | | | | |

_If no known issues, write: "None — all defects resolved."_

---

## 11. Go / No-Go Decision Table

| # | Decision Factor | Status Required | Actual Status | GO? |
|---|----------------|----------------|---------------|-----|
| 1 | All Critical defects closed | 0 open | | ☐ |
| 2 | All High defects closed | 0 open | | ☐ |
| 3 | Medium defects within threshold | ≤ 3 open (accepted) | | ☐ |
| 4 | UAT pass rate | ≥ 95% | | ☐ |
| 5 | Calculation values 100% match | All match expected | | ☐ |
| 6 | Export files verified by Finance | Both Oracle + SAP correct | | ☐ |
| 7 | Gate-failed agent blocked | AGT-JR-004 never approved | | ☐ |
| 8 | Adjustment isolation confirmed | Base values unchanged | | ☐ |
| 9 | All mandatory checklist items PASS | 0 mandatory items FAIL | | ☐ |
| 10 | All 5 sign-off blocks completed | All signed | | ☐ |
| 11 | Regression tests green | 46 E2E + 36 regression all pass | | ☐ |
| 12 | Rollback plan documented | Plan exists and tested | | ☐ |

### Decision

| Outcome | Condition |
|---------|-----------|
| **GO** | All 12 factors above show ☑ GO |
| **CONDITIONAL GO** | 1–2 non-critical factors pending, with mitigation plan accepted by Business Owner |
| **NO-GO** | Any critical factor is not met |

---

## 12. Production Deployment Notes

| Item | Detail |
|------|--------|
| Deployment window | |
| Rollback plan | Drop 4 additive tables only (incentive_adjustments, incentive_review_actions, operational_exceptions, notification_events). Core tables untouched. |
| Post-deployment verification | Run smoke test: login, dashboard, verify pool = ₹1,43,460 (or production equivalent) |
| Monitoring | Monitor error logs for 24 hours post-deployment |
| Support contacts | Technology Lead, QA Lead on call for first 48 hours |

---

## 13. Sign-Off

### Business Owner

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO |
| Conditions (if any) | |
| Signature | |
| Date | |

### Operations Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO |
| Conditions (if any) | |
| Signature | |
| Date | |

### Finance Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO |
| Conditions (if any) | |
| Signature | |
| Date | |

### QA Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO |
| Conditions (if any) | |
| Signature | |
| Date | |

### Technology Lead

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Decision | ☐ GO  ☐ CONDITIONAL GO  ☐ NO-GO |
| Conditions (if any) | |
| Signature | |
| Date | |

---

### Final Verdict

| Field | Value |
|-------|-------|
| UAT Completion Date | |
| Total Test Cases | 101 + 10 E2E flows |
| Pass Rate | |
| Total Defects Found | |
| Critical/High Open | |
| Go-Live Decision | ☐ GO  ☐ NO-GO  ☐ CONDITIONAL GO |
| Planned Go-Live Date | |
| Notes | |

---

**Prepared by:** ___________________________  **Date:** ____________

**Approved by:** ___________________________  **Date:** ____________
