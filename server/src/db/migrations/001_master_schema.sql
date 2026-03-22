-- MASTER CONFIGURATION TABLES

CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,   -- 'AGENCY','BANCA','DIRECT'
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE incentive_programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  channel_id INT REFERENCES channels(id),
  plan_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  calc_day_rule VARCHAR(30) DEFAULT 'LAST_DAY_OF_MONTH',
  status VARCHAR(20) DEFAULT 'DRAFT',
  banner_url TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_groups (
  id SERIAL PRIMARY KEY,
  program_id INT REFERENCES incentive_programs(id),
  group_name VARCHAR(100),
  group_type VARCHAR(30)   -- 'SINGLE','TEAM','CHANNEL'
);

CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  group_id INT REFERENCES user_groups(id),
  user_id INT NOT NULL,
  role VARCHAR(20),        -- 'SELF','MANAGER','MEMBER'
  reports_to_user_id INT   -- hierarchy linkage
);

-- KPI MASTER (table-driven — no hardcoded KPIs)
CREATE TABLE kpi_definitions (
  id SERIAL PRIMARY KEY,
  program_id INT REFERENCES incentive_programs(id),
  kpi_name VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'MONTHLY',
  is_positive BOOLEAN DEFAULT TRUE,
  breakdown_rule VARCHAR(50) DEFAULT 'FULL_MONTH',
  target_structure VARCHAR(50) DEFAULT 'MONTHLY_TARGET',
  measurement_type VARCHAR(30) DEFAULT 'PERCENTAGE',
  tracking_method VARCHAR(30) DEFAULT 'TARGET_BASED',
  output_display VARCHAR(30) DEFAULT 'NUMBER',
  sort_order INT DEFAULT 0
);

-- MILESTONE RANGES (table-driven — M1, M2, M3 all in rows)
CREATE TABLE kpi_milestones (
  id SERIAL PRIMARY KEY,
  kpi_id INT REFERENCES kpi_definitions(id),
  milestone_label VARCHAR(10) NOT NULL,  -- 'M-1','M-2','M-3'
  performance_driver VARCHAR(100),
  function_type VARCHAR(50),             -- 'LEFT_INCLUSIVE_BETWEEN','GTE'
  range_from NUMERIC,
  range_to NUMERIC,
  sort_order INT DEFAULT 0
);

-- PAYOUT RULES (table-driven slabs)
CREATE TABLE payout_rules (
  id SERIAL PRIMARY KEY,
  program_id INT REFERENCES incentive_programs(id),
  rule_name VARCHAR(100) NOT NULL,
  calc_type VARCHAR(30),    -- 'VARIABLE','FIXED','PERCENTAGE'
  variable_name VARCHAR(100),
  has_qualifying_rules BOOLEAN DEFAULT FALSE,
  has_incentive_table BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE payout_slabs (
  id SERIAL PRIMARY KEY,
  payout_rule_id INT REFERENCES payout_rules(id),
  slab_label VARCHAR(20),
  kpi_id INT REFERENCES kpi_definitions(id),
  milestone_label VARCHAR(10),
  operator VARCHAR(20),          -- 'GTE','LTE','BETWEEN','EQ'
  value1 NUMERIC,
  value2 NUMERIC,
  incentive_operator VARCHAR(30),-- 'MULTIPLY','FLAT','PERCENTAGE_OF'
  tag_type VARCHAR(50),
  parameter_name VARCHAR(100),
  weight_pct NUMERIC DEFAULT 100,
  payout_calc_type VARCHAR(50),  -- 'HIGHEST_AMOUNT','PROPORTIONAL'
  max_cap NUMERIC,
  sort_order INT DEFAULT 0
);

-- QUALIFYING GATES (table-driven conditions)
CREATE TABLE payout_qualifying_rules (
  id SERIAL PRIMARY KEY,
  payout_rule_id INT REFERENCES payout_rules(id),
  kpi_id INT REFERENCES kpi_definitions(id),
  operator VARCHAR(20),
  threshold_value NUMERIC,
  condition_join VARCHAR(5) DEFAULT 'AND'  -- 'AND','OR'
);

-- DERIVED VARIABLES (formula engine — table driven)
CREATE TABLE derived_variables (
  id SERIAL PRIMARY KEY,
  var_name VARCHAR(100) NOT NULL UNIQUE,
  formula TEXT NOT NULL,           -- e.g. '(collected / billed) * 100'
  base_fields JSONB,               -- ["collected","billed"]
  status VARCHAR(20) DEFAULT 'IN_USE',
  created_by INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PERFORMANCE INPUT DATA
CREATE TABLE performance_data (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  program_id INT REFERENCES incentive_programs(id),
  kpi_id INT REFERENCES kpi_definitions(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value NUMERIC DEFAULT 0,
  achieved_value NUMERIC DEFAULT 0,
  source VARCHAR(30) DEFAULT 'UPLOAD', -- 'UPLOAD','API','MANUAL'
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- CALCULATION RESULTS
CREATE TABLE incentive_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  program_id INT REFERENCES incentive_programs(id),
  period_start DATE,
  period_end DATE,
  self_incentive NUMERIC DEFAULT 0,
  team_incentive NUMERIC DEFAULT 0,
  total_incentive NUMERIC DEFAULT 0,
  calc_breakdown JSONB,            -- stores slab hit details
  status VARCHAR(30) DEFAULT 'CALCULATED',
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- SESSION / AUTH (table driven)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) DEFAULT 'AGENT', -- 'ADMIN','MANAGER','AGENT'
  channel_id INT REFERENCES channels(id),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
