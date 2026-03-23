import { Router } from 'express';
import pool, { query } from '../../db/pool.js';

const router = Router();

// ─────────────────────────────────────────────
// GET /status — connection health for all systems
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// GET /file-log — recent file processing log
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// GET /audit-log — recent API call log
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// GET /failed-records — staging records with errors
// ─────────────────────────────────────────────

router.get('/failed-records', async (req, res) => {
  try {
    const table = req.query.table === 'stg_agent_master' ? 'stg_agent_master' : 'stg_policy_transactions';
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

// ─────────────────────────────────────────────
// POST /failed-records/:id/skip — skip/reject a record
// ─────────────────────────────────────────────

router.post('/failed-records/:id/skip', async (req, res) => {
  try {
    const table = req.query.table === 'stg_agent_master' ? 'stg_agent_master' : 'stg_policy_transactions';
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

// ─────────────────────────────────────────────
// POST /trigger/* — manual trigger buttons
// ─────────────────────────────────────────────

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
