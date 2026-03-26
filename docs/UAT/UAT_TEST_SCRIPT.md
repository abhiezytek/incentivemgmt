# UAT Test Script — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26
**Program Under Test:** Agency Monthly Contest – Jan 2026
**Environment:** UAT

---

## How to Use This Document

1. Log in with the assigned test user (see Test Data Matrix).
2. Execute each test case step-by-step.
3. Record the **Actual Result** and mark **Pass/Fail**.
4. If a test fails, log a defect in the Defect Log Template.

---

## Module 1 — Login & Authentication

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-LOGIN-01 | Admin login | User `rajesh@insure.com` exists | 1. Open login page 2. Enter email `rajesh@insure.com` and password `password` 3. Click **Sign In** | User is logged in. Dashboard loads. User name and ADMIN role displayed. | | | |
| UAT-LOGIN-02 | Finance user login | User `suresh@insure.com` exists | 1. Enter email `suresh@insure.com` and password `password` 2. Click **Sign In** | User is logged in. Dashboard loads. FINANCE role shown. | | | |
| UAT-LOGIN-03 | OPS user login | User `meena@insure.com` exists | 1. Enter email `meena@insure.com` and password `password` 2. Click **Sign In** | User is logged in. Dashboard loads. OPS role shown. | | | |
| UAT-LOGIN-04 | Manager login | User `arjun@insure.com` exists | 1. Enter email `arjun@insure.com` and password `password` 2. Click **Sign In** | User is logged in with MANAGER role. | | | |
| UAT-LOGIN-05 | Wrong password | Any valid email | 1. Enter valid email 2. Enter wrong password 3. Click **Sign In** | Error message displayed: "Invalid credentials". User is NOT logged in. | | | |
| UAT-LOGIN-06 | Empty fields | None | 1. Leave email and password blank 2. Click **Sign In** | Validation error displayed. Login does not proceed. | | | |
| UAT-LOGIN-07 | Session token | User is logged in | 1. Log in successfully 2. Copy the auth token 3. Navigate to another page | All API calls include the auth token. Pages load without re-login. | | | |

---

## Module 2 — Dashboard

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-DASH-01 | Dashboard loads with KPI cards | Logged in as ADMIN | 1. Navigate to `/dashboard` | Dashboard displays KPI summary cards: Total Incentive Pool, Paid Count, Active Programs, Channel Breakdown. | | | |
| UAT-DASH-02 | Total pool value | Seeded program data exists | 1. View dashboard summary | Total incentive pool shows ₹1,43,460 (sum of all seeded results). | | | |
| UAT-DASH-03 | Top 5 agents displayed | Seeded results exist | 1. View Top Agents section on dashboard | Shows top 5 agents. First agent is **AGT-JR-005** (Kiran Pawar) with ₹34,800. | | | |
| UAT-DASH-04 | Pipeline status bar | Seeded results exist | 1. View pipeline status section | Shows count of records per status (DRAFT, APPROVED, INITIATED, PAID). All 20 records should initially be DRAFT. | | | |
| UAT-DASH-05 | Channel breakdown | Seeded results exist | 1. View Channel Breakdown | Agency channel shows all 20 agents and total amount. | | | |
| UAT-DASH-06 | Executive summary | Logged in as ADMIN | 1. View executive summary section | Shows active schemes count, total calculated amount, pending approvals count, open exceptions, and unread notifications. | | | |

---

## Module 3 — KPI Config

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-KPI-01 | View KPI registry | Logged in as ADMIN | 1. Navigate to `/kpi-config` | KPI registry table loads with all defined KPIs. Shows KPI name, frequency, type, program mapping, and statistics. | | | |
| UAT-KPI-02 | View KPI details | At least one KPI exists | 1. Click on a KPI row 2. View detail panel | Detail panel shows KPI definition, milestones, payout slabs, and qualifying rules. | | | |
| UAT-KPI-03 | Validate KPI | KPI with milestones exists | 1. Click **Validate** on a KPI | Validation results displayed: milestone gap check, program reference check, formula syntax check. PASS/FAIL shown. | | | |
| UAT-KPI-04 | KPI linked to program | Seeded program exists | 1. View registry 2. Filter or search for "New Business Premium" | KPI is linked to "Agency Monthly Contest – Jan 2026" program. Program name and status shown. | | | |

---

## Module 4 — Scheme Management

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-SCHEME-01 | View scheme list | Logged in as ADMIN | 1. Navigate to `/scheme-management` | List of all incentive programs displayed. "Agency Monthly Contest – Jan 2026" shown with ACTIVE status. | | | |
| UAT-SCHEME-02 | Create new scheme | Logged in as ADMIN | 1. Click **Create New** 2. Fill in name, channel, dates 3. Save as DRAFT | New scheme created in DRAFT status. Success message displayed. | | | |
| UAT-SCHEME-03 | Edit scheme | Scheme in DRAFT status | 1. Click on draft scheme 2. Modify description 3. Save | Changes saved. Updated description visible. | | | |
| UAT-SCHEME-04 | Program preview | Active program exists | 1. Click on "Agency Monthly Contest – Jan 2026" 2. Click **Preview** | Preview shows: KPI definitions with milestones, payout rules with slabs, qualifying rules, active agent count, result statistics by status. | | | |
| UAT-SCHEME-05 | Status transition – Activate | Scheme in DRAFT status | 1. Select DRAFT scheme 2. Click **Activate** | Scheme status changes to ACTIVE (or validation errors shown if requirements not met). | | | |
| UAT-SCHEME-06 | Status transition – Close | Scheme in ACTIVE status | 1. Select ACTIVE scheme 2. Click **Close** | Scheme status changes to CLOSED. Confirmation displayed. | | | |
| UAT-SCHEME-07 | Invalid transition | Scheme in CLOSED status | 1. Attempt to activate a CLOSED scheme | Error displayed: status transition not allowed. | | | |

---

## Module 5 — Review & Adjustments

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-REV-01 | View results for review | Logged in as ADMIN | 1. Navigate to `/review-adjustments` | Table shows all 20 incentive results with: agent code, calculated amount, adjustment total, hold status, payout total. Summary cards show total calculated, total held, total adjustments, net payout. | | | |
| UAT-REV-02 | View result detail | Results exist | 1. Click on AGT-JR-005 row | Detail drawer opens showing: NB incentive (₹33,000), renewal incentive (₹1,800), net self (₹34,800), total incentive (₹34,800), KPI data, adjustment history, audit trail. | | | |
| UAT-REV-03 | Apply manual adjustment | Result in DRAFT/APPROVED status | 1. Open AGT-JR-001 detail 2. Click **Adjust** 3. Enter amount: 500, reason: "Performance bonus" 4. Submit | Adjustment saved. `incentive_adjustments` record created. Base `nb_incentive` (₹11,050) is UNCHANGED. Adjustment shown separately. Total payout shows ₹11,650 + ₹500 = ₹12,150. | | | |
| UAT-REV-04 | Verify base incentive unchanged after adjustment | Adjustment applied to AGT-JR-001 | 1. Re-read AGT-JR-001 result from incentive results list | `nb_incentive` = 11,050, `renewal_incentive` = 600, `total_incentive` = 11,650. These base values have NOT changed. | | | |
| UAT-REV-05 | Hold a payout | Result in DRAFT status | 1. Open AGT-JR-002 detail 2. Click **Hold** 3. Enter reason: "Under investigation" | Hold recorded. Row shows 🔒 HELD status in review list. | | | |
| UAT-REV-06 | Verify held row excluded from batch approval | AGT-JR-002 is on HOLD | 1. Go to batch approve 2. Select all DRAFT records 3. Click **Approve** | AGT-JR-002 is EXCLUDED from approval. All other eligible records are approved. | | | |
| UAT-REV-07 | Release hold | AGT-JR-002 is on HOLD | 1. Open AGT-JR-002 detail 2. Click **Release** | Hold released. Row no longer shows HELD. Agent is now eligible for approval. | | | |
| UAT-REV-08 | View audit trail | Adjustments/holds have been applied | 1. Open a result with prior actions 2. Click **Audit Trail** | Complete audit trail shown: who did what, when. Shows ADJUST, HOLD, RELEASE, APPROVE actions with actor name and timestamp. | | | |
| UAT-REV-09 | Batch approve from review | Multiple DRAFT results with gate_passed = true | 1. Select multiple result IDs 2. Click **Batch Approve** | Approved count displayed. Gate-failed agents (AGT-JR-004) are skipped. Held agents are excluded. Approved records show status = APPROVED with approver name and timestamp. | | | |

---

## Module 6 — Exception Log

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-EXC-01 | View exception list | Logged in as ADMIN/OPS | 1. Navigate to `/exception-log` | Exception list loads with filters for type, status, severity, source. Summary counts displayed (open, resolved today, critical, sources affected). | | | |
| UAT-EXC-02 | Filter by status | Exceptions exist | 1. Set filter to status = OPEN | Only OPEN exceptions displayed. | | | |
| UAT-EXC-03 | View exception detail | Exception exists | 1. Click on an exception row | Detail shows: type, source system, severity, entity info, description, before/after values, resolution note (if resolved). | | | |
| UAT-EXC-04 | Resolve exception | OPEN exception exists | 1. Open an OPEN exception 2. Click **Resolve** 3. Enter resolution note: "Data corrected" 4. Submit | Status changes to RESOLVED. Resolved by, resolved at, and resolution note are saved. Exception no longer appears in OPEN filter. | | | |
| UAT-EXC-05 | Dismiss exception | OPEN exception exists | 1. Open an OPEN exception 2. Click **Dismiss** 3. Enter note: "False alarm" | Status changes to DISMISSED. Note is saved. | | | |
| UAT-EXC-06 | Exception does not affect results | Exception resolved | 1. Check incentive results after resolving exception | No incentive result status or amount has changed. Exception resolution only affects `operational_exceptions` table. | | | |

---

## Module 7 — Org & Domain Mapping

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-ORG-01 | View mapping summary | Logged in as ADMIN | 1. Navigate to `/org-domain-mapping` | Summary shows: total agents (20), active agents (20), regions count, channels count, branches count. | | | |
| UAT-ORG-02 | View region breakdown | Agent data seeded | 1. View region tab/section | Regions listed with agent count per region: Mumbai West, Mumbai East, Pune, Delhi NCR, Chandigarh, Bangalore. | | | |
| UAT-ORG-03 | View channel breakdown | Agent data seeded | 1. View channel tab/section | Agency channel shows 20 agents (all active). | | | |
| UAT-ORG-04 | View hierarchy levels | Agent data seeded | 1. View designation/hierarchy section | Shows 3 hierarchy levels: Level 1 (BM: 2 agents), Level 2 (SA: 6 agents), Level 3 (JR: 12 agents). | | | |

---

## Module 8 — Integration Monitor / System Status

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-SYS-01 | System status page loads | Logged in | 1. Navigate to `/system-status` | Status page shows: database connection (CONNECTED), last sync timestamps, integration audit log summary, file processing status. | | | |
| UAT-SYS-02 | Database connectivity | Server running | 1. View system status | Database status shows "CONNECTED". | | | |
| UAT-SYS-03 | Integration status | Logged in | 1. Navigate to `/integration` | Integration dashboard shows: LifeAsia status, Penta status, hierarchy sync status, last export info. | | | |

---

## Module 9 — Notifications

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-NOTIF-01 | View notifications | Logged in | 1. Navigate to `/notifications` | Notification list loads. Shows event type, title, message, severity, read/unread status. | | | |
| UAT-NOTIF-02 | Mark single as read | Unread notification exists | 1. Click on an unread notification 2. Click **Mark Read** | Notification marked as read. Unread count decreases by 1. | | | |
| UAT-NOTIF-03 | Mark all as read | Multiple unread exist | 1. Click **Mark All Read** | All notifications marked as read. Unread count goes to 0. | | | |
| UAT-NOTIF-04 | Notifications don't affect results | After marking all read | 1. Check incentive results | No incentive result status or amount has changed. Notifications are display-only. | | | |

---

## Module 10 — Payout Disbursement

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-PAY-01 | View payout pipeline | Logged in as ADMIN/FINANCE | 1. Navigate to `/payouts` | Payout list shows incentive results with status. Pipeline stages visible: DRAFT → APPROVED → INITIATED → PAID. | | | |
| UAT-PAY-02 | Initiate payment | APPROVED records exist | 1. Select APPROVED records 2. Click **Initiate Payment** | Selected records move to INITIATED status. Count of initiated records displayed. | | | |
| UAT-PAY-03 | Mark as paid | INITIATED records exist | 1. Select INITIATED records 2. Enter payment reference 3. Click **Mark Paid** | Records move to PAID status. `payout_disbursement_log` entry created with paid_at, paid_by, and payment reference. | | | |
| UAT-PAY-04 | Initiate with empty selection | No records selected | 1. Click **Initiate Payment** with empty selection | Validation error: "No records selected" (HTTP 400). | | | |

---

## Module 11 — Approvals

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-APPR-01 | Single approve | DRAFT result with gate passed | 1. Select AGT-JR-001 2. Click **Approve** | Status changes to APPROVED. Approved by and timestamp recorded. | | | |
| UAT-APPR-02 | Bulk approve | Multiple DRAFT results | 1. Select all eligible DRAFT results 2. Click **Bulk Approve** | All 19 gate-passed records move to APPROVED. AGT-JR-004 is NOT approved (gate failed). Response shows `approved: 19, skipped_gate_failed: 1`. | | | |
| UAT-APPR-03 | Gate-failed agent blocked | AGT-JR-004 in DRAFT | 1. Attempt to approve AGT-JR-004 | Approval rejected. Agent remains in DRAFT. Reason: persistency gate not passed. | | | |
| UAT-APPR-04 | Stage summary after approval | Approvals completed | 1. View stage summary | APPROVED count = 19, DRAFT count = 1 (AGT-JR-004). Totals match expected. | | | |
| UAT-APPR-05 | Non-existent ID approve | None | 1. Attempt to approve result ID 999999 | HTTP 404 returned. No data changed. | | | |

---

## Module 12 — Export

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-EXP-01 | Oracle AP export | APPROVED records exist for Jan 2026 | 1. Select program "Agency Monthly Contest – Jan 2026" 2. Set period 2026-01-01 3. Click **Export Oracle AP** | CSV file downloaded. File name starts with `ORACLE_AP_INCENTIVE_`. Contains one row per approved agent. Uses `total_incentive` (base calculated, NOT adjusted). | | | |
| UAT-EXP-02 | SAP FICO export | APPROVED records exist for Jan 2026 | 1. Select program 2. Set period 3. Click **Export SAP FICO** | CSV file downloaded. File name contains `SAP_PAYOUT_`. Contains one row per approved agent. Uses base `total_incentive`. | | | |
| UAT-EXP-03 | Export marks INITIATED | After Oracle or SAP export | 1. Check status of exported records | All exported records now show status = INITIATED. | | | |
| UAT-EXP-04 | Export log created | After export | 1. View export history | `outbound_file_log` entry shows file name, target system, record count, total amount, and GENERATED status. | | | |
| UAT-EXP-05 | Export with no approved records | No APPROVED records | 1. Attempt export for a period with no approvals | HTTP 404: "No approved incentive results found for the given program and period". | | | |
| UAT-EXP-06 | Export excludes gate-failed | AGT-JR-004 is DRAFT (gate failed) | 1. Verify export CSV after approval | AGT-JR-004 does NOT appear in export file (still DRAFT, not APPROVED). | | | |
| UAT-EXP-07 | OPS user cannot export | Logged in as meena@insure.com (OPS) | 1. Attempt SAP FICO export | HTTP 403: Access denied. OPS role cannot export. | | | |
| UAT-EXP-08 | Export row count matches | Export completed | 1. Compare record_count in export log with number of CSV data rows | Numbers match exactly. No duplicates from additive table joins. | | | |

---

## Module 13 — Manual Adjustments (Detailed)

| ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Pass/Fail | Comments |
|----|----------|-------------|-------|-----------------|---------------|-----------|----------|
| UAT-ADJ-01 | Adjustment does NOT change nb_incentive | AGT-JR-005 result exists | 1. Read AGT-JR-005: nb_incentive = 33,000 2. Apply adjustment of +2,000 3. Re-read AGT-JR-005 | `nb_incentive` is still 33,000. `renewal_incentive` still 1,800. `total_incentive` still 34,800. Adjustment stored separately in `incentive_adjustments`. | | | |
| UAT-ADJ-02 | Adjustment does NOT change renewal_incentive | Adjustment applied | 1. Verify AGT-JR-005 after adjustment | `renewal_incentive` = 1,800 (unchanged). | | | |
| UAT-ADJ-03 | Adjustment does NOT change total_incentive | Adjustment applied | 1. Verify base result row | `total_incentive` = 34,800 (unchanged in base row). Adjusted/final payout shown separately in review view. | | | |
| UAT-ADJ-04 | Multiple adjustments accumulate | Previous adjustment exists | 1. Apply second adjustment of -500 on same result | Two adjustments visible in history. Net adjustment = 2,000 - 500 = 1,500. Base `total_incentive` still 34,800. | | | |

---

## End-to-End Flows

### E2E Flow 1 — Create Scheme → Configure KPI → Save Draft → Publish

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-01a | Create scheme | Navigate to Scheme Management → Create New → Enter "Test Scheme Q1" with Agency channel, dates 2026-04-01 to 2026-04-30 → Save | Scheme created in DRAFT status | |
| UAT-E2E-01b | Verify in KPI Config | Navigate to KPI Config | New scheme visible (if KPIs linked) or available for KPI mapping | |
| UAT-E2E-01c | Activate scheme | Select scheme → Change status to ACTIVE | Scheme becomes ACTIVE (or shows validation errors) | |

### E2E Flow 2 — Upload Data → Run Calculation → Review Results

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-02a | Verify seeded data | View policy transactions, persistency data | At least 20 transactions and 12 persistency records visible | |
| UAT-E2E-02b | Run calculation | POST to /api/calculate/run with programId and period | Calculation completes for all active agents. 20 results created in DRAFT. | |
| UAT-E2E-02c | Review results | Navigate to Review Adjustments | All 20 results visible with correct amounts matching seed data | |

### E2E Flow 3 — Approve Eligible Agents

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-03a | Check stage summary | GET /incentive-results/stage-summary | DRAFT: 20 records | |
| UAT-E2E-03b | Bulk approve | POST /incentive-results/bulk-approve with all IDs | 19 approved, 1 skipped (AGT-JR-004 gate failed) | |
| UAT-E2E-03c | Verify post-approval | GET /incentive-results/stage-summary | APPROVED: 19, DRAFT: 1 | |

### E2E Flow 4 — Verify Gate-Failed Agent Is Blocked

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-04a | Identify gate failure | View AGT-JR-004 result | `persistency_gate_passed` = false, `total_incentive` = 2,200 | |
| UAT-E2E-04b | Attempt single approve | POST /incentive-results/{id}/approve for AGT-JR-004 | Approval blocked. Status remains DRAFT. | |
| UAT-E2E-04c | Verify after bulk | Run bulk approve | AGT-JR-004 counted in `skipped_gate_failed`. | |

### E2E Flow 5 — Apply Manual Adjustment → Verify Base Unchanged

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-05a | Record baseline | Note AGT-JR-005: nb=33,000, renewal=1,800, total=34,800 | Baseline captured | |
| UAT-E2E-05b | Apply adjustment | POST adjustment of +1,000 with reason | Adjustment saved | |
| UAT-E2E-05c | Verify base unchanged | Re-read AGT-JR-005 from results API | nb=33,000, renewal=1,800, total=34,800 — ALL UNCHANGED | |

### E2E Flow 6 — Hold/Release Payout Row

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-06a | Hold agent | POST hold on AGT-JR-002 | Hold recorded. Agent marked as held. | |
| UAT-E2E-06b | Batch approve | Run batch approve | AGT-JR-002 excluded from approval (held). Other eligible agents approved. | |
| UAT-E2E-06c | Release hold | POST release on AGT-JR-002 | Hold released. Agent now eligible for approval. | |
| UAT-E2E-06d | Approve after release | Approve AGT-JR-002 | Status changes to APPROVED. | |

### E2E Flow 7 — Export Oracle/SAP File

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-07a | Export Oracle | POST /integration/export/oracle-financials | CSV downloaded. Record count = number of APPROVED records. Total matches sum of approved total_incentive. | |
| UAT-E2E-07b | Verify status change | Check exported records | All exported records now INITIATED | |
| UAT-E2E-07c | Export SAP | POST /integration/export/sap-fico | CSV downloaded if APPROVED records remain, or 404 if all already INITIATED. | |
| UAT-E2E-07d | Export log | GET /integration/export/history | Both export records visible with correct counts and amounts. | |

### E2E Flow 8 — Mark Payout as Paid

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-08a | Mark paid | POST /incentive-results/mark-paid with INITIATED IDs and payment reference | Records move to PAID status. | |
| UAT-E2E-08b | Verify disbursement log | Check payout_disbursement_log | Entry for each paid record with paid_at, paid_by, payment_reference. | |
| UAT-E2E-08c | Dashboard update | View dashboard | PAID count reflects newly paid records. | |

### E2E Flow 9 — Resolve Exception

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-09a | View open exception | Navigate to Exception Log | OPEN exceptions listed (if any). | |
| UAT-E2E-09b | Resolve exception | Click Resolve, enter note | Exception status = RESOLVED. | |
| UAT-E2E-09c | Verify no result impact | Check incentive results | No result status or amount changed by exception resolution. | |

### E2E Flow 10 — Verify Dashboard and Notifications Refresh

| ID | Step | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| UAT-E2E-10a | Check dashboard after workflow | After completing approvals and exports | Dashboard reflects: updated pipeline counts, paid totals, channel breakdown. | |
| UAT-E2E-10b | Check notifications | Navigate to Notifications | Relevant notifications visible (calculation complete, approval done, etc.). | |
| UAT-E2E-10c | Mark all read | Click Mark All Read | All notifications marked read. No business data affected. | |

---

## Test Execution Summary

| Module | Total Cases | Passed | Failed | Blocked |
|--------|------------|--------|--------|---------|
| Login | 7 | | | |
| Dashboard | 6 | | | |
| KPI Config | 4 | | | |
| Scheme Management | 7 | | | |
| Review & Adjustments | 9 | | | |
| Exception Log | 6 | | | |
| Org & Domain Mapping | 4 | | | |
| System Status | 3 | | | |
| Notifications | 4 | | | |
| Payout Disbursement | 4 | | | |
| Approvals | 5 | | | |
| Export | 8 | | | |
| Manual Adjustments | 4 | | | |
| E2E Flows | 10 flows (30 steps) | | | |
| **TOTAL** | **101** | | | |

---

**Prepared by:** ___________________________  **Date:** ____________

**Reviewed by:** ___________________________  **Date:** ____________
