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
 * @swagger
 * /api/integration/penta/heartbeat:
 *   post:
 *     tags:
 *       - Integration - Inbound
 *     summary: Penta system health check
 *     description: >
 *       Health-check endpoint for the Penta system to confirm connectivity.
 *       Logs the heartbeat to `integration_audit_log` and updates the
 *       `PENTA_LAST_SYNC` value in `system_config`.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Heartbeat acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-15T08:30:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Heartbeat logging failed
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
 * @swagger
 * /api/integration/penta/policy-data:
 *   post:
 *     tags:
 *       - Integration - Inbound
 *     summary: Receive policy data from Penta
 *     description: >
 *       Accepts an array of policy transaction records from the Penta system
 *       and stages them in `stg_policy_transactions` for downstream validation
 *       and processing. Each batch is assigned a unique `batch_id`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     policy_number:
 *                       type: string
 *                       example: "POL-2025-001234"
 *                     agent_code:
 *                       type: string
 *                       example: "AGT-5001"
 *                     product_code:
 *                       type: string
 *                       example: "LIFE-ENDOW-20"
 *                     premium_amount:
 *                       type: number
 *                       example: 25000.00
 *                     transaction_type:
 *                       type: string
 *                       example: "NEW_BUSINESS"
 *                     issue_date:
 *                       type: string
 *                       format: date
 *                       example: "2025-07-01"
 *     responses:
 *       200:
 *         description: Policy data staged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 batch_id:
 *                   type: string
 *                   example: "PENTA_1752595200000"
 *                 received:
 *                   type: integer
 *                   example: 5
 *                 staged:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: records array is required and must not be empty
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to process policy data
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
