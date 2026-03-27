-- Add team_override_pct column to payout_rules for team rollup calculation
ALTER TABLE payout_rules
  ADD COLUMN team_override_pct NUMERIC DEFAULT 0;
