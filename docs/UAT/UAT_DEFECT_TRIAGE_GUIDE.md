# UAT Defect Triage Guide — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## 1. Purpose

This guide helps UAT testers and the triage team classify, prioritize, and route defects consistently. Use it when logging defects in the Defect Log Template and during the daily triage meeting.

---

## 2. Severity vs Priority Matrix

**Severity** = how bad is the defect (technical impact).
**Priority** = how urgently must it be fixed (business impact).

| | **Priority: P1 — Urgent** | **Priority: P2 — High** | **Priority: P3 — Medium** | **Priority: P4 — Low** |
|---|---|---|---|---|
| **Severity: Critical** | Fix immediately. Blocks UAT. | Fix today. Blocks key flow. | Rare — critical defect in low-use area. | N/A |
| **Severity: High** | Fix today. Core feature broken. | Fix within 1 day. Major feature affected. | Fix before go-live. Workaround available. | Unlikely combination. |
| **Severity: Medium** | Fix before go-live. High-visibility area. | Fix before go-live if possible. | Fix or defer with business acceptance. | Defer to Phase 2. |
| **Severity: Low** | N/A | Fix if time permits. | Defer to Phase 2. | Defer to Phase 2. |

### Decision Rule

- **Critical + P1** → Stop testing that module. Escalate to dev team immediately.
- **High + P2** → Continue testing other modules. Fix needed by next day.
- **Medium + P3** → Log and continue. Review at daily triage.
- **Low + P4** → Log and defer. No impact on go-live.

---

## 3. Severity Definitions with Examples

### Critical — System unusable, data corruption, security breach

| Area | Example |
|------|---------|
| Calculation | Total pool shows ₹0 instead of ₹1,43,460 |
| Calculation | AGT-JR-005 incentive is ₹0 instead of ₹34,800 |
| Security | Any user can access ADMIN screens without login |
| Data | Approving a record deletes it from the database |
| Payout | Paid status can be reversed to DRAFT |

### High — Major feature broken, no workaround

| Area | Example |
|------|---------|
| Approvals | Bulk approve button does nothing (no records approved) |
| Gate Check | AGT-JR-004 (gate-failed) gets approved — persistency gate bypassed |
| Export | Oracle AP export file is empty or contains wrong records |
| Adjustment | Applying manual adjustment changes the base `total_incentive` value |
| Hold | Held payout row still appears in export file |

### Medium — Feature works but with issues, workaround exists

| Area | Example |
|------|---------|
| UI | Exception log filter by severity does not work, but you can scroll to find items |
| Dashboard | Channel breakdown chart shows "undefined" label instead of "Agency" |
| Pagination | Review page shows 10 records instead of 20, but second page loads correctly |
| Notification | Mark-all-read button marks only visible page, not all notifications |
| Audit | Audit trail shows timestamp but not the actor name |

### Low — Cosmetic or minor usability

| Area | Example |
|------|---------|
| UI | Button text says "Aprove" instead of "Approve" |
| UI | Column header alignment is off in export history table |
| UI | Tooltip on dashboard card is truncated |
| UX | After approving, page does not auto-refresh (manual refresh works) |

---

## 4. Module Ownership

When a defect is logged, assign it to the module owner for triage and resolution.

| Module | Primary Owner | Backup |
|--------|-------------|--------|
| Login & Authentication | Technology Lead | — |
| Dashboard | Technology Lead | — |
| KPI Config | Technology Lead | — |
| Scheme Management | Technology Lead | Business Owner |
| Calculation Engine | Technology Lead | QA Lead |
| Approvals (single + bulk) | Technology Lead | Finance Lead |
| Review & Adjustments | Technology Lead | Operations Lead |
| Manual Adjustments | Technology Lead | Finance Lead |
| Exception Log | Technology Lead | Operations Lead |
| Notifications | Technology Lead | — |
| Org & Domain Mapping | Technology Lead | — |
| Export (Oracle AP / SAP FICO) | Technology Lead | Finance Lead |
| Payout Disbursement | Technology Lead | Finance Lead |
| System Status / Integration | Technology Lead | — |
| Access / Security | Technology Lead | — |

---

## 5. Go-Live Blocking Defects

The following types of defects **block go-live** — they must be fixed and retested before production release:

| # | Blocking Condition | Why It Blocks |
|---|-------------------|--------------|
| 1 | Any Critical severity defect open | System unusable or data at risk |
| 2 | Any High severity defect open | Major business flow broken |
| 3 | Calculation total does not match expected ₹1,43,460 | Financial accuracy required |
| 4 | Gate-failed agent (AGT-JR-004) gets approved | Compliance/control failure |
| 5 | Manual adjustment modifies base incentive values | Calculation integrity violated |
| 6 | Export file contains wrong records or amounts | Finance will pay wrong amounts |
| 7 | Paid status can be reversed | Audit trail integrity compromised |
| 8 | Any role can access screens beyond their permission | Security violation |
| 9 | Approval or adjustment actions not logged in audit trail | Audit compliance failure |

---

## 6. Deferrable to Phase 2

The following types of defects **can be deferred** to a later release with business owner acceptance:

| # | Deferrable Condition | Why It Can Wait |
|---|---------------------|----------------|
| 1 | Low severity cosmetic issues (typos, alignment) | No business impact |
| 2 | Dashboard chart labels or formatting issues | Data is correct, display is off |
| 3 | Pagination shows wrong count but data is accessible | Workaround exists (scroll or next page) |
| 4 | Notification mark-all-read only marks current page | Can mark individually |
| 5 | Filter on one column not working (but data is all visible) | Workaround: manual search |
| 6 | Tooltip or help text missing | Not critical for operation |
| 7 | Mobile layout issues | Primary use is desktop |
| 8 | Integration dashboard showing stale timestamp | Does not affect calculations or payouts |

**Important:** Every deferred defect must be:
- Logged in the Defect Log with status = DEFERRED
- Accepted in writing by the Business Owner
- Listed in the Go-Live Readiness document under "Known Issues Accepted"

---

## 7. Defect Lifecycle

```
┌──────────┐
│   NEW    │  Tester logs the defect
└────┬─────┘
     │
     ▼
┌──────────┐
│ ASSIGNED │  UAT Lead assigns to module owner during triage
└────┬─────┘
     │
     ▼
┌──────────┐
│ IN PROGRESS │  Developer working on fix
└────┬─────┘
     │
     ▼
┌──────────┐
│  FIXED   │  Fix deployed to UAT environment
└────┬─────┘
     │
     ▼
┌──────────┐
│  RETEST  │  Original tester re-executes the failing test case
└────┬─────┘
     │
     ├── Pass ──────────┐
     │                  ▼
     │            ┌──────────┐
     │            │  CLOSED  │  Defect verified fixed
     │            └──────────┘
     │
     └── Fail ──────────┐
                        ▼
                  ┌──────────┐
                  │ REOPENED │  Back to developer
                  └────┬─────┘
                       │
                       ▼
                  (returns to IN PROGRESS)
```

### Additional Statuses

| Status | When Used |
|--------|----------|
| DEFERRED | Business Owner accepts deferral to Phase 2 |
| REJECTED | Not a defect (working as designed) — requires UAT Lead approval |
| DUPLICATE | Same as an existing defect — reference the original Defect ID |

---

## 8. Defect Logging Checklist

Before submitting a defect, confirm:

- [ ] Defect ID follows format: `DEF-NNN`
- [ ] Module is correctly identified
- [ ] Related Test Case ID is referenced (e.g., UAT-EXP-01)
- [ ] Steps to reproduce are clear enough for someone else to follow
- [ ] Expected result states the concrete value (e.g., "₹34,800" not "correct amount")
- [ ] Actual result states exactly what happened
- [ ] Severity is assigned using the definitions in Section 3
- [ ] Priority is assigned using the matrix in Section 2
- [ ] Screenshot or screen recording is attached if relevant

---

## 9. Daily Triage Meeting

| Item | Detail |
|------|--------|
| **When** | End of each UAT day (30 minutes) |
| **Who** | UAT Lead, QA Support, Technology Lead, one business tester |
| **Agenda** | 1. Review new defects logged today 2. Assign/re-assign owners 3. Confirm severity and priority 4. Review fixed defects ready for retest 5. Update daily status |
| **Output** | Updated Defect Log, next-day retest plan |

---

## 10. Escalation Path

| Situation | Escalate To | How |
|-----------|------------|-----|
| Critical defect not fixed within 4 hours | Technology Lead → CTO | Phone call + email |
| UAT environment down for > 1 hour | Technology Lead | Immediate message |
| Business disagrees with severity classification | UAT Lead mediates | Triage meeting |
| No response from assigned developer within 4 hours | Technology Lead | Direct message |
| Go-live blocking defect still open on Day 5 | Business Owner + Technology Lead | Emergency meeting |

---

**Prepared by:** ___________________________  **Date:** ____________
