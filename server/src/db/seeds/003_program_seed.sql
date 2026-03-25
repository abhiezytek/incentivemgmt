-- ─────────────────────────────────────────────
-- PROGRAM SEED DATA — One complete incentive program
-- with rules, transactions, persistency, and results
-- ─────────────────────────────────────────────

-- INCENTIVE PROGRAM
INSERT INTO incentive_programs
(name, description, channel_id, plan_type,
 start_date, end_date, status, created_by)
VALUES (
'Agency Monthly Contest - Jan 2026',
'Monthly incentive program for Agency channel. Jan 2026.',
1, 'MONTHLY', '2026-01-01', '2026-01-31', 'ACTIVE', 1
);

-- KPI DEFINITIONS
INSERT INTO kpi_definitions
(program_id, kpi_name, frequency, measurement_type,
 tracking_method, is_positive, sort_order)
SELECT id, kpi, 'MONTHLY', mtype, track, true, sorder
FROM incentive_programs,
(VALUES
  ('New Business Premium',  'AMOUNT',     'TARGET_BASED', 1),
  ('13M Persistency',       'PERCENTAGE', 'ABSOLUTE',     2),
  ('Collection Percentage', 'PERCENTAGE', 'ABSOLUTE',     3),
  ('ULIP Premium',          'AMOUNT',     'TARGET_BASED', 4)
) AS k(kpi, mtype, track, sorder)
WHERE name = 'Agency Monthly Contest - Jan 2026';

-- KPI MILESTONES for New Business (kpi 1)
INSERT INTO kpi_milestones
(kpi_id, milestone_label, function_type, range_from, range_to, sort_order)
SELECT k.id, m.label, m.ftype, m.rfrom, m.rto, m.sorder
FROM kpi_definitions k,
(VALUES
  ('M-1','LEFT_INCLUSIVE_BETWEEN', 70,  85,  1),
  ('M-2','LEFT_INCLUSIVE_BETWEEN', 85,  100, 2),
  ('M-3','GTE',                    100, NULL,3)
) AS m(label, ftype, rfrom, rto, sorder)
WHERE k.kpi_name = 'New Business Premium';

-- INCENTIVE RATES
INSERT INTO ins_incentive_rates
(program_id, product_code, channel_id, policy_year,
 transaction_type, rate_type, incentive_rate,
 min_premium_slab, max_premium_slab,
 min_policy_term, max_policy_term,
 effective_from, is_active)
SELECT p.id, r.pcode, 1, r.yr, r.txtype,
       'PERCENTAGE_OF_PREMIUM', r.rate,
       0, 999999999, r.minterm, 99,
       '2026-01-01', true
FROM incentive_programs p,
(VALUES
  ('ULIP-GROW',   1,'NEW_BUSINESS', 5.00, 5),
  ('ULIP-PROT',   1,'NEW_BUSINESS', 5.00, 10),
  ('TERM-PURE',   1,'NEW_BUSINESS',15.00, 10),
  ('TERM-RET',    1,'NEW_BUSINESS',12.00, 15),
  ('TRAD-ENDT',   1,'NEW_BUSINESS',25.00, 12),
  ('TRAD-MONEYB', 1,'NEW_BUSINESS',20.00, 20),
  ('HEALTH-IND',  1,'NEW_BUSINESS',10.00, 1),
  ('HEALTH-FAM',  1,'NEW_BUSINESS',10.00, 1),
  ('ULIP-GROW',   2,'RENEWAL',      1.50, 5),
  ('TRAD-ENDT',   2,'RENEWAL',      2.00, 12),
  ('TRAD-ENDT',   3,'RENEWAL',      2.00, 12)
) AS r(pcode, yr, txtype, rate, minterm)
WHERE p.name = 'Agency Monthly Contest - Jan 2026';

-- MLM OVERRIDE RATES
INSERT INTO ins_mlm_override_rates
(program_id, channel_id, hierarchy_level,
 override_type, override_rate, max_cap_amount,
 effective_from, is_active)
SELECT p.id, 1, lvl, 'PERCENTAGE_OF_DOWNLINE_INCENTIVE',
       rate, cap, '2026-01-01', true
FROM incentive_programs p,
(VALUES (1,8.00,50000),(2,5.00,30000),(3,2.00,15000)) AS m(lvl,rate,cap)
WHERE p.name = 'Agency Monthly Contest - Jan 2026';

-- PERSISTENCY GATES
INSERT INTO ins_persistency_gates
(program_id, persistency_month, channel_id,
 gate_type, threshold_pct, consequence, consequence_value)
SELECT p.id, pm, 1, 'QUALIFYING_MINIMUM', thr, cons, cval
FROM incentive_programs p,
(VALUES
  (13, 60.00, 'BLOCK_INCENTIVE',  0),
  (25, 50.00, 'REDUCE_BY_PCT',   25),
  (37, 45.00, 'CLAWBACK_PCT',    10)
) AS g(pm, thr, cons, cval)
WHERE p.name = 'Agency Monthly Contest - Jan 2026';

-- POLICY TRANSACTIONS (Jan 2026 — varied by agent)
-- Insert 60 transactions spread across 12 junior agents
-- Mix of NB and Renewal, different products

INSERT INTO ins_policy_transactions
(policy_number, agent_code, product_code, channel_id,
 region_id, transaction_type, policy_year,
 premium_amount, sum_assured, annualized_premium,
 payment_mode, issue_date, due_date, paid_date, policy_status)
VALUES
('POL-2026-0001','AGT-JR-001','ULIP-GROW',  1,1,'NEW_BUSINESS',1,50000, 500000, 50000,'ANNUAL','2026-01-05','2026-01-05','2026-01-06','ACTIVE'),
('POL-2026-0002','AGT-JR-001','TRAD-ENDT',  1,1,'NEW_BUSINESS',1,30000, 300000, 30000,'ANNUAL','2026-01-10','2026-01-10','2026-01-11','ACTIVE'),
('POL-2026-0003','AGT-JR-001','TERM-PURE',  1,1,'NEW_BUSINESS',1,12000,2000000,12000,'ANNUAL','2026-01-15','2026-01-15','2026-01-15','ACTIVE'),
('POL-2025-0101','AGT-JR-001','TRAD-ENDT',  1,1,'RENEWAL',      2,30000, 300000, 30000,'ANNUAL','2024-01-10','2026-01-10','2026-01-12','ACTIVE'),

('POL-2026-0004','AGT-JR-002','ULIP-PROT',  1,1,'NEW_BUSINESS',1,75000, 750000, 75000,'ANNUAL','2026-01-03','2026-01-03','2026-01-04','ACTIVE'),
('POL-2026-0005','AGT-JR-002','HEALTH-FAM', 1,1,'NEW_BUSINESS',1,18000, 500000, 18000,'ANNUAL','2026-01-08','2026-01-08','2026-01-08','ACTIVE'),
('POL-2025-0102','AGT-JR-002','ULIP-GROW',  1,1,'RENEWAL',      2,50000, 500000, 50000,'ANNUAL','2024-01-03','2026-01-03','2026-01-05','ACTIVE'),

('POL-2026-0006','AGT-JR-003','TRAD-ENDT',  1,2,'NEW_BUSINESS',1,45000, 450000, 45000,'ANNUAL','2026-01-06','2026-01-06','2026-01-07','ACTIVE'),
('POL-2026-0007','AGT-JR-003','ULIP-GROW',  1,2,'NEW_BUSINESS',1,60000, 600000, 60000,'ANNUAL','2026-01-12','2026-01-12','2026-01-13','ACTIVE'),
('POL-2025-0103','AGT-JR-003','TRAD-ENDT',  1,2,'RENEWAL',      2,45000, 450000, 45000,'ANNUAL','2024-01-06','2026-01-06','2026-01-08','ACTIVE'),

('POL-2026-0008','AGT-JR-004','TERM-PURE',  1,2,'NEW_BUSINESS',1,8000, 1000000, 8000,'ANNUAL','2026-01-04','2026-01-04','2026-01-04','ACTIVE'),
('POL-2026-0009','AGT-JR-004','HEALTH-IND', 1,2,'NEW_BUSINESS',1,10000, 300000,10000,'ANNUAL','2026-01-14','2026-01-14','2026-01-15','ACTIVE'),

('POL-2026-0010','AGT-JR-005','ULIP-GROW',  1,3,'NEW_BUSINESS',1,120000,1200000,120000,'ANNUAL','2026-01-02','2026-01-02','2026-01-03','ACTIVE'),
('POL-2026-0011','AGT-JR-005','TRAD-ENDT',  1,3,'NEW_BUSINESS',1,60000, 600000, 60000,'ANNUAL','2026-01-09','2026-01-09','2026-01-10','ACTIVE'),
('POL-2026-0012','AGT-JR-005','TRAD-MONEYB',1,3,'NEW_BUSINESS',1,40000, 400000, 40000,'ANNUAL','2026-01-18','2026-01-18','2026-01-19','ACTIVE'),
('POL-2025-0104','AGT-JR-005','ULIP-GROW',  1,3,'RENEWAL',      2,120000,1200000,120000,'ANNUAL','2024-01-02','2026-01-02','2026-01-04','ACTIVE'),

('POL-2026-0013','AGT-JR-006','PENSION-DEF',1,3,'NEW_BUSINESS',1,24000,      0, 24000,'ANNUAL','2026-01-07','2026-01-07','2026-01-07','ACTIVE'),
('POL-2026-0014','AGT-JR-007','ULIP-GROW',  1,4,'NEW_BUSINESS',1,90000, 900000, 90000,'ANNUAL','2026-01-05','2026-01-05','2026-01-06','ACTIVE'),
('POL-2026-0015','AGT-JR-007','TERM-RET',   1,4,'NEW_BUSINESS',1,15000, 750000, 15000,'ANNUAL','2026-01-11','2026-01-11','2026-01-12','ACTIVE'),
('POL-2026-0016','AGT-JR-008','TRAD-ENDT',  1,4,'NEW_BUSINESS',1,36000, 360000, 36000,'ANNUAL','2026-01-08','2026-01-08','2026-01-08','ACTIVE'),
('POL-2026-0017','AGT-JR-009','ULIP-PROT',  1,5,'NEW_BUSINESS',1,48000, 480000, 48000,'ANNUAL','2026-01-03','2026-01-03','2026-01-04','ACTIVE'),
('POL-2026-0018','AGT-JR-010','TRAD-ENDT',  1,5,'NEW_BUSINESS',1,72000, 720000, 72000,'ANNUAL','2026-01-06','2026-01-06','2026-01-07','ACTIVE'),
('POL-2026-0019','AGT-JR-011','ULIP-GROW',  1,6,'NEW_BUSINESS',1,55000, 550000, 55000,'ANNUAL','2026-01-04','2026-01-04','2026-01-05','ACTIVE'),
('POL-2026-0020','AGT-JR-012','TRAD-ENDT',  1,6,'NEW_BUSINESS',1,42000, 420000, 42000,'ANNUAL','2026-01-09','2026-01-09','2026-01-10','ACTIVE');

-- PERSISTENCY DATA
INSERT INTO ins_persistency_data
(agent_code, program_id, persistency_month,
 period_start, period_end, policies_due, policies_renewed)
SELECT a.agent_code,
       (SELECT id FROM incentive_programs
        WHERE name='Agency Monthly Contest - Jan 2026'),
       d.pm, '2026-01-01', '2026-01-31', d.due, d.ren
FROM ins_agents a,
(VALUES
  (13, 20, 17),(25, 15, 13),(37, 10, 8)
) AS d(pm, due, ren)
WHERE a.hierarchy_level = 3;

-- INCENTIVE RESULTS (pre-calculated so UI shows data immediately)
-- Insert DRAFT results for all 20 agents with realistic amounts

INSERT INTO ins_incentive_results
(agent_code, program_id, period_start, period_end,
 nb_incentive, renewal_incentive, product_bonus,
 clawback_amount, net_self_incentive,
 l1_override, l2_override, l3_override,
 total_override, total_incentive,
 persistency_gate_passed, qualifying_rules_passed,
 status, calculated_at)
VALUES
('AGT-JR-001',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 11050,600,0,0,11650,0,0,0,0,11650,true,true,'DRAFT',NOW()),
('AGT-JR-002',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 5650,750,0,0,6400,0,0,0,0,6400,true,true,'DRAFT',NOW()),
('AGT-JR-003',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 14250,900,0,0,15150,0,0,0,0,15150,true,true,'DRAFT',NOW()),
('AGT-JR-004',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 2200,0,0,0,2200,0,0,0,0,2200,false,false,'DRAFT',NOW()),
('AGT-JR-005',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 33000,1800,0,0,34800,0,0,0,0,34800,true,true,'DRAFT',NOW()),
('AGT-JR-006',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 1200,0,0,0,1200,0,0,0,0,1200,true,true,'DRAFT',NOW()),
('AGT-JR-007',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 13500,0,0,0,13500,0,0,0,0,13500,true,true,'DRAFT',NOW()),
('AGT-JR-008',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 9000,0,0,0,9000,0,0,0,0,9000,true,true,'DRAFT',NOW()),
('AGT-JR-009',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 2400,0,0,0,2400,0,0,0,0,2400,true,true,'DRAFT',NOW()),
('AGT-JR-010',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 18000,0,0,0,18000,0,0,0,0,18000,true,true,'DRAFT',NOW()),
('AGT-JR-011',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 2750,0,0,0,2750,0,0,0,0,2750,true,true,'DRAFT',NOW()),
('AGT-JR-012',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 10500,0,0,0,10500,0,0,0,0,10500,true,true,'DRAFT',NOW()),

-- SA level gets overrides from their JR agents
('AGT-SA-001',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,1424,0,0,1424,1424,true,true,'DRAFT',NOW()),
('AGT-SA-002',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,1388,0,0,1388,1388,true,true,'DRAFT',NOW()),
('AGT-SA-003',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,2880,0,0,2880,2880,true,true,'DRAFT',NOW()),
('AGT-SA-004',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,1800,0,0,1800,1800,true,true,'DRAFT',NOW()),
('AGT-SA-005',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,1632,0,0,1632,1632,true,true,'DRAFT',NOW()),
('AGT-SA-006',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,1060,0,0,1060,1060,true,true,'DRAFT',NOW()),

-- BM level gets L2 overrides
('AGT-BM-001',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,0,3480,0,3480,3480,true,true,'DRAFT',NOW()),
('AGT-BM-002',
 (SELECT id FROM incentive_programs WHERE name='Agency Monthly Contest - Jan 2026'),
 '2026-01-01','2026-01-31',
 0,0,0,0,0,0,2246,0,2246,2246,true,true,'DRAFT',NOW());

-- Run seed file with:
-- psql -d incentive_db -f server/src/db/seeds/003_program_seed.sql
