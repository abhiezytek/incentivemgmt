-- ─────────────────────────────────────────────
-- STAGING TABLES for Life Asia SFTP ingestion
-- ─────────────────────────────────────────────

-- Staging table for policy transactions (mirrors ins_policy_transactions + staging metadata)
CREATE TABLE IF NOT EXISTS stg_policy_transactions (
  id                 SERIAL PRIMARY KEY,
  policy_number      VARCHAR(50) NOT NULL,
  agent_code         VARCHAR(30),
  product_code       VARCHAR(30),
  channel_id         INT,
  region_id          INT,
  transaction_type   VARCHAR(30),
  policy_year        INT,
  premium_amount     NUMERIC,
  sum_assured        NUMERIC,
  annualized_premium NUMERIC,
  issue_date         DATE,
  due_date           DATE,
  paid_date          DATE,
  payment_mode       VARCHAR(20),
  policy_status      VARCHAR(20) DEFAULT 'ACTIVE',
  source_system      VARCHAR(30) DEFAULT 'LIFEASIA',
  branch_code        VARCHAR(20),

  -- Staging metadata
  batch_id           VARCHAR(100),
  row_number         INT,
  stg_status         VARCHAR(20) DEFAULT 'PENDING',  -- PENDING / VALID / ERROR
  stg_error          TEXT,
  stg_loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stg_policy_txn_batch   ON stg_policy_transactions (batch_id);
CREATE INDEX IF NOT EXISTS idx_stg_policy_txn_status  ON stg_policy_transactions (stg_status);

-- Staging table for agent master (mirrors ins_agents + staging metadata)
CREATE TABLE IF NOT EXISTS stg_agent_master (
  id                 SERIAL PRIMARY KEY,
  agent_code         VARCHAR(30) NOT NULL,
  agent_name         VARCHAR(150),
  channel_id         INT,
  region_id          INT,
  branch_code        VARCHAR(20),
  license_number     VARCHAR(50),
  license_expiry     DATE,
  activation_date    DATE,
  parent_agent_code  VARCHAR(30),
  hierarchy_level    INT DEFAULT 1,
  status             VARCHAR(20) DEFAULT 'ACTIVE',

  -- Staging metadata
  batch_id           VARCHAR(100),
  row_number         INT,
  stg_status         VARCHAR(20) DEFAULT 'PENDING',  -- PENDING / VALID / ERROR
  stg_error          TEXT,
  stg_loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stg_agent_batch   ON stg_agent_master (batch_id);
CREATE INDEX IF NOT EXISTS idx_stg_agent_status  ON stg_agent_master (stg_status);

-- ─────────────────────────────────────────────
-- FILE PROCESSING LOG
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_processing_log (
  id               SERIAL PRIMARY KEY,
  file_name        VARCHAR(255) NOT NULL,
  file_type        VARCHAR(50),        -- POLICY_TXN / AGENT_MASTER / PERSISTENCY
  source_system    VARCHAR(30) DEFAULT 'LIFEASIA',
  batch_id         VARCHAR(100),
  total_rows       INT DEFAULT 0,
  valid_rows       INT DEFAULT 0,
  error_rows       INT DEFAULT 0,
  inserted_rows    INT DEFAULT 0,
  updated_rows     INT DEFAULT 0,
  status           VARCHAR(30) DEFAULT 'PENDING',  -- PENDING / SUCCESS / PARTIAL / FAILED
  error_message    TEXT,
  started_at       TIMESTAMP DEFAULT NOW(),
  completed_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_log_batch  ON file_processing_log (batch_id);
CREATE INDEX IF NOT EXISTS idx_file_log_name   ON file_processing_log (file_name);
