import { Router } from 'express';
import pool, { query } from '../../db/pool.js';

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
 * POST /notify
 * Notification webhook called when Life Asia drops a new file.
 * Logs to integration_audit_log and optionally triggers an
 * immediate SFTP poll.
 */
router.post('/notify', async (req, res) => {
  const start = Date.now();
  try {
    const { file_name, file_type, record_count } = req.body;

    if (!file_name) {
      return res.status(400).json({ error: 'file_name is required' });
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
 * GET /last-file
 * Returns info about the most recently processed Life Asia file.
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
