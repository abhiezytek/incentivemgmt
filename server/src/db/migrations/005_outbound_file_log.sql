-- ─────────────────────────────────────────────
-- OUTBOUND FILE LOG
-- Tracks every outbound payment file generated
-- for Oracle AP and SAP FICO integrations.
-- ─────────────────────────────────────────────

CREATE TABLE outbound_file_log (
  id             SERIAL PRIMARY KEY,
  file_name      VARCHAR(200),
  target_system  VARCHAR(50),    -- 'SAP_FICO', 'ORACLE_AP'
  program_id     INT,
  period_start   DATE,
  record_count   INT,
  total_amount   NUMERIC,
  generated_by   INT,            -- users.id
  generated_at   TIMESTAMP DEFAULT NOW(),
  file_path      TEXT,
  status         VARCHAR(20) DEFAULT 'GENERATED'  -- GENERATED, DOWNLOADED, PROCESSED
);

CREATE INDEX idx_outbound_file_log_target ON outbound_file_log(target_system);
CREATE INDEX idx_outbound_file_log_program ON outbound_file_log(program_id, period_start);
