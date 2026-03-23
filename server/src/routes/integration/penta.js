import { Router } from 'express';
import pool, { query } from '../../db/pool.js';

const router = Router();

// ─────────────────────────────────────────────
// KGILS Penta API integration routes
//
// Accepts inbound data from the Penta system via
// system-to-system JWT auth (systemAuth middleware).
// ─────────────────────────────────────────────

/**
 * POST /heartbeat
 * Health-check endpoint for the Penta system to confirm connectivity.
 */
router.post('/heartbeat', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO integration_audit_log
         (source_system, direction, endpoint, method, status, called_at, completed_at, duration_ms)
       VALUES ('PENTA', 'INBOUND', '/api/integration/penta/heartbeat', 'POST', 'SUCCESS', NOW(), NOW(), 0)`
    );

    await pool.query(
      `INSERT INTO system_config (config_key, config_value)
       VALUES ('PENTA_LAST_SYNC', NOW()::text)
       ON CONFLICT (config_key) DO UPDATE SET config_value = NOW()::text, updated_at = NOW()`
    );

    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Penta] Heartbeat error:', err.message);
    res.status(500).json({ error: 'Heartbeat logging failed' });
  }
});

/**
 * POST /policy-data
 * Receives policy transaction data from Penta and stages it
 * in stg_policy_transactions for validation.
 */
router.post('/policy-data', async (req, res) => {
  const start = Date.now();
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty' });
    }

    const batchId = `PENTA_${Date.now()}`;
    let inserted = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      await pool.query(
        `INSERT INTO stg_policy_transactions
           (policy_number, agent_code, product_code, premium_amount,
            transaction_type, issue_date, source_system, batch_id, row_number, stg_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENTA', $7, $8, 'PENDING')`,
        [r.policy_number, r.agent_code, r.product_code, r.premium_amount,
         r.transaction_type, r.issue_date, batchId, i + 1]
      );
      inserted++;
    }

    const durationMs = Date.now() - start;

    await pool.query(
      `INSERT INTO integration_audit_log
         (source_system, direction, endpoint, method,
          records_received, records_processed, status,
          called_at, completed_at, duration_ms)
       VALUES ('PENTA', 'INBOUND', '/api/integration/penta/policy-data', 'POST',
               $1, $2, 'SUCCESS', NOW(), NOW(), $3)`,
      [records.length, inserted, durationMs]
    );

    res.json({ success: true, batch_id: batchId, received: records.length, staged: inserted });
  } catch (err) {
    console.error('[Penta] Policy data error:', err.message);

    const durationMs = Date.now() - start;
    await pool.query(
      `INSERT INTO integration_audit_log
         (source_system, direction, endpoint, method, status, error_message,
          called_at, completed_at, duration_ms)
       VALUES ('PENTA', 'INBOUND', '/api/integration/penta/policy-data', 'POST',
               'FAILED', $1, NOW(), NOW(), $2)`,
      [err.message, durationMs]
    ).catch(() => {});

    res.status(500).json({ error: 'Failed to process policy data' });
  }
});

export default router;
