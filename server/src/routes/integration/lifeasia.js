import { Router } from 'express';
import pool, { query } from '../../db/pool.js';
import { ERRORS, apiError } from '../../utils/errorCodes.js';

const router = Router();

// ─────────────────────────────────────────────
// Life Asia SFTP integration routes
//
// Callback / webhook endpoints for the Life Asia
// AS400 SFTP system. Actual file polling is handled
// by the sftpPoller cron job; these endpoints let
// the external system push status updates or
// notifications when new files are available.
// ─────────────────────────────────────────────

/**
 * @swagger
 * /integration/lifeasia/notify:
 *   post:
 *     tags: [Integration – Life Asia]
 *     summary: Life Asia file notification webhook
 *     description: |
 *       Notification webhook called by the Life Asia AS400 system when a new
 *       file has been dropped on the SFTP server.  Logs the event to
 *       `integration_audit_log` and optionally triggers an immediate SFTP poll.
 *     security:
 *       - SystemBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file_name]
 *             properties:
 *               file_name:
 *                 type: string
 *                 example: POLICY_TXN_20260315.csv
 *               file_type:
 *                 type: string
 *                 enum: [POLICY_TXN, AGENT_MASTER, PERSISTENCY]
 *                 example: POLICY_TXN
 *               record_count:
 *                 type: integer
 *                 example: 1250
 *     responses:
 *       200:
 *         description: Notification accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification received
 *                 file_name:
 *                   type: string
 *                   example: POLICY_TXN_20260315.csv
 *       400:
 *         description: Validation error — file_name is required
 *       401:
 *         description: System authentication token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.post('/notify', async (req, res) => {
  const start = Date.now();
  try {
    const { file_name, file_type, record_count } = req.body;

    if (!file_name) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { field: 'file_name' }));
    }

    const durationMs = Date.now() - start;

    await pool.query(
      `INSERT INTO integration_audit_log
         (source_system, direction, endpoint, method,
          records_received, status, called_at, completed_at, duration_ms,
          payload_summary)
       VALUES ('LIFEASIA', 'INBOUND', '/api/integration/lifeasia/notify', 'POST',
               $1, 'SUCCESS', NOW(), NOW(), $2, $3)`,
      [record_count || 0, durationMs, JSON.stringify({ file_name, file_type })]
    );

    // Optionally trigger SFTP poll
    try {
      const { runSftpPollNow } = await import('../../jobs/sftpPoller.js');
      if (typeof runSftpPollNow === 'function') {
        runSftpPollNow().catch((e) =>
          console.error('[LifeAsia] Auto-triggered SFTP poll error:', e.message)
        );
      }
    } catch { /* SFTP poller not available — skip */ }

    res.json({ success: true, message: 'Notification received', file_name });
  } catch (err) {
    console.error('[LifeAsia] Notify error:', err.message);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

/**
 * @swagger
 * /integration/lifeasia/last-file:
 *   get:
 *     tags: [Integration – Life Asia]
 *     summary: Get last processed Life Asia file
 *     description: |
 *       Returns metadata about the most recently processed Life Asia SFTP file
 *       from the `file_processing_log` table.
 *     security:
 *       - SystemBearerAuth: []
 *     responses:
 *       200:
 *         description: Last file info (or null if none)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               nullable: true
 *               properties:
 *                 file_name:
 *                   type: string
 *                   example: POLICY_TXN_20260315.csv
 *                 file_type:
 *                   type: string
 *                   example: POLICY_TXN
 *                 total_rows:
 *                   type: integer
 *                   example: 1250
 *                 valid_rows:
 *                   type: integer
 *                   example: 1240
 *                 error_rows:
 *                   type: integer
 *                   example: 10
 *                 status:
 *                   type: string
 *                   example: COMPLETED
 *                 started_at:
 *                   type: string
 *                   format: date-time
 *                 completed_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: System authentication token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get('/last-file', async (_req, res) => {
  try {
    const [row] = await query(
      `SELECT file_name, file_type, total_rows, valid_rows, error_rows,
              status, started_at, completed_at
       FROM file_processing_log
       WHERE source_system = 'LIFEASIA'
       ORDER BY started_at DESC LIMIT 1`
    );

    res.json(row || null);
  } catch (err) {
    console.error('[LifeAsia] Last-file error:', err.message);
    res.status(500).json({ error: 'Failed to fetch last file info' });
  }
});

export default router;
