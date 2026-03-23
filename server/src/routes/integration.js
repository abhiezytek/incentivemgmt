import { Router } from 'express';
import pool, { query } from '../db/pool.js';

const router = Router();

// ─────────────────────────────────────────────
// Oracle AP date formatting helpers
// ─────────────────────────────────────────────

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * Format a Date as DD-MON-YYYY (Oracle standard).
 * @param {Date} d
 * @returns {string}
 */
function oracleDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

/**
 * Format a period_start date as YYYYMM for invoice numbers.
 * @param {string} periodStart  ISO date string
 * @returns {string}
 */
function periodTag(periodStart) {
  const d = new Date(periodStart);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a period_start date as "Mon YYYY" for descriptions.
 * @param {string} periodStart  ISO date string
 * @returns {string}
 */
function periodLabel(periodStart) {
  const d = new Date(periodStart);
  const mon = MONTH_NAMES[d.getMonth()];
  // Title-case: "Mar 2026"
  return `${mon.charAt(0)}${mon.slice(1).toLowerCase()} ${d.getFullYear()}`;
}

/**
 * Escape a CSV field: wrap in quotes if it contains commas, quotes, or newlines.
 * @param {*} value
 * @returns {string}
 */
function csvField(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─────────────────────────────────────────────
// POST /export/oracle-financials
// ─────────────────────────────────────────────

router.post('/export/oracle-financials', async (req, res) => {
  try {
    const { programId, periodStart } = req.body;

    // --- Validation ---
    if (!programId || !periodStart) {
      return res.status(400).json({ error: 'programId and periodStart are required' });
    }

    // --- Fetch approved results with agent/channel info ---
    const rows = await query(
      `SELECT
         r.agent_code,
         r.program_id,
         r.period_start,
         r.total_incentive,
         a.agent_name,
         c.code   AS channel_code,
         c.name   AS channel_name
       FROM ins_incentive_results r
       JOIN ins_agents  a ON a.agent_code = r.agent_code
       JOIN channels    c ON c.id = a.channel_id
       WHERE r.program_id   = $1
         AND r.period_start  = $2
         AND r.status        = 'APPROVED'
         AND r.total_incentive > 0
       ORDER BY r.agent_code`,
      [programId, periodStart]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No approved incentive results found for the given program and period',
      });
    }

    // --- Configuration ---
    const operatingUnit = process.env.ORACLE_OPERATING_UNIT || 'KGILS India';
    const currency      = process.env.ORACLE_CURRENCY       || 'INR';
    const paymentTerms  = process.env.ORACLE_PAYMENT_TERMS  || 'IMMEDIATE';
    const glAccount     = process.env.ORACLE_GL_ACCOUNT     || '6100.00.000';

    const now = new Date();
    const invoiceDate = oracleDate(now);
    const pTag = periodTag(periodStart);
    const pLabel = periodLabel(periodStart);

    // --- Build CSV ---
    const header = [
      'OPERATING_UNIT', 'SUPPLIER_NUMBER', 'SUPPLIER_NAME',
      'INVOICE_NUMBER', 'INVOICE_DATE', 'INVOICE_AMOUNT',
      'INVOICE_CURRENCY', 'PAYMENT_TERMS', 'DESCRIPTION',
      'LINE_TYPE', 'LINE_AMOUNT', 'ACCOUNT_CODE',
      'COST_CENTER', 'PROJECT_CODE',
    ].join(',');

    const csvRows = rows.map((r) => {
      const invoiceNumber = `INC-${r.program_id}-${pTag}-${r.agent_code}`;
      const amount = Number(r.total_incentive).toFixed(2);
      const description = `Sales Incentive - ${pLabel} - ${r.channel_name || r.channel_code}`;

      return [
        csvField(operatingUnit),
        csvField(r.agent_code),
        csvField(r.agent_name),
        csvField(invoiceNumber),
        csvField(invoiceDate),
        csvField(amount),
        csvField(currency),
        csvField(paymentTerms),
        csvField(description),
        csvField('ITEM'),
        csvField(amount),
        csvField(glAccount),
        csvField(r.channel_code || ''),
        csvField(`PRG-${r.program_id}`),
      ].join(',');
    });

    const csvContent = [header, ...csvRows].join('\r\n') + '\r\n';

    // --- File metadata ---
    const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);  // YYYYMMDDHHMMSS
    const datePart = ts.slice(0, 8);
    const timePart = ts.slice(8, 14);
    const fileName = `ORACLE_AP_INCENTIVE_${datePart}_${timePart}.csv`;

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_incentive), 0);

    // --- Log to outbound_file_log ---
    await pool.query(
      `INSERT INTO outbound_file_log
         (file_name, target_system, program_id, period_start, record_count, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fileName, 'ORACLE_AP', programId, periodStart, rows.length, totalAmount, 'GENERATED']
    );

    // --- Send CSV as download ---
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[Integration] Oracle AP export error:', err.message);
    res.status(500).json({ error: 'Failed to generate Oracle AP file' });
  }
});

// ─────────────────────────────────────────────
// GET /status — connection health for all systems
// ─────────────────────────────────────────────

router.get('/status', async (_req, res) => {
  try {
    // Life Asia SFTP — latest file_processing_log row
    const [sftp] = await query(
      `SELECT file_name, source_system, total_rows, status, completed_at
       FROM file_processing_log
       WHERE source_system = 'LIFEASIA'
       ORDER BY started_at DESC LIMIT 1`
    );

    // Hierarchy API — last sync from system_config
    const [hierCfg] = await query(
      `SELECT config_value FROM system_config WHERE config_key = 'HIERARCHY_LAST_SYNC'`
    );
    const [hierFile] = await query(
      `SELECT total_rows, valid_rows, status, completed_at
       FROM file_processing_log
       WHERE file_type = 'HIERARCHY_SYNC'
       ORDER BY started_at DESC LIMIT 1`
    );

    // Penta API — last sync from system_config + last audit row
    const [pentaCfg] = await query(
      `SELECT config_value FROM system_config WHERE config_key = 'PENTA_LAST_SYNC'`
    );
    const [pentaAudit] = await query(
      `SELECT status, called_at, duration_ms
       FROM integration_audit_log
       WHERE source_system = 'PENTA'
       ORDER BY called_at DESC LIMIT 1`
    );

    // Outbound — latest generated file
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
    // Dynamic import to avoid circular dependency at startup
    const { runSftpPollNow } = await import('../jobs/sftpPoller.js');
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
    const { runHierarchySyncNow } = await import('../jobs/hierarchySync.js');
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
    // Move INVALID/ERROR records back to PENDING for reprocessing
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
