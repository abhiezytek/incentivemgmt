-- Payout disbursement audit log
CREATE TABLE IF NOT EXISTS payout_disbursement_log (
  id                 SERIAL PRIMARY KEY,
  result_id          INT NOT NULL REFERENCES ins_incentive_results(id),
  paid_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_by            INT,
  payment_reference  VARCHAR(100),
  remarks            TEXT
);

CREATE INDEX IF NOT EXISTS idx_disbursement_log_result ON payout_disbursement_log(result_id);
