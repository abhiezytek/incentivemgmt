-- ─────────────────────────────────────────────
-- AGENT SEED DATA — 20 agents, 3-level MLM hierarchy
-- Level 1: Branch Managers (2)
-- Level 2: Senior Agents  (6, 3 per BM)
-- Level 3: Junior Agents  (12, 2 per SA)
-- ─────────────────────────────────────────────

-- LEVEL 1 — Branch Managers
INSERT INTO ins_agents
(agent_code, agent_name, channel_id, region_id, branch_code,
 license_number, license_expiry, activation_date,
 parent_agent_id, hierarchy_level, status) VALUES
('AGT-BM-001', 'Ramesh Sharma',    1, 1, 'BR-MUM-W', 'LIC-M-001', '2028-12-31', '2020-01-01', NULL, 1, 'ACTIVE'),
('AGT-BM-002', 'Kavita Mehta',     1, 4, 'BR-DEL-N', 'LIC-M-002', '2028-12-31', '2020-06-01', NULL, 1, 'ACTIVE');

-- LEVEL 2 — Senior Agents under BM-001
INSERT INTO ins_agents
(agent_code, agent_name, channel_id, region_id, branch_code,
 license_number, license_expiry, activation_date,
 parent_agent_id, hierarchy_level, status) VALUES
('AGT-SA-001', 'Priya Patil',      1, 1, 'BR-MUM-W', 'LIC-S-001', '2027-12-31', '2021-03-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-001'), 2, 'ACTIVE'),
('AGT-SA-002', 'Sunil Joshi',      1, 2, 'BR-MUM-E', 'LIC-S-002', '2027-12-31', '2021-06-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-001'), 2, 'ACTIVE'),
('AGT-SA-003', 'Anita Desai',      1, 3, 'BR-PUNE',  'LIC-S-003', '2027-12-31', '2021-09-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-001'), 2, 'ACTIVE'),

-- LEVEL 2 — Senior Agents under BM-002
('AGT-SA-004', 'Vijay Singh',      1, 4, 'BR-DEL-N', 'LIC-S-004', '2027-12-31', '2021-03-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-002'), 2, 'ACTIVE'),
('AGT-SA-005', 'Neha Gupta',       1, 5, 'BR-CHD',   'LIC-S-005', '2027-12-31', '2021-06-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-002'), 2, 'ACTIVE'),
('AGT-SA-006', 'Rohit Verma',      1, 6, 'BR-BLR',   'LIC-S-006', '2027-12-31', '2022-01-01',
 (SELECT id FROM ins_agents WHERE agent_code='AGT-BM-002'), 2, 'ACTIVE');

-- LEVEL 3 — Junior Agents (2 under each SA)
INSERT INTO ins_agents
(agent_code, agent_name, channel_id, region_id, branch_code,
 license_number, license_expiry, activation_date,
 parent_agent_id, hierarchy_level, status)
SELECT * FROM (VALUES
('AGT-JR-001','Amit Kulkarni',    1,1,'BR-MUM-W','LIC-J-001','2027-06-30','2023-01-01','AGT-SA-001',3,'ACTIVE'),
('AGT-JR-002','Sunita Rao',       1,1,'BR-MUM-W','LIC-J-002','2027-06-30','2023-02-01','AGT-SA-001',3,'ACTIVE'),
('AGT-JR-003','Deepak Nair',      1,2,'BR-MUM-E','LIC-J-003','2027-06-30','2023-01-01','AGT-SA-002',3,'ACTIVE'),
('AGT-JR-004','Pooja Sharma',     1,2,'BR-MUM-E','LIC-J-004','2027-06-30','2023-03-01','AGT-SA-002',3,'ACTIVE'),
('AGT-JR-005','Kiran Pawar',      1,3,'BR-PUNE', 'LIC-J-005','2027-06-30','2023-01-01','AGT-SA-003',3,'ACTIVE'),
('AGT-JR-006','Ravi Kulkarni',    1,3,'BR-PUNE', 'LIC-J-006','2027-06-30','2023-04-01','AGT-SA-003',3,'ACTIVE'),
('AGT-JR-007','Sanjay Tiwari',    1,4,'BR-DEL-N','LIC-J-007','2027-06-30','2023-02-01','AGT-SA-004',3,'ACTIVE'),
('AGT-JR-008','Rekha Pandey',     1,4,'BR-DEL-N','LIC-J-008','2027-06-30','2023-03-01','AGT-SA-004',3,'ACTIVE'),
('AGT-JR-009','Mohit Batra',      1,5,'BR-CHD',  'LIC-J-009','2027-06-30','2023-01-01','AGT-SA-005',3,'ACTIVE'),
('AGT-JR-010','Divya Kapoor',     1,5,'BR-CHD',  'LIC-J-010','2027-06-30','2023-05-01','AGT-SA-005',3,'ACTIVE'),
('AGT-JR-011','Vinod Hegde',      1,6,'BR-BLR',  'LIC-J-011','2027-06-30','2023-02-01','AGT-SA-006',3,'ACTIVE'),
('AGT-JR-012','Lakshmi Iyer',     1,6,'BR-BLR',  'LIC-J-012','2027-06-30','2023-06-01','AGT-SA-006',3,'ACTIVE')
) AS v(agent_code,agent_name,channel_id,region_id,branch_code,
       license_number,license_expiry,activation_date,
       parent_code,hierarchy_level,status)
JOIN ins_agents p ON p.agent_code = v.parent_code;

-- Rebuild hierarchy_path
DO $$
BEGIN
  FOR i IN 1..3 LOOP
    UPDATE ins_agents a SET hierarchy_path =
      CASE WHEN parent_agent_id IS NULL THEN a.id::text
      ELSE (SELECT hierarchy_path FROM ins_agents p
            WHERE p.id = a.parent_agent_id) || '.' || a.id::text
      END;
  END LOOP;
END $$;
