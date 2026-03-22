-- ─────────────────────────────────────────────
-- INSURANCE MASTERS
-- ─────────────────────────────────────────────

-- Product Master (ULIP, Term, Traditional, Endowment, Health)
CREATE TABLE ins_products (
  id               SERIAL PRIMARY KEY,
  product_code     VARCHAR(30) UNIQUE NOT NULL,
  product_name     VARCHAR(150) NOT NULL,
  product_category VARCHAR(50),        -- 'ULIP','TERM','TRAD','ENDOWMENT','HEALTH','ANNUITY'
  product_type     VARCHAR(30),        -- 'LINKED','NON_LINKED','PROTECTION'
  min_premium      NUMERIC DEFAULT 0,
  min_sum_assured  NUMERIC DEFAULT 0,
  min_policy_term  INT DEFAULT 1,      -- years
  is_active        BOOLEAN DEFAULT TRUE
);

-- Agent Master (linked to users table)
CREATE TABLE ins_agents (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id),
  agent_code       VARCHAR(30) UNIQUE NOT NULL,
  agent_name       VARCHAR(150),
  channel_id       INT REFERENCES channels(id),  -- AGENCY/BANCA/DIRECT/BROKER
  region_id        INT,                           -- FK to regions table
  branch_code      VARCHAR(20),
  license_number   VARCHAR(50),
  license_expiry   DATE,
  activation_date  DATE,
  status           VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE/INACTIVE/SUSPENDED
  parent_agent_id  INT REFERENCES ins_agents(id), -- MLM upline
  hierarchy_path   TEXT,  -- materialized path '1.5.12.47' for fast recursive queries
  hierarchy_level  INT DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Region Master
CREATE TABLE ins_regions (
  id           SERIAL PRIMARY KEY,
  region_name  VARCHAR(100) NOT NULL,
  region_code  VARCHAR(20) UNIQUE NOT NULL,
  zone         VARCHAR(50)   -- 'NORTH','SOUTH','EAST','WEST'
);

-- Policy Transactions (core fact table — sourced from policy admin system)
CREATE TABLE ins_policy_transactions (
  id               SERIAL PRIMARY KEY,
  policy_number    VARCHAR(50) NOT NULL,
  agent_code       VARCHAR(30) REFERENCES ins_agents(agent_code),
  product_code     VARCHAR(30) REFERENCES ins_products(product_code),
  channel_id       INT REFERENCES channels(id),
  region_id        INT REFERENCES ins_regions(id),
  transaction_type VARCHAR(30),  -- 'NEW_BUSINESS','RENEWAL','LAPSE','REVIVAL','SURRENDER'
  policy_year      INT,          -- 1=first year, 2=renewal yr2, etc.
  premium_amount   NUMERIC NOT NULL,
  sum_assured      NUMERIC,
  annualized_premium NUMERIC,    -- APE
  issue_date       DATE,
  due_date         DATE,
  paid_date        DATE,
  payment_mode     VARCHAR(20),  -- 'ANNUAL','HALF_YEARLY','QUARTERLY','MONTHLY'
  policy_status    VARCHAR(20) DEFAULT 'ACTIVE',
  source_system    VARCHAR(30),  -- 'POLICY_ADMIN','MANUAL'
  uploaded_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PRODUCT-BASED INCENTIVE RATE TABLES
-- ─────────────────────────────────────────────

-- Incentive Rate Master per Product per Channel
-- (handles: different rates for ULIP vs Term vs Traditional)
CREATE TABLE ins_incentive_rates (
  id                  SERIAL PRIMARY KEY,
  program_id          INT REFERENCES incentive_programs(id),
  product_code        VARCHAR(30) REFERENCES ins_products(product_code),
  channel_id          INT REFERENCES channels(id),
  policy_year         INT DEFAULT 1,    -- 1=FYP, 2+=renewal
  transaction_type    VARCHAR(30),      -- 'NEW_BUSINESS','RENEWAL'
  rate_type           VARCHAR(30),      -- 'PERCENTAGE_OF_PREMIUM','FLAT_PER_POLICY','PERCENTAGE_OF_APE'
  incentive_rate      NUMERIC NOT NULL, -- e.g. 15 means 15%
  min_premium_slab    NUMERIC DEFAULT 0,
  max_premium_slab    NUMERIC DEFAULT 999999999,
  min_policy_term     INT DEFAULT 0,    -- incentive varies by policy term
  max_policy_term     INT DEFAULT 99,
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  is_active           BOOLEAN DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- PERSISTENCY KPI TABLES
-- ─────────────────────────────────────────────

-- Tracks 13th/25th/37th/49th month persistency per agent
CREATE TABLE ins_persistency_data (
  id                  SERIAL PRIMARY KEY,
  agent_code          VARCHAR(30) REFERENCES ins_agents(agent_code),
  program_id          INT REFERENCES incentive_programs(id),
  persistency_month   INT,     -- 13, 25, 37, 49, 61
  period_start        DATE,
  period_end          DATE,
  policies_due        INT DEFAULT 0,
  policies_renewed    INT DEFAULT 0,
  persistency_pct     NUMERIC GENERATED ALWAYS AS
    (CASE WHEN policies_due > 0
     THEN (policies_renewed::NUMERIC / policies_due) * 100
     ELSE 0 END) STORED,
  calculated_at       TIMESTAMP DEFAULT NOW()
);

-- Persistency qualifying thresholds (table-driven gates)
CREATE TABLE ins_persistency_gates (
  id                  SERIAL PRIMARY KEY,
  program_id          INT REFERENCES incentive_programs(id),
  persistency_month   INT,       -- 13, 25, 37 etc.
  channel_id          INT REFERENCES channels(id),
  gate_type           VARCHAR(30), -- 'QUALIFYING_MINIMUM','BONUS_THRESHOLD','CLAWBACK_TRIGGER'
  threshold_pct       NUMERIC,     -- e.g. 50 means must have >= 50% persistency
  consequence         VARCHAR(50), -- 'BLOCK_INCENTIVE','REDUCE_BY_PCT','CLAWBACK_PCT'
  consequence_value   NUMERIC      -- reduction/clawback percentage
);

-- ─────────────────────────────────────────────
-- MLM / MULTI-LEVEL HIERARCHY OVERRIDE TABLE
-- ─────────────────────────────────────────────

-- Defines how much override each level earns on downline production
CREATE TABLE ins_mlm_override_rates (
  id              SERIAL PRIMARY KEY,
  program_id      INT REFERENCES incentive_programs(id),
  channel_id      INT REFERENCES channels(id),
  hierarchy_level INT NOT NULL,   -- 1=direct upline, 2=upline's upline, etc.
  product_code    VARCHAR(30),    -- NULL = applies to all products
  override_type   VARCHAR(30),    -- 'PERCENTAGE_OF_DOWNLINE_INCENTIVE','FLAT_PER_POLICY'
  override_rate   NUMERIC NOT NULL,
  max_cap_amount  NUMERIC,
  effective_from  DATE,
  effective_to    DATE,
  is_active       BOOLEAN DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- COMPUTED KPIs PER AGENT PER PERIOD
-- ─────────────────────────────────────────────

CREATE TABLE ins_agent_kpi_summary (
  id                      SERIAL PRIMARY KEY,
  agent_code              VARCHAR(30) REFERENCES ins_agents(agent_code),
  program_id              INT REFERENCES incentive_programs(id),
  period_start            DATE,
  period_end              DATE,

  -- New Business KPIs
  nb_policy_count         INT DEFAULT 0,
  nb_total_premium        NUMERIC DEFAULT 0,
  nb_total_ape            NUMERIC DEFAULT 0,    -- Annualised Premium Equivalent
  nb_sum_assured          NUMERIC DEFAULT 0,
  nb_target_premium       NUMERIC DEFAULT 0,
  nb_achievement_pct      NUMERIC DEFAULT 0,

  -- Product-wise NB breakdown (JSONB for flexibility)
  nb_by_product           JSONB,
  -- e.g. {"ULIP": {"count":5,"premium":200000}, "TERM": {"count":3,"premium":50000}}

  -- Renewal/Persistency KPIs
  renewal_premium_collected NUMERIC DEFAULT 0,
  renewal_policies_due    INT DEFAULT 0,
  collection_pct          NUMERIC DEFAULT 0,   -- (collected/billed)*100
  persistency_13m         NUMERIC DEFAULT 0,
  persistency_25m         NUMERIC DEFAULT 0,
  persistency_37m         NUMERIC DEFAULT 0,

  -- Channel-specific KPIs
  ulip_premium            NUMERIC DEFAULT 0,
  trad_premium            NUMERIC DEFAULT 0,
  term_premium            NUMERIC DEFAULT 0,

  -- Team KPIs (if manager)
  team_nb_premium         NUMERIC DEFAULT 0,
  team_policy_count       INT DEFAULT 0,
  team_achievement_pct    NUMERIC DEFAULT 0,

  -- Scoring
  nb_score                NUMERIC DEFAULT 0,   -- composite score
  persistency_score       NUMERIC DEFAULT 0,
  total_score             NUMERIC DEFAULT 0,

  is_computed             BOOLEAN DEFAULT FALSE,
  computed_at             TIMESTAMP,

  CONSTRAINT uq_agent_kpi_summary UNIQUE (agent_code, program_id, period_start)
);

-- ─────────────────────────────────────────────
-- INCENTIVE RESULTS (insurance-specific output)
-- ─────────────────────────────────────────────

CREATE TABLE ins_incentive_results (
  id                    SERIAL PRIMARY KEY,
  agent_code            VARCHAR(30) REFERENCES ins_agents(agent_code),
  program_id            INT REFERENCES incentive_programs(id),
  period_start          DATE,
  period_end            DATE,

  -- Breakup by type
  nb_incentive          NUMERIC DEFAULT 0,   -- new business
  renewal_incentive     NUMERIC DEFAULT 0,   -- renewal/persistency
  product_bonus         NUMERIC DEFAULT 0,   -- product-specific bonus
  persistency_bonus     NUMERIC DEFAULT 0,
  clawback_amount       NUMERIC DEFAULT 0,   -- negative adjustment
  net_self_incentive    NUMERIC DEFAULT 0,   -- nb + renewal + bonus - clawback

  -- MLM overrides received from downline
  l1_override           NUMERIC DEFAULT 0,   -- from direct reportees
  l2_override           NUMERIC DEFAULT 0,
  l3_override           NUMERIC DEFAULT 0,
  total_override        NUMERIC DEFAULT 0,

  total_incentive       NUMERIC DEFAULT 0,   -- net_self + total_override

  -- Qualification status
  persistency_gate_passed BOOLEAN DEFAULT TRUE,
  qualifying_rules_passed BOOLEAN DEFAULT TRUE,
  disqualification_reason TEXT,

  -- Audit
  calc_breakdown        JSONB,  -- full detailed breakdown per product per slab
  status                VARCHAR(30) DEFAULT 'DRAFT',  -- DRAFT/APPROVED/PAID
  calculated_at         TIMESTAMP DEFAULT NOW(),
  approved_by           INT,
  approved_at           TIMESTAMP
);
