-- ─────────────────────────────────────────────────────────────
-- 006_additive_tables.sql
-- ADDITIVE-ONLY tables for the prototype-inspired redesign.
-- These tables NEVER modify existing tables.
-- ─────────────────────────────────────────────────────────────

-- 1. Manual adjustments (stored separately from calculated results)
CREATE TABLE IF NOT EXISTS incentive_adjustments (
  id                SERIAL PRIMARY KEY,
  result_id         INT NOT NULL REFERENCES ins_incentive_results(id),
  adjustment_amount NUMERIC NOT NULL DEFAULT 0,
  adjustment_type   VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    -- MANUAL, HOLD, RELEASE, CORRECTION, CLAWBACK
  reason            TEXT,
  created_by        VARCHAR(100),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_adj_result ON incentive_adjustments(result_id);
CREATE INDEX IF NOT EXISTS idx_adj_type   ON incentive_adjustments(adjustment_type);

-- 2. Review action audit trail
CREATE TABLE IF NOT EXISTS incentive_review_actions (
  id          SERIAL PRIMARY KEY,
  result_id   INT NOT NULL REFERENCES ins_incentive_results(id),
  action      VARCHAR(30) NOT NULL,
    -- APPROVE, HOLD, RELEASE, ADJUST, BATCH_APPROVE, ESCALATE
  actor       VARCHAR(100),
  details     JSONB,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_result ON incentive_review_actions(result_id);
CREATE INDEX IF NOT EXISTS idx_review_action ON incentive_review_actions(action);

-- 3. Operational exceptions (UI exception log)
CREATE TABLE IF NOT EXISTS operational_exceptions (
  id              SERIAL PRIMARY KEY,
  exception_type  VARCHAR(50) NOT NULL,
    -- INVALID_AGENT_CODE, DUPLICATE_POLICY, MISSING_RATE, DATA_MISMATCH,
    -- CALCULATION_ERROR, INTEGRATION_ERROR, GATE_FAILURE
  source_system   VARCHAR(50),
    -- CALCULATION, LIFEASIA, PENTA, SFTP, HIERARCHY, MANUAL
  severity        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    -- LOW, MEDIUM, HIGH, CRITICAL
  entity_type     VARCHAR(50),
    -- AGENT, POLICY, PROGRAM, KPI, PAYOUT_RULE
  entity_id       VARCHAR(100),
  description     TEXT,
  before_value    TEXT,
  after_value     TEXT,
  reason_code     VARCHAR(30),
  status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    -- OPEN, INVESTIGATING, RESOLVED, DISMISSED
  resolved_by     VARCHAR(100),
  resolved_at     TIMESTAMP,
  resolution_note TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exc_type   ON operational_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_exc_status ON operational_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exc_entity ON operational_exceptions(entity_type, entity_id);

-- 4. Notification events
CREATE TABLE IF NOT EXISTS notification_events (
  id          SERIAL PRIMARY KEY,
  event_type  VARCHAR(50) NOT NULL,
    -- CALCULATION_COMPLETE, APPROVAL_REQUIRED, EXCEPTION_RAISED,
    -- PAYOUT_INITIATED, INTEGRATION_ERROR, SCHEME_PUBLISHED
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  severity    VARCHAR(20) DEFAULT 'INFO',
    -- INFO, WARNING, ERROR, SUCCESS
  is_read     BOOLEAN DEFAULT FALSE,
  target_user VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   VARCHAR(100),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_events(target_user, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type ON notification_events(event_type);
