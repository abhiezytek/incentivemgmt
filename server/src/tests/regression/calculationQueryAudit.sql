-- ═══════════════════════════════════════════════════════════════════
-- calculationQueryAudit.sql
-- Manual audit view for one program and period.
--
-- Run against the incentive database for a specific program/period
-- to verify calculation integrity after additive feature deployment.
--
-- Usage:
--   psql -d incentive_db -f calculationQueryAudit.sql
--
-- Before running, set the program_id and period_start below:
-- ═══════════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────────────┐
-- │  CONFIGURATION — Set your target program and period      │
-- └──────────────────────────────────────────────────────────┘

-- Adjust these values to match your target program/period:
-- Program ID 1 = "Agency Monthly Contest - Jan 2026" (from seed data)

-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 1: BASE RESULT TOTALS                           │
-- │  Shows aggregate incentive totals for the program/period │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 1: BASE RESULT TOTALS ===' AS section;

SELECT
    COUNT(*)::int                                       AS total_records,
    COALESCE(SUM(nb_incentive), 0)::numeric(12,2)      AS total_nb_incentive,
    COALESCE(SUM(renewal_incentive), 0)::numeric(12,2) AS total_renewal_incentive,
    COALESCE(SUM(clawback_amount), 0)::numeric(12,2)   AS total_clawback,
    COALESCE(SUM(net_self_incentive), 0)::numeric(12,2) AS total_net_self,
    COALESCE(SUM(total_override), 0)::numeric(12,2)    AS total_override,
    COALESCE(SUM(total_incentive), 0)::numeric(12,2)   AS total_incentive_pool,
    MIN(total_incentive)::numeric(12,2)                 AS min_incentive,
    MAX(total_incentive)::numeric(12,2)                 AS max_incentive,
    AVG(total_incentive)::numeric(12,2)                 AS avg_incentive
FROM ins_incentive_results
WHERE program_id = 1
  AND period_start = '2026-01-01';


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 2: APPROVAL STAGE COUNTS                        │
-- │  Shows how many records are at each pipeline stage       │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 2: APPROVAL STAGE COUNTS ===' AS section;

SELECT
    status,
    COUNT(*)::int                                    AS record_count,
    COALESCE(SUM(total_incentive), 0)::numeric(12,2) AS total_amount
FROM ins_incentive_results
WHERE program_id = 1
  AND period_start = '2026-01-01'
GROUP BY status
ORDER BY
    CASE status
        WHEN 'DRAFT'     THEN 1
        WHEN 'APPROVED'  THEN 2
        WHEN 'INITIATED' THEN 3
        WHEN 'PAID'      THEN 4
        ELSE 5
    END;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 3: GATE PASS/FAIL COUNTS                        │
-- │  Shows persistency gate outcomes                         │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 3: GATE PASS/FAIL COUNTS ===' AS section;

SELECT
    persistency_gate_passed,
    COUNT(*)::int                                    AS record_count,
    COALESCE(SUM(total_incentive), 0)::numeric(12,2) AS total_amount,
    STRING_AGG(agent_code, ', ' ORDER BY agent_code) AS agents
FROM ins_incentive_results
WHERE program_id = 1
  AND period_start = '2026-01-01'
GROUP BY persistency_gate_passed
ORDER BY persistency_gate_passed DESC;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 4: EXPORT ELIGIBLE COUNTS                       │
-- │  Records that qualify for Oracle/SAP export               │
-- │  (status IN ('APPROVED','INITIATED') AND total > 0)      │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 4: EXPORT ELIGIBLE COUNTS ===' AS section;

SELECT
    COUNT(*)::int                                    AS export_eligible_records,
    COALESCE(SUM(total_incentive), 0)::numeric(12,2) AS export_eligible_amount
FROM ins_incentive_results
WHERE program_id = 1
  AND period_start = '2026-01-01'
  AND status IN ('APPROVED', 'INITIATED')
  AND total_incentive > 0;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 5: ADJUSTED TOTALS VS BASE TOTALS               │
-- │  Compares base calculated incentive to any manual         │
-- │  adjustments from the additive incentive_adjustments      │
-- │  table. If no adjustments exist, totals should match.     │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 5: ADJUSTED TOTALS VS BASE TOTALS ===' AS section;

SELECT
    r.id                                               AS result_id,
    r.agent_code,
    r.total_incentive::numeric(12,2)                   AS base_total,
    COALESCE(adj.total_adj, 0)::numeric(12,2)          AS total_adjustments,
    (r.total_incentive + COALESCE(adj.total_adj, 0))::numeric(12,2) AS adjusted_total,
    CASE
        WHEN COALESCE(adj.total_adj, 0) != 0
        THEN 'ADJUSTED'
        ELSE 'UNCHANGED'
    END                                                AS adjustment_status,
    r.status,
    r.persistency_gate_passed
FROM ins_incentive_results r
LEFT JOIN LATERAL (
    SELECT
        SUM(CASE
            WHEN adjustment_type NOT IN ('HOLD', 'RELEASE')
            THEN adjustment_amount
            ELSE 0
        END) AS total_adj
    FROM incentive_adjustments
    WHERE result_id = r.id
) adj ON true
WHERE r.program_id = 1
  AND r.period_start = '2026-01-01'
ORDER BY r.total_incentive DESC;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 6: ROWS WHERE ADJUSTED PAYOUT DIFFERS           │
-- │  Flags any rows where adjustments exist                   │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 6: ROWS WITH NON-ZERO ADJUSTMENTS ===' AS section;

SELECT
    r.id                                         AS result_id,
    r.agent_code,
    r.total_incentive::numeric(12,2)             AS base_total,
    a.adjustment_type,
    a.adjustment_amount::numeric(12,2),
    a.reason,
    a.created_by,
    a.created_at
FROM ins_incentive_results r
JOIN incentive_adjustments a ON a.result_id = r.id
WHERE r.program_id = 1
  AND r.period_start = '2026-01-01'
ORDER BY r.agent_code, a.created_at;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 7: UNEXPECTED STATUS CHANGES                    │
-- │  Identifies rows where status doesn't match expected      │
-- │  pattern based on approval/payment timestamps             │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 7: UNEXPECTED STATUS CHANGES ===' AS section;

SELECT
    r.id,
    r.agent_code,
    r.status,
    r.persistency_gate_passed,
    r.calculated_at,
    r.approved_at,
    r.approved_by,
    CASE
        -- DRAFT but has approved_at → unexpected
        WHEN r.status = 'DRAFT' AND r.approved_at IS NOT NULL
        THEN '⚠️ DRAFT with approval timestamp'

        -- APPROVED but no approved_at → unexpected
        WHEN r.status = 'APPROVED' AND r.approved_at IS NULL
        THEN '⚠️ APPROVED without approval timestamp'

        -- PAID but has no payout log
        WHEN r.status = 'PAID' AND NOT EXISTS (
            SELECT 1 FROM payout_disbursement_log pdl
            WHERE pdl.result_id = r.id
        )
        THEN '⚠️ PAID without disbursement log'

        -- Gate failed but status is not DRAFT
        WHEN r.persistency_gate_passed = FALSE AND r.status != 'DRAFT'
        THEN '⚠️ Gate-failed record not in DRAFT'

        ELSE '✅ OK'
    END AS status_check
FROM ins_incentive_results r
WHERE r.program_id = 1
  AND r.period_start = '2026-01-01'
ORDER BY r.agent_code;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 8: HELD RESULTS SUMMARY                         │
-- │  Shows any results currently on hold via additive table   │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 8: HELD RESULTS SUMMARY ===' AS section;

SELECT
    r.id                           AS result_id,
    r.agent_code,
    r.total_incentive::numeric(12,2) AS base_total,
    r.status,
    h.hold_count,
    h.release_count,
    CASE
        WHEN COALESCE(h.hold_count, 0) > COALESCE(h.release_count, 0)
        THEN '🔒 ON HOLD'
        ELSE '✅ NOT HELD'
    END AS hold_status
FROM ins_incentive_results r
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER(WHERE adjustment_type = 'HOLD')    AS hold_count,
        COUNT(*) FILTER(WHERE adjustment_type = 'RELEASE') AS release_count
    FROM incentive_adjustments
    WHERE result_id = r.id
) h ON true
WHERE r.program_id = 1
  AND r.period_start = '2026-01-01'
  AND COALESCE(h.hold_count, 0) > 0
ORDER BY r.agent_code;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 9: TOP EARNER VERIFICATION                      │
-- │  Confirms the highest total_incentive agent              │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 9: TOP EARNER VERIFICATION ===' AS section;

SELECT
    agent_code,
    nb_incentive::numeric(12,2),
    renewal_incentive::numeric(12,2),
    net_self_incentive::numeric(12,2),
    total_override::numeric(12,2),
    total_incentive::numeric(12,2),
    status,
    persistency_gate_passed
FROM ins_incentive_results
WHERE program_id = 1
  AND period_start = '2026-01-01'
ORDER BY total_incentive DESC
LIMIT 5;


-- ┌──────────────────────────────────────────────────────────┐
-- │  SECTION 10: EXPORT LOG VERIFICATION                     │
-- │  Shows outbound export file records for the period       │
-- └──────────────────────────────────────────────────────────┘

SELECT '=== SECTION 10: EXPORT LOG VERIFICATION ===' AS section;

SELECT
    file_name,
    target_system,
    record_count,
    total_amount::numeric(12,2),
    status,
    generated_at
FROM outbound_file_log
WHERE program_id = 1
  AND period_start = '2026-01-01'
ORDER BY generated_at DESC;


-- ═══════════════════════════════════════════════════════════════════
-- END OF AUDIT SCRIPT
--
-- Expected results for seeded Jan 2026 program (before any approvals):
--   - Total records: 20 (12 JR + 6 SA + 2 BM)
--   - All records in DRAFT status
--   - Top earner: AGT-JR-005 with total_incentive = 34,800
--   - Gate-failed: 1 record (AGT-JR-004)
--   - Export eligible: 0 (none APPROVED yet)
--   - Adjustments: 0 (none applied yet)
--   - Held results: 0 (none held yet)
-- ═══════════════════════════════════════════════════════════════════
