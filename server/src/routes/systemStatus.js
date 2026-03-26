import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/system-status/summary:
 *   get:
 *     tags: [System Status]
 *     summary: System health and integration status
 *     description: >
 *       Returns integration sync timestamps, job counts, and system health
 *       indicators. Reads from existing system_config, integration_audit_log,
 *       and file_processing_log tables.
 *     responses:
 *       200:
 *         description: System status summary
 */
router.get('/summary', async (req, res) => {
  try {
    // Sync timestamps from system_config
    let syncStatus = {};
    try {
      const configRows = await query(
        `SELECT config_key, config_value, updated_at
         FROM system_config
         WHERE config_key IN ('HIERARCHY_LAST_SYNC','LIFEASIA_LAST_FILE','PENTA_LAST_SYNC')`
      );
      for (const row of configRows) {
        syncStatus[row.config_key] = {
          value: row.config_value,
          updatedAt: row.updated_at,
        };
      }
    } catch {
      // Table may not exist in dev
    }

    // Recent integration audit counts
    let integrationCounts = {};
    try {
      const auditRows = await query(
        `SELECT source_system, status, COUNT(*)::int AS cnt
         FROM integration_audit_log
         WHERE called_at >= NOW() - INTERVAL '24 hours'
         GROUP BY source_system, status`
      );
      for (const row of auditRows) {
        if (!integrationCounts[row.source_system]) {
          integrationCounts[row.source_system] = {};
        }
        integrationCounts[row.source_system][row.status] = row.cnt;
      }
    } catch {
      // Table may not exist
    }

    // File processing status
    let fileProcessing = {};
    try {
      const fileRows = await query(
        `SELECT status, COUNT(*)::int AS cnt
         FROM file_processing_log
         WHERE downloaded_at >= NOW() - INTERVAL '7 days'
         GROUP BY status`
      );
      for (const row of fileRows) {
        fileProcessing[row.status] = row.cnt;
      }
    } catch {
      // Table may not exist
    }

    // Database connectivity
    const dbCheck = await query(`SELECT 1 AS ok`);

    res.json({
      database: { status: dbCheck.length > 0 ? 'CONNECTED' : 'ERROR' },
      syncStatus,
      integrationCounts,
      fileProcessing,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
