# UAT Test Data Matrix — Insurance Incentive Management System

**Version:** 1.0
**Date:** 2026-03-26

---

## 1. Test Users and Roles

### Seeded User Accounts

| User Name | Email | Password | Role |
|-----------|-------|----------|------|
| Rajesh Kumar | rajesh@insure.com | password | ADMIN |
| Priya Nair | priya@insure.com | password | ADMIN |
| Suresh Finance | suresh@insure.com | password | FINANCE |
| Meena Ops | meena@insure.com | password | OPS |
| Arjun Manager | arjun@insure.com | password | MANAGER |

---

## 2. Role-Based Access Matrix

### Screen Access by Role

| Screen / Page | ADMIN | FINANCE | OPS | MANAGER |
|---------------|-------|---------|-----|---------|
| Dashboard (`/dashboard`) | ✅ View all | ✅ View all | ✅ View all | ✅ View all |
| KPI Config (`/kpi-config`) | ✅ Full access | ✅ View only | ✅ View only | ✅ View only |
| Scheme Management (`/scheme-management`) | ✅ Create/Edit/Activate | ✅ View only | ✅ View only | ✅ View only |
| Review & Adjustments (`/review-adjustments`) | ✅ Full access | ✅ Approve/Hold | ✅ View/Hold | ✅ View only |
| Exception Log (`/exception-log`) | ✅ Full access | ✅ View only | ✅ Resolve | ✅ View only |
| Org & Domain Mapping (`/org-domain-mapping`) | ✅ Full access | ✅ View only | ✅ View only | ✅ View only |
| Integration Monitor (`/integration`) | ✅ Full access | ✅ View only | ✅ View only | ❌ No access |
| System Status (`/system-status`) | ✅ Full access | ✅ View only | ✅ View only | ❌ No access |
| Notifications (`/notifications`) | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Full access |
| Payouts (`/payouts`) | ✅ Full access | ✅ Initiate/Pay | ❌ View only | ❌ No access |
| Settings (`/settings`) | ✅ Full access | ❌ No access | ❌ No access | ❌ No access |
| Leaderboard (`/incentive/leaderboard`) | ✅ View | ✅ View | ✅ View | ✅ View |

### Action Permissions by Role

| Action | ADMIN | FINANCE | OPS | MANAGER |
|--------|-------|---------|-----|---------|
| Create/edit incentive schemes | ✅ | ❌ | ❌ | ❌ |
| Run calculations | ✅ | ❌ | ✅ | ❌ |
| Approve incentive results (single) | ✅ | ✅ | ❌ | ❌ |
| Bulk approve incentive results | ✅ | ✅ | ❌ | ❌ |
| Apply manual adjustments | ✅ | ✅ | ❌ | ❌ |
| Hold/release payout | ✅ | ✅ | ✅ | ❌ |
| Initiate payment | ✅ | ✅ | ❌ | ❌ |
| Mark as paid | ✅ | ✅ | ❌ | ❌ |
| Export Oracle AP file | ✅ | ✅ | ❌ | ❌ |
| Export SAP FICO file | ✅ | ✅ | ❌ | ❌ |
| Resolve/dismiss exceptions | ✅ | ❌ | ✅ | ❌ |
| Manage notifications | ✅ | ✅ | ✅ | ✅ |
| Upload policy data | ✅ | ❌ | ✅ | ❌ |
| Upload persistency data | ✅ | ❌ | ✅ | ❌ |
| View system status | ✅ | ✅ | ✅ | ❌ |
| View audit trails | ✅ | ✅ | ✅ | ✅ |
| Create system tokens | ✅ | ❌ | ❌ | ❌ |

### Actions NOT Allowed (Verify These Fail)

| Role | Action That Should Be Blocked | Expected Error |
|------|------------------------------|----------------|
| OPS | Export SAP/Oracle file | HTTP 403 — Access denied |
| OPS | Approve incentive results | HTTP 403 — Access denied |
| MANAGER | Approve or export anything | HTTP 403 — Access denied |
| MANAGER | Access system status | HTTP 403 or page not shown |
| FINANCE | Create or edit schemes | HTTP 403 or UI disabled |
| FINANCE | Upload data files | HTTP 403 or UI disabled |

---

## 3. Seeded Agent Data

### Agent Hierarchy

```
AGT-BM-001 (Ramesh Sharma, BM, Mumbai West)
├── AGT-SA-001 (Priya Patil, SA, Mumbai West)
│   ├── AGT-JR-001 (Amit Kulkarni, JR)
│   └── AGT-JR-002 (Sunita Rao, JR)
├── AGT-SA-002 (Sunil Joshi, SA, Mumbai East)
│   ├── AGT-JR-003 (Deepak Nair, JR)
│   └── AGT-JR-004 (Pooja Sharma, JR) ← GATE FAILED
└── AGT-SA-003 (Anita Desai, SA, Pune)
    ├── AGT-JR-005 (Kiran Pawar, JR) ← TOP EARNER
    └── AGT-JR-006 (Ravi Kulkarni, JR)

AGT-BM-002 (Kavita Mehta, BM, Delhi NCR)
├── AGT-SA-004 (Vijay Singh, SA, Delhi NCR)
│   ├── AGT-JR-007 (Sanjay Tiwari, JR)
│   └── AGT-JR-008 (Rekha Pandey, JR)
├── AGT-SA-005 (Neha Gupta, SA, Chandigarh)
│   ├── AGT-JR-009 (Mohit Batra, JR)
│   └── AGT-JR-010 (Divya Kapoor, JR)
└── AGT-SA-006 (Rohit Verma, SA, Bangalore)
    ├── AGT-JR-011 (Vinod Hegde, JR)
    └── AGT-JR-012 (Lakshmi Iyer, JR)
```

### Full Agent List

| # | Agent Code | Agent Name | Level | Role | Channel | Region | Status | Parent |
|---|-----------|-----------|-------|------|---------|--------|--------|--------|
| 1 | AGT-BM-001 | Ramesh Sharma | 1 | Branch Manager | Agency | Mumbai West | ACTIVE | — |
| 2 | AGT-BM-002 | Kavita Mehta | 1 | Branch Manager | Agency | Delhi NCR | ACTIVE | — |
| 3 | AGT-SA-001 | Priya Patil | 2 | Senior Agent | Agency | Mumbai West | ACTIVE | AGT-BM-001 |
| 4 | AGT-SA-002 | Sunil Joshi | 2 | Senior Agent | Agency | Mumbai East | ACTIVE | AGT-BM-001 |
| 5 | AGT-SA-003 | Anita Desai | 2 | Senior Agent | Agency | Pune | ACTIVE | AGT-BM-001 |
| 6 | AGT-SA-004 | Vijay Singh | 2 | Senior Agent | Agency | Delhi NCR | ACTIVE | AGT-BM-002 |
| 7 | AGT-SA-005 | Neha Gupta | 2 | Senior Agent | Agency | Chandigarh | ACTIVE | AGT-BM-002 |
| 8 | AGT-SA-006 | Rohit Verma | 2 | Senior Agent | Agency | Bangalore | ACTIVE | AGT-BM-002 |
| 9 | AGT-JR-001 | Amit Kulkarni | 3 | Junior Agent | Agency | Mumbai West | ACTIVE | AGT-SA-001 |
| 10 | AGT-JR-002 | Sunita Rao | 3 | Junior Agent | Agency | Mumbai West | ACTIVE | AGT-SA-001 |
| 11 | AGT-JR-003 | Deepak Nair | 3 | Junior Agent | Agency | Mumbai East | ACTIVE | AGT-SA-002 |
| 12 | AGT-JR-004 | Pooja Sharma | 3 | Junior Agent | Agency | Mumbai East | ACTIVE | AGT-SA-002 |
| 13 | AGT-JR-005 | Kiran Pawar | 3 | Junior Agent | Agency | Pune | ACTIVE | AGT-SA-003 |
| 14 | AGT-JR-006 | Ravi Kulkarni | 3 | Junior Agent | Agency | Pune | ACTIVE | AGT-SA-003 |
| 15 | AGT-JR-007 | Sanjay Tiwari | 3 | Junior Agent | Agency | Delhi NCR | ACTIVE | AGT-SA-004 |
| 16 | AGT-JR-008 | Rekha Pandey | 3 | Junior Agent | Agency | Delhi NCR | ACTIVE | AGT-SA-004 |
| 17 | AGT-JR-009 | Mohit Batra | 3 | Junior Agent | Agency | Chandigarh | ACTIVE | AGT-SA-005 |
| 18 | AGT-JR-010 | Divya Kapoor | 3 | Junior Agent | Agency | Chandigarh | ACTIVE | AGT-SA-005 |
| 19 | AGT-JR-011 | Vinod Hegde | 3 | Junior Agent | Agency | Bangalore | ACTIVE | AGT-SA-006 |
| 20 | AGT-JR-012 | Lakshmi Iyer | 3 | Junior Agent | Agency | Bangalore | ACTIVE | AGT-SA-006 |

---

## 4. Key Test Scenarios by Agent

### 🏆 Top Earner — AGT-JR-005 (Kiran Pawar)

| Scenario | What to Test |
|----------|-------------|
| Highest incentive | Total incentive = ₹34,800 (highest of all 20 agents) |
| Dashboard leaderboard | Should appear first in Top Agents list |
| Leaderboard page | Should appear first when sorted DESC by total incentive |
| Approval eligible | Gate passed = YES → can be approved |
| Export included | After approval, appears in Oracle/SAP CSV |
| Adjustment test | Apply adjustment → verify base ₹34,800 unchanged |

### ❌ Gate-Failed Agent — AGT-JR-004 (Pooja Sharma)

| Scenario | What to Test |
|----------|-------------|
| Gate blocked | Persistency gate passed = FALSE |
| Cannot approve | Single approve → blocked; Bulk approve → skipped |
| Not in export | After approvals, AGT-JR-004 NOT in export file |
| Remains DRAFT | Status stays DRAFT after all approval actions |
| Amount preserved | Total incentive = ₹2,200 (calculated but blocked) |

### 👔 Manager Override Cases — AGT-SA-001 through AGT-SA-006

| Agent | Override Type | Override Amount | Earned From |
|-------|-------------|----------------|-------------|
| AGT-SA-001 | L1 Override | ₹1,424 | AGT-JR-001, AGT-JR-002 |
| AGT-SA-002 | L1 Override | ₹1,388 | AGT-JR-003, AGT-JR-004 |
| AGT-SA-003 | L1 Override | ₹2,880 | AGT-JR-005, AGT-JR-006 |
| AGT-SA-004 | L1 Override | ₹1,800 | AGT-JR-007, AGT-JR-008 |
| AGT-SA-005 | L1 Override | ₹1,632 | AGT-JR-009, AGT-JR-010 |
| AGT-SA-006 | L1 Override | ₹1,060 | AGT-JR-011, AGT-JR-012 |

**What to verify:** SA agents have zero self-incentive and earn only L1 overrides from their direct reports (JR agents).

### 🏢 Branch Manager Override Cases — AGT-BM-001, AGT-BM-002

| Agent | Override Type | Override Amount | Earned From |
|-------|-------------|----------------|-------------|
| AGT-BM-001 | L2 Override | ₹3,480 | AGT-SA-001, AGT-SA-002, AGT-SA-003 |
| AGT-BM-002 | L2 Override | ₹2,246 | AGT-SA-004, AGT-SA-005, AGT-SA-006 |

**What to verify:** BM agents have zero self-incentive and earn only L2 overrides from their SA reports.

### ✅ Approval Candidates (19 agents)

All agents **except** AGT-JR-004 are eligible for approval:

| Agents | Count | Total Amount |
|--------|-------|-------------|
| Junior agents (gate passed) | 11 | ₹1,25,350 |
| Senior agents | 6 | ₹10,184 |
| Branch managers | 2 | ₹5,726 |
| **Total approval candidates** | **19** | **₹1,41,260** |

### 📤 Export Candidates

Same as approval candidates (after approval):

| Criteria | Count |
|----------|-------|
| Status = APPROVED and total_incentive > 0 | 19 |
| Gate-failed (excluded) | 1 |
| Total export records | 19 |
| Total export amount | ₹1,41,260 |

---

## 5. Incentive Rate Reference Data

### New Business Rates (Policy Year 1)

| Product | Rate | Rate Type | Min Premium Slab | Min Term |
|---------|------|-----------|-----------------|----------|
| ULIP-GROW | 5.00% | % of premium | — | 5 years |
| TERM-PURE | 15.00% | % of premium | — | 10 years |
| TRAD-ENDT | 25.00% | % of premium | — | 12 years |

### Renewal Rates (Policy Year 2+)

| Product | Rate | Rate Type |
|---------|------|-----------|
| ULIP-GROW | 1.50% | % of premium |
| TRAD-ENDT | 2.00% | % of premium |

### MLM Override Rates

| Level | Rate | Max Cap |
|-------|------|---------|
| L1 (SA over JR) | 8.00% of downline incentive | ₹50,000 |
| L2 (BM over SA) | 5.00% of downline incentive | ₹30,000 |
| L3 | 2.00% of downline incentive | ₹15,000 |

### Persistency Gates

| Month | Threshold | Consequence |
|-------|-----------|-------------|
| 13M | 60.00% | BLOCK_INCENTIVE (full block) |
| 25M | 50.00% | REDUCE_BY_PCT (25% reduction) |
| 37M | 45.00% | CLAWBACK_PCT (10% clawback) |

---

## 6. System Integration Test Accounts

| System | Client ID | Client Secret | Purpose |
|--------|-----------|---------------|---------|
| Penta Inbound | penta_inbound | penta_secret_2025 | System-to-system API calls |

---

## 7. Region and Channel Reference

### Regions (10 seeded)

| Region Code | Region Name | Zone |
|------------|-------------|------|
| MUM-W | Mumbai West | West |
| MUM-E | Mumbai East | West |
| PUNE | Pune | West |
| DEL-NCR | Delhi NCR | North |
| CHD | Chandigarh | North |
| BLR | Bangalore | South |
| CHN | Chennai | South |
| HYD | Hyderabad | South |
| KOL | Kolkata | East |
| BHU | Bhubaneswar | East |

### Channels (4 seeded)

| Channel Code | Channel Name |
|-------------|-------------|
| AGENCY | Agency |
| BANCA | Banca |
| DIRECT | Direct |
| BROKER | Broker |

---

**Prepared by:** ___________________________  **Date:** ____________
