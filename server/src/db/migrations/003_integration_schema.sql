-- ─────────────────────────────────────────────────────────────
-- INTEGRATION SCHEMA
-- Tables for integration tracking, staging, and system config.
-- ─────────────────────────────────────────────────────────────

-- 1. Integration audit log (every inbound/outbound API call logged)
CREATE TABLE integration_audit_log (
  id              SERIAL PRIMARY KEY,
  source_system   VARCHAR(50),    -- 'PENTA','LIFEASIA','HIERARCHY'
  direction       VARCHAR(10),    -- 'INBOUND','OUTBOUND'
  endpoint        VARCHAR(200),
  method          VARCHAR(10),
  payload_summary JSONB,          -- first 500 chars of payload, masked
  records_received INT DEFAULT 0,
  records_processed INT DEFAULT 0,
  records_failed  INT DEFAULT 0,
  status          VARCHAR(20),    -- 'SUCCESS','PARTIAL','FAILED'
  error_message   TEXT,
  ip_address      VARCHAR(50),
  called_at       TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP,
  duration_ms     INT
);

-- 2. File processing log (every SFTP file tracked)
CREATE TABLE file_processing_log (
  id              SERIAL PRIMARY KEY,
  file_name       VARCHAR(200) NOT NULL,
  source_system   VARCHAR(50),    -- 'LIFEASIA','PENTA'
  file_type       VARCHAR(50),    -- 'POLICY_TXN','AGENT_MASTER','PERSISTENCY'
  sftp_path       TEXT,
  file_size_bytes BIGINT,
  total_rows      INT,
  processed_rows  INT,
  failed_rows     INT,
  status          VARCHAR(20),    -- 'PENDING','PROCESSING','SUCCESS','FAILED','PARTIAL'
  error_details   JSONB,          -- array of {row: N, error: "..."}
  downloaded_at   TIMESTAMP,
  processed_at    TIMESTAMP,
  moved_to_path   TEXT            -- /processed/ or /errors/ path
);

-- 3. Staging tables for inbound data validation
CREATE TABLE stg_policy_transactions (
  LIKE ins_policy_transactions INCLUDING ALL,
  stg_id        SERIAL,
  stg_status    VARCHAR(20) DEFAULT 'PENDING',  -- PENDING/VALID/INVALID/LOADED
  stg_error     TEXT,
  stg_file_id   INT REFERENCES file_processing_log(id),
  stg_loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stg_agent_master (
  LIKE ins_agents INCLUDING DEFAULTS,
  stg_id        SERIAL,
  stg_status    VARCHAR(20) DEFAULT 'PENDING',
  stg_error     TEXT,
  stg_file_id   INT REFERENCES file_processing_log(id),
  stg_loaded_at TIMESTAMP DEFAULT NOW()
);

-- 4. System config for sync state tracking
CREATE TABLE system_config (
  config_key    VARCHAR(100) PRIMARY KEY,
  config_value  TEXT,
  description   TEXT,
  updated_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_config (config_key, config_value, description) VALUES
('HIERARCHY_LAST_SYNC',   NULL, 'Last successful hierarchy API sync timestamp'),
('LIFEASIA_LAST_FILE',    NULL, 'Last processed Life Asia file name'),
('PENTA_LAST_SYNC',       NULL, 'Last successful Penta API sync timestamp'),
('POLICY_MASK_ENABLED',   'TRUE', 'Enable policy number masking in UI'),
('POLICY_MASK_PATTERN',   'FIRST3_LAST3', 'Masking pattern for policy numbers');

-- 5. API token registry (system-to-system JWT tokens)
CREATE TABLE api_clients (
  id            SERIAL PRIMARY KEY,
  client_id     VARCHAR(100) UNIQUE NOT NULL,  -- 'PENTA_SYS','LIFEASIA_SYS'
  client_name   VARCHAR(150),
  client_secret_hash TEXT NOT NULL,            -- bcrypt hashed
  allowed_endpoints TEXT[],                    -- array of permitted endpoint paths
  is_active     BOOLEAN DEFAULT TRUE,
  last_used_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO api_clients (client_id, client_name, allowed_endpoints) VALUES
('PENTA_SYS',    'KGILS Penta System',
 ARRAY['/api/integration/penta/*']),
('LIFEASIA_SYS', 'Life Asia AS400',
 ARRAY['/api/integration/lifeasia/*']);

-- 6. Outbound file log
CREATE TABLE outbound_file_log (
  id             SERIAL PRIMARY KEY,
  file_name      VARCHAR(200),
  target_system  VARCHAR(50),
  program_id     INT,
  period_start   DATE,
  record_count   INT,
  total_amount   NUMERIC,
  generated_by   INT REFERENCES users(id),
  generated_at   TIMESTAMP DEFAULT NOW(),
  file_path      TEXT,
  status         VARCHAR(20) DEFAULT 'GENERATED'
);
