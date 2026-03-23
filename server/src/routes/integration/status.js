import { Router } from 'express';
import pool, { query } from '../../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/integration/status:
 *   get:
 *     tags:
 *       - Integration - Status
 *     summary: Integration connection health
 *     description: >
 *       Returns the current health and last-sync timestamps for every
 *       integrated system: LifeAsia SFTP, Penta API, Hierarchy sync,
 *       and outbound file generation.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Health status for all integration points
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lifeAsia:
 *                   type: object
 *                   properties:
 *                     lastFile:
 *                       type: string
 *                       example: "LIFEASIA_POLICY_20250715.csv"
 *                     recordsProcessed:
 *                       type: integer
 *                       example: 1520
 *                     status:
 *                       type: string
 *                       example: COMPLETED
 *                     lastReceived:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-15T06:00:00.000Z"
 *                 penta:
 *                   type: object
 *                   properties:
 *                     lastSync:
 *                       type: string
 *                       example: "2025-07-15T08:30:00"
 *                     status:
 *                       type: string
 *                       example: SUCCESS
 *                     lastCall:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-15T08:30:00.000Z"
 *                     durationMs:
 *                       type: integer
 *                       example: 42
 *                 hierarchy:
 *                   type: object
 *                   properties:
 *                     lastSync:
 *                       type: string
 *                       example: "2025-07-14T22:00:00"
 *                     agentsSynced:
 *                       type: integer
 *                       example: 340
 *                     status:
 *                       type: string
 *                       example: COMPLETED
 *                     lastCompleted:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-14T22:05:12.000Z"
 *                 outbound:
 *                   type: object
 *                   properties:
 *                     lastFile:
 *                       type: string
 *                       example: "ORACLE_AP_INCENTIVE_20250715_093000.csv"
 *                     targetSystem:
 *                       type: string
 *                       example: ORACLE_AP
 *                     recordCount:
 *                       type: integer
 *                       example: 87
 *                     totalAmount:
 *                       type: number
 *                       example: 1250000.00
 *                     status:
 *                       type: string
 *                       example: GENERATED
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-15T09:30:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch integration status
 */
router.get('/status', async (_req, res) => {
  try {
    const [sftp] = await query(
      `SELECT file_name, source_system, total_rows, status, completed_at
       FROM file_processing_log
       WHERE source_system = 'LIFEASIA'
       ORDER BY started_at DESC LIMIT 1`
    );

    const [hierCfg] = await query(
      `SELECT config_value FROM system_config WHERE config_key = 'HIERARCHY_LAST_SYNC'`
    );
    const [hierFile] = await query(
      `SELECT total_rows, valid_rows, status, completed_at
       FROM file_processing_log
       WHERE file_type = 'HIERARCHY_SYNC'
       ORDER BY started_at DESC LIMIT 1`
    );

    const [pentaCfg] = await query(
      `SELECT config_value FROM system_config WHERE config_key = 'PENTA_LAST_SYNC'`
    );
    const [pentaAudit] = await query(
      `SELECT status, called_at, duration_ms
       FROM integration_audit_log
       WHERE source_system = 'PENTA'
       ORDER BY called_at DESC LIMIT 1`
    );

    const [outbound] = await query(
      `SELECT file_name, target_system, record_count, total_amount, status, generated_at
       FROM outbound_file_log
       ORDER BY generated_at DESC LIMIT 1`
    );

    res.json({
      lifeAsia: {
        lastFile: sftp?.file_name || null,
        recordsProcessed: sftp?.total_rows || 0,
        status: sftp?.status || 'UNKNOWN',
        lastReceived: sftp?.completed_at || null,
      },
      penta: {
        lastSync: pentaCfg?.config_value || null,
        status: pentaAudit?.status || 'UNKNOWN',
        lastCall: pentaAudit?.called_at || null,
        durationMs: pentaAudit?.duration_ms || null,
      },
      hierarchy: {
        lastSync: hierCfg?.config_value || null,
        agentsSynced: hierFile?.valid_rows || 0,
        status: hierFile?.status || 'UNKNOWN',
        lastCompleted: hierFile?.completed_at || null,
      },
      outbound: {
        lastFile: outbound?.file_name || null,
        targetSystem: outbound?.target_system || null,
        recordCount: outbound?.record_count || 0,
        totalAmount: outbound?.total_amount || 0,
        status: outbound?.status || 'NONE',
        generatedAt: outbound?.generated_at || null,
      },
    });
  } catch (err) {
    console.error('[Integration] Status error:', err.message);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

/**
 * @swagger
 * /api/integration/file-log:
 *   get:
 *     tags:
 *       - Integration - Status
 *     summary: Recent file processing log
 *     description: >
 *       Returns the most recent file processing log entries, ordered by
 *       start time descending. Use the `limit` query parameter to control
 *       how many entries are returned (default 20, max 100).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of log entries to return
 *     responses:
 *       200:
 *         description: Array of file processing log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 142
 *                   file_name:
 *                     type: string
 *                     example: "LIFEASIA_POLICY_20250715.csv"
 *                   source_system:
 *                     type: string
 *                     example: LIFEASIA
 *                   file_type:
 *                     type: string
 *                     example: POLICY_TRANSACTIONS
 *                   batch_id:
 *                     type: string
 *                     example: "SFTP_1752595200000"
 *                   total_rows:
 *                     type: integer
 *                     example: 1520
 *                   valid_rows:
 *                     type: integer
 *                     example: 1498
 *                   error_rows:
 *                     type: integer
 *                     example: 22
 *                   inserted_rows:
 *                     type: integer
 *                     example: 1498
 *                   updated_rows:
 *                     type: integer
 *                     example: 0
 *                   status:
 *                     type: string
 *                     example: COMPLETED
 *                   error_message:
 *                     type: string
 *                     nullable: true
 *                     example: null
 *                   started_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-15T06:00:00.000Z"
 *                   completed_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-15T06:00:45.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch file processing log
 */
router.get('/file-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const rows = await query(
      `SELECT id, file_name, source_system, file_type, batch_id,
              total_rows, valid_rows, error_rows, inserted_rows, updated_rows,
              status, error_message, started_at, completed_at
       FROM file_processing_log
       ORDER BY started_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Integration] File-log error:', err.message);
    res.status(500).json({ error: 'Failed to fetch file processing log' });
  }
});

/**
 * @swagger
 * /api/integration/audit-log:
 *   get:
 *     tags:
 *       - Integration - Status
 *     summary: Recent API call log
 *     description: >
 *       Returns recent entries from the integration audit log, ordered by
 *       call time descending. Optionally filter by source system name.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum number of audit entries to return
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source system (e.g. PENTA, LIFEASIA)
 *     responses:
 *       200:
 *         description: Array of audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 891
 *                   source_system:
 *                     type: string
 *                     example: PENTA
 *                   direction:
 *                     type: string
 *                     example: INBOUND
 *                   endpoint:
 *                     type: string
 *                     example: "/api/integration/penta/policy-data"
 *                   method:
 *                     type: string
 *                     example: POST
 *                   records_received:
 *                     type: integer
 *                     example: 50
 *                   records_processed:
 *                     type: integer
 *                     example: 50
 *                   records_failed:
 *                     type: integer
 *                     example: 0
 *                   status:
 *                     type: string
 *                     example: SUCCESS
 *                   error_message:
 *                     type: string
 *                     nullable: true
 *                     example: null
 *                   called_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-15T08:30:00.000Z"
 *                   completed_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-15T08:30:01.200Z"
 *                   duration_ms:
 *                     type: integer
 *                     example: 1200
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch audit log
 */
router.get('/audit-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const source = req.query.source || null;

    let sql = `SELECT id, source_system, direction, endpoint, method,
                      records_received, records_processed, records_failed,
                      status, error_message, called_at, completed_at, duration_ms
               FROM integration_audit_log`;
    const params = [];

    if (source) {
      sql += ' WHERE source_system = $1';
      params.push(source);
    }

    sql += ' ORDER BY called_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[Integration] Audit-log error:', err.message);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Whitelist mapping for staging table names
const STG_TABLES = {
  stg_agent_master: 'stg_agent_master',
  stg_policy_transactions: 'stg_policy_transactions',
};

/**
 * @swagger
 * /api/integration/failed-records:
 *   get:
 *     tags:
 *       - Integration - Status
 *     summary: Staging records with errors
 *     description: >
 *       Returns staging records that have a status of INVALID or ERROR.
 *       Defaults to the `stg_policy_transactions` table unless the `table`
 *       query parameter specifies `stg_agent_master`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         schema:
 *           type: string
 *           enum:
 *             - stg_policy_transactions
 *             - stg_agent_master
 *           default: stg_policy_transactions
 *         description: Staging table to query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: Array of failed staging records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 3045
 *                   policy_number:
 *                     type: string
 *                     example: "POL-2025-009876"
 *                   agent_code:
 *                     type: string
 *                     example: "AGT-5001"
 *                   stg_status:
 *                     type: string
 *                     example: INVALID
 *                   stg_error:
 *                     type: string
 *                     example: "Premium amount must be positive"
 *                   stg_loaded_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-07-15T06:00:12.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch failed records
 */
router.get('/failed-records', async (req, res) => {
  try {
    const table = STG_TABLES[req.query.table] || STG_TABLES.stg_policy_transactions;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const rows = await query(
      `SELECT * FROM ${table}
       WHERE stg_status IN ('INVALID', 'ERROR')
       ORDER BY stg_loaded_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Integration] Failed-records error:', err.message);
    res.status(500).json({ error: 'Failed to fetch failed records' });
  }
});

/**
 * @swagger
 * /api/integration/failed-records/{id}/skip:
 *   post:
 *     tags:
 *       - Integration - Status
 *     summary: Skip a failed record
 *     description: >
 *       Marks a failed staging record as SKIPPED so it is excluded from
 *       future reprocessing. Defaults to `stg_policy_transactions` unless
 *       the `table` query parameter specifies `stg_agent_master`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Staging record ID
 *         example: 3045
 *       - in: query
 *         name: table
 *         schema:
 *           type: string
 *           enum:
 *             - stg_policy_transactions
 *             - stg_agent_master
 *           default: stg_policy_transactions
 *         description: Staging table containing the record
 *     responses:
 *       200:
 *         description: Record skipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to skip record
 */
router.post('/failed-records/:id/skip', async (req, res) => {
  try {
    const table = STG_TABLES[req.query.table] || STG_TABLES.stg_policy_transactions;
    const { id } = req.params;

    await pool.query(
      `UPDATE ${table} SET stg_status = 'SKIPPED' WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Integration] Skip record error:', err.message);
    res.status(500).json({ error: 'Failed to skip record' });
  }
});

/**
 * @swagger
 * /api/integration/trigger/sftp-poll:
 *   post:
 *     tags:
 *       - Integration - Status
 *     summary: Trigger manual SFTP poll
 *     description: >
 *       Manually triggers an SFTP poll cycle to check for and import new
 *       files from the LifeAsia SFTP server. The poll runs asynchronously;
 *       this endpoint returns immediately after dispatching the job.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: SFTP poll triggered
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
 *                   example: SFTP poll triggered
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to trigger SFTP poll
 */
router.post('/trigger/sftp-poll', async (_req, res) => {
  try {
    const { runSftpPollNow } = await import('../../jobs/sftpPoller.js');
    if (typeof runSftpPollNow === 'function') {
      runSftpPollNow().catch((e) => console.error('[Integration] Manual SFTP poll error:', e.message));
      return res.json({ success: true, message: 'SFTP poll triggered' });
    }
    res.json({ success: false, message: 'SFTP poller not available (runSftpPollNow not exported)' });
  } catch (err) {
    console.error('[Integration] Trigger SFTP error:', err.message);
    res.status(500).json({ error: 'Failed to trigger SFTP poll' });
  }
});

/**
 * @swagger
 * /api/integration/trigger/hierarchy-sync:
 *   post:
 *     tags:
 *       - Integration - Status
 *     summary: Trigger manual hierarchy sync
 *     description: >
 *       Manually triggers a hierarchy synchronisation job that refreshes
 *       agent reporting structures from the master data source. The sync
 *       runs asynchronously; this endpoint returns immediately.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hierarchy sync triggered
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
 *                   example: Hierarchy sync triggered
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to trigger hierarchy sync
 */
router.post('/trigger/hierarchy-sync', async (_req, res) => {
  try {
    const { runHierarchySyncNow } = await import('../../jobs/hierarchySync.js');
    if (typeof runHierarchySyncNow === 'function') {
      runHierarchySyncNow().catch((e) => console.error('[Integration] Manual hierarchy sync error:', e.message));
      return res.json({ success: true, message: 'Hierarchy sync triggered' });
    }
    res.json({ success: false, message: 'Hierarchy sync not available (runHierarchySyncNow not exported)' });
  } catch (err) {
    console.error('[Integration] Trigger hierarchy error:', err.message);
    res.status(500).json({ error: 'Failed to trigger hierarchy sync' });
  }
});

/**
 * @swagger
 * /api/integration/trigger/reprocess:
 *   post:
 *     tags:
 *       - Integration - Status
 *     summary: Reprocess failed staging records
 *     description: >
 *       Resets all INVALID and ERROR records in `stg_policy_transactions`
 *       back to PENDING status so they are picked up by the next validation
 *       cycle. Returns the count of records requeued.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Records requeued for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reprocessed:
 *                   type: integer
 *                   example: 14
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to reprocess failed records
 */
router.post('/trigger/reprocess', async (_req, res) => {
  try {
    const result = await pool.query(
      `UPDATE stg_policy_transactions SET stg_status = 'PENDING', stg_error = NULL
       WHERE stg_status IN ('INVALID', 'ERROR')
       RETURNING id`
    );
    res.json({ success: true, reprocessed: result.rowCount });
  } catch (err) {
    console.error('[Integration] Reprocess error:', err.message);
    res.status(500).json({ error: 'Failed to reprocess failed records' });
  }
});

export default router;
