# UAT Expected Results — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26
**Reference Program:** Agency Monthly Contest – Jan 2026
**Period:** 2026-01-01 to 2026-01-31

---

## 1. Program Details

| Field | Expected Value |
|-------|---------------|
| Program Name | Agency Monthly Contest – Jan 2026 |
| Channel | Agency |
| Plan Type | MONTHLY |
| Start Date | 2026-01-01 |
| End Date | 2026-01-31 |
| Status | ACTIVE |
| Total Agents | 20 |

---

## 2. Incentive Result Summary (Seeded Baseline)

| Metric | Expected Value |
|--------|---------------|
| Total incentive results | 20 records |
| Total incentive pool | ₹1,43,460 |
| Total self incentive (net_self_incentive) | ₹1,27,550 |
| Total override incentive | ₹15,910 |
| Records in DRAFT status (before any approval) | 20 |
| Records with persistency gate passed | 19 |
| Records with persistency gate failed | 1 |
| Records eligible for approval | 19 |
| Records NOT eligible (gate failed) | 1 (AGT-JR-004) |

---

## 3. Individual Agent Expected Values

### Junior Agents (Level 3)

| Agent Code | Agent Name | NB Incentive | Renewal | Net Self | Override | Total Incentive | Gate Passed |
|-----------|-----------|-------------|---------|----------|----------|-----------------|-------------|
| AGT-JR-001 | Amit Kulkarni | 11,050 | 600 | 11,650 | 0 | **11,650** | ✅ Yes |
| AGT-JR-002 | Sunita Rao | 5,650 | 750 | 6,400 | 0 | **6,400** | ✅ Yes |
| AGT-JR-003 | Deepak Nair | 14,250 | 900 | 15,150 | 0 | **15,150** | ✅ Yes |
| AGT-JR-004 | Pooja Sharma | 2,200 | 0 | 2,200 | 0 | **2,200** | ❌ **No** |
| AGT-JR-005 | Kiran Pawar | 33,000 | 1,800 | 34,800 | 0 | **34,800** | ✅ Yes |
| AGT-JR-006 | Ravi Kulkarni | 1,200 | 0 | 1,200 | 0 | **1,200** | ✅ Yes |
| AGT-JR-007 | Sanjay Tiwari | 13,500 | 0 | 13,500 | 0 | **13,500** | ✅ Yes |
| AGT-JR-008 | Rekha Pandey | 9,000 | 0 | 9,000 | 0 | **9,000** | ✅ Yes |
| AGT-JR-009 | Mohit Batra | 2,400 | 0 | 2,400 | 0 | **2,400** | ✅ Yes |
| AGT-JR-010 | Divya Kapoor | 18,000 | 0 | 18,000 | 0 | **18,000** | ✅ Yes |
| AGT-JR-011 | Vinod Hegde | 2,750 | 0 | 2,750 | 0 | **2,750** | ✅ Yes |
| AGT-JR-012 | Lakshmi Iyer | 10,500 | 0 | 10,500 | 0 | **10,500** | ✅ Yes |

### Senior Agents (Level 2) — Override Income Only

| Agent Code | Agent Name | L1 Override | Total Incentive | Gate Passed |
|-----------|-----------|------------|-----------------|-------------|
| AGT-SA-001 | Priya Patil | 1,424 | **1,424** | ✅ Yes |
| AGT-SA-002 | Sunil Joshi | 1,388 | **1,388** | ✅ Yes |
| AGT-SA-003 | Anita Desai | 2,880 | **2,880** | ✅ Yes |
| AGT-SA-004 | Vijay Singh | 1,800 | **1,800** | ✅ Yes |
| AGT-SA-005 | Neha Gupta | 1,632 | **1,632** | ✅ Yes |
| AGT-SA-006 | Rohit Verma | 1,060 | **1,060** | ✅ Yes |

### Branch Managers (Level 1) — Override Income Only

| Agent Code | Agent Name | L2 Override | Total Incentive | Gate Passed |
|-----------|-----------|------------|-----------------|-------------|
| AGT-BM-001 | Ramesh Sharma | 3,480 | **3,480** | ✅ Yes |
| AGT-BM-002 | Kavita Mehta | 2,246 | **2,246** | ✅ Yes |

---

## 4. Top Earner Verification

| Rank | Agent Code | Agent Name | Total Incentive |
|------|-----------|-----------|-----------------|
| 1 | **AGT-JR-005** | **Kiran Pawar** | **₹34,800** |
| 2 | AGT-JR-010 | Divya Kapoor | ₹18,000 |
| 3 | AGT-JR-003 | Deepak Nair | ₹15,150 |
| 4 | AGT-JR-007 | Sanjay Tiwari | ₹13,500 |
| 5 | AGT-JR-001 | Amit Kulkarni | ₹11,650 |

**Key assertion:** AGT-JR-005 must always be the top earner at ₹34,800.

---

## 5. Gate-Failed Agent Details

| Field | Expected Value |
|-------|---------------|
| Agent Code | AGT-JR-004 |
| Agent Name | Pooja Sharma |
| Total Incentive | ₹2,200 |
| Persistency Gate Passed | **FALSE** |
| Can be approved? | **NO** |
| Appears in export? | **NO** |
| Reason | Persistency threshold not met |

**What to verify:**
- AGT-JR-004 remains in DRAFT after bulk approval
- AGT-JR-004 does NOT appear in Oracle/SAP export CSV
- AGT-JR-004 cannot be individually approved
- AGT-JR-004's incentive amount (₹2,200) is included in DRAFT total but NOT in APPROVED total

---

## 6. Expected Approval Flow Outcomes

### Before Any Approval

| Status | Count | Total Amount |
|--------|-------|-------------|
| DRAFT | 20 | ₹1,43,460 |
| APPROVED | 0 | ₹0 |
| INITIATED | 0 | ₹0 |
| PAID | 0 | ₹0 |

### After Bulk Approval (All Eligible)

| Status | Count | Total Amount |
|--------|-------|-------------|
| DRAFT | 1 | ₹2,200 (AGT-JR-004 only) |
| APPROVED | 19 | ₹1,41,260 |
| INITIATED | 0 | ₹0 |
| PAID | 0 | ₹0 |

**Approval response expected:**
```
approved: 19
skipped_gate_failed: 1
```

### After Export (Oracle or SAP)

| Status | Count | Total Amount |
|--------|-------|-------------|
| DRAFT | 1 | ₹2,200 |
| APPROVED | 0 | ₹0 (all moved to INITIATED) |
| INITIATED | 19 | ₹1,41,260 |
| PAID | 0 | ₹0 |

### After Mark Paid

| Status | Count | Total Amount |
|--------|-------|-------------|
| DRAFT | 1 | ₹2,200 |
| APPROVED | 0 | ₹0 |
| INITIATED | 0 | ₹0 |
| PAID | 19 | ₹1,41,260 |

---

## 7. Expected Export Behavior

### Oracle AP Export

| Field | Expected Value |
|-------|---------------|
| File name pattern | `ORACLE_AP_INCENTIVE_YYYYMMDD_HHMMSS.csv` |
| Record count | 19 (all APPROVED agents, excluding AGT-JR-004) |
| Total amount | ₹1,41,260 |
| Amount field used | `total_incentive` (base calculated, NOT adjusted) |
| Currency | INR |
| CSV columns | OPERATING_UNIT, SUPPLIER_NUMBER, SUPPLIER_NAME, INVOICE_NUMBER, INVOICE_DATE, INVOICE_AMOUNT, INVOICE_CURRENCY, PAYMENT_TERMS, DESCRIPTION, LINE_TYPE, LINE_AMOUNT, ACCOUNT_CODE, COST_CENTER |

### SAP FICO Export

| Field | Expected Value |
|-------|---------------|
| File name pattern | `SAP_PAYOUT_YYYYMMDD_HHMMSS.csv` |
| Record count | 19 (same as Oracle) |
| Total amount | ₹1,41,260 |
| Amount field used | `total_incentive` (base calculated) |
| Currency | INR |
| CSV columns | VENDOR_CODE, VENDOR_NAME, PAYMENT_DATE, INVOICE_AMOUNT, COST_CENTER, GL_ACCOUNT, PROFIT_CENTER, REFERENCE_DOC, PAYMENT_METHOD, CURRENCY, COMPANY_CODE, NARRATION |

### Important Export Rules

- Export uses `total_incentive` from `ins_incentive_results` — NOT adjusted amounts
- Export includes only `status IN ('APPROVED', 'INITIATED')` AND `total_incentive > 0`
- No join to `incentive_adjustments` — adjustments are display-only, not in export
- After export, APPROVED records transition to INITIATED automatically
- AGT-JR-004 (gate failed, DRAFT) is NEVER included in export

---

## 8. Expected Review Adjustment Behavior

### Adjustment Rules

| Rule | Expected Behavior |
|------|-------------------|
| Apply manual adjustment | Creates row in `incentive_adjustments` table. Base `total_incentive` in `ins_incentive_results` is **NOT modified**. |
| Hold a result | Creates HOLD entry in `incentive_adjustments`. Does NOT change result status. Held result is excluded from batch approval. |
| Release a hold | Creates RELEASE entry in `incentive_adjustments`. Result becomes eligible for approval again. |
| Batch approve with holds | Held results are excluded. Non-held DRAFT results with gate_passed=true are approved. |
| Audit trail | Every action (ADJUST, HOLD, RELEASE, APPROVE, BATCH_APPROVE) is logged in `incentive_review_actions` with actor and timestamp. |

### Adjustment Isolation Test

| Before Adjustment | After Adjustment (+₹500 on AGT-JR-001) |
|-------------------|-----------------------------------------|
| nb_incentive = 11,050 | nb_incentive = 11,050 (**unchanged**) |
| renewal_incentive = 600 | renewal_incentive = 600 (**unchanged**) |
| total_incentive = 11,650 | total_incentive = 11,650 (**unchanged**) |
| Adjustments = none | Adjustment: +500 in `incentive_adjustments` table |
| Display payout = 11,650 | Display payout = 12,150 (calculated in review UI only) |

---

## 9. Expected Exception Resolution Behavior

| Action | Expected Behavior |
|--------|-------------------|
| Resolve exception | Status changes to RESOLVED in `operational_exceptions` table only. `resolved_by`, `resolved_at`, `resolution_note` are saved. |
| Dismiss exception | Status changes to DISMISSED in `operational_exceptions`. Note saved. |
| Effect on incentive results | **NONE.** Exception resolution never modifies `ins_incentive_results`. |
| Effect on calculations | **NONE.** Exception resolution is for tracking only. |

---

## 10. Expected Notification Behavior

| Action | Expected Behavior |
|--------|-------------------|
| Mark as read | `is_read` flag set to TRUE in `notification_events`. No other data affected. |
| Mark all read | All `is_read` flags set to TRUE. No business data affected. |
| Effect on incentive results | **NONE.** Notifications are informational only. |

---

## 11. Cross-Reference Checksums

Use these values to verify system integrity at any point:

| Checksum | Formula | Expected Value |
|----------|---------|---------------|
| Total pool | SUM(total_incentive) for all 20 records | ₹1,43,460 |
| Self incentive | SUM(net_self_incentive) for all 20 records | ₹1,27,550 |
| Override total | SUM(total_override) for all 20 records | ₹15,910 |
| Pool integrity | Self + Override = Total Pool | 1,27,550 + 15,910 = 1,43,460 ✅ |
| Gate pass count | COUNT WHERE persistency_gate_passed = true | 19 |
| Gate fail count | COUNT WHERE persistency_gate_passed = false | 1 |
| Total records | Gate pass + Gate fail | 19 + 1 = 20 ✅ |
| Approved total | Pool − Gate-failed amount | 1,43,460 − 2,200 = 1,41,260 |

---

**Prepared by:** ___________________________  **Date:** ____________

**Verified by:** ___________________________  **Date:** ____________
