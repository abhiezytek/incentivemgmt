import { Router } from 'express';
import pool, { query } from '../../db/pool.js';
import { ERRORS, apiError } from '../../utils/errorCodes.js';

const router = Router();

// ─────────────────────────────────────────────
// Shared date / CSV formatting helpers
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
 * Format a Date as DD.MM.YYYY (SAP standard).
 * @param {Date} d
 * @returns {string}
 */
function sapDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

/**
 * Format a period_start date as YYYYMM for invoice / reference numbers.
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
  return `${mon.charAt(0)}${mon.slice(1).toLowerCase()} ${d.getFullYear()}`;
}

/**
 * Format a period_start date as MMYYYY for SAP narration.
 * @param {string} periodStart  ISO date string
 * @returns {string}
 */
function periodMMYYYY(periodStart) {
  const d = new Date(periodStart);
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
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

/**
 * Generate a timestamp-based filename prefix: YYYYMMDD_HHMMSS
 * @param {Date} d
 * @returns {string}
 */
function fileTimestamp(d) {
  const ts = d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${ts.slice(0, 8)}_${ts.slice(8, 14)}`;
}

/**
 * Fetch approved/initiated incentive results with agent, channel, and region info.
 * @param {number} programId
 * @param {string} periodStart
 * @returns {Promise<Array>}
 */
async function fetchExportRows(programId, periodStart) {
  return query(
    `SELECT
       r.id              AS result_id,
       r.agent_code,
       r.program_id,
       r.period_start,
       r.total_incentive,
       a.agent_name,
       c.code            AS channel_code,
       c.name            AS channel_name,
       rg.region_code
     FROM ins_incentive_results r
     JOIN ins_agents  a  ON a.agent_code = r.agent_code
     JOIN channels    c  ON c.id = a.channel_id
     LEFT JOIN ins_regions rg ON rg.id = a.region_id
     WHERE r.program_id    = $1
       AND r.period_start   = $2
       AND r.status IN ('APPROVED', 'INITIATED')
       AND r.total_incentive > 0
     ORDER BY r.agent_code`,
    [programId, periodStart]
  );
}

/**
 * Transition result statuses from APPROVED → INITIATED after export.
 * @param {number[]} resultIds
 */
async function markResultsInitiated(resultIds) {
  if (resultIds.length === 0) return;
  await pool.query(
    `UPDATE ins_incentive_results
        SET status = 'INITIATED'
      WHERE id = ANY($1) AND status = 'APPROVED'`,
    [resultIds]
  );
}

/**
 * @swagger
 * /api/integration/export/oracle-financials:
 *   post:
 *     tags:
 *       - Integration - Outbound
 *     summary: Generate Oracle AP CSV export
 *     description: >
 *       Generates an Oracle Accounts Payable CSV file for approved incentive
 *       results matching the specified program and period. The response is
 *       streamed as a downloadable CSV attachment. Each export is logged to
 *       `outbound_file_log`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *               - periodStart
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: Incentive program identifier
 *                 example: 12
 *               periodStart:
 *                 type: string
 *                 format: date
 *                 description: Start of the incentive period (ISO date)
 *                 example: "2025-07-01"
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *             example: >
 *               OPERATING_UNIT,SUPPLIER_NUMBER,SUPPLIER_NAME,INVOICE_NUMBER,...
 *               KGILS India,AGT-5001,Ravi Kumar,INC-12-202507-AGT-5001,...
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: programId and periodStart are required
 *       404:
 *         description: No approved results found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No approved incentive results found for the given program and period
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to generate Oracle AP file
 */
router.post('/oracle-financials', async (req, res) => {
  try {
    const { programId, periodStart } = req.body;

    // --- Validation ---
    if (!programId || !periodStart) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'programId, periodStart' }));
    }

    // --- Fetch approved/initiated results with agent/channel/region info ---
    const rows = await fetchExportRows(programId, periodStart);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No approved incentive results found for the given program and period',
      });
    }

    // --- Configuration ---
    const operatingUnit = process.env.ORACLE_OPERATING_UNIT || 'Vision Operations';
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
      'COST_CENTER',
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
      ].join(',');
    });

    const csvContent = [header, ...csvRows].join('\r\n') + '\r\n';

    // --- File metadata ---
    const fileName = `ORACLE_AP_INCENTIVE_${fileTimestamp(now)}.csv`;
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_incentive), 0);

    // --- Log to outbound_file_log ---
    await pool.query(
      `INSERT INTO outbound_file_log
         (file_name, target_system, program_id, period_start, record_count, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fileName, 'ORACLE_AP', programId, periodStart, rows.length, totalAmount, 'GENERATED']
    );

    // --- Update result status APPROVED → INITIATED ---
    await markResultsInitiated(rows.map(r => r.result_id));

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
// SAP FICO Export
// ─────────────────────────────────────────────

/**
 * @swagger
 * /api/integration/export/sap-fico:
 *   post:
 *     tags:
 *       - Integration - Outbound
 *     summary: Generate SAP FICO CSV export
 *     description: >
 *       Generates a SAP FICO Accounts Payable CSV file for approved/initiated
 *       incentive results. The response is streamed as a downloadable CSV
 *       attachment. Each export is logged to `outbound_file_log` and result
 *       statuses are transitioned from APPROVED to INITIATED.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *               - periodStart
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: Incentive program identifier
 *                 example: 12
 *               periodStart:
 *                 type: string
 *                 format: date
 *                 description: Start of the incentive period (ISO date)
 *                 example: "2025-07-01"
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: No approved results found
 *       500:
 *         description: Internal server error
 */
router.post('/sap-fico', async (req, res) => {
  try {
    const { programId, periodStart } = req.body;

    // --- Validation ---
    if (!programId || !periodStart) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'programId, periodStart' }));
    }

    // --- Fetch approved/initiated results ---
    const rows = await fetchExportRows(programId, periodStart);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No approved incentive results found for the given program and period',
      });
    }

    // --- Configuration ---
    const companyCode = process.env.SAP_COMPANY_CODE || '1000';
    const currency = 'INR';

    const now = new Date();
    const paymentDate = sapDate(now);
    const pTag = periodTag(periodStart);
    const pMMYYYY = periodMMYYYY(periodStart);

    // --- Build CSV ---
    const header = [
      'VENDOR_CODE', 'VENDOR_NAME', 'PAYMENT_DATE', 'INVOICE_AMOUNT',
      'COST_CENTER', 'GL_ACCOUNT', 'PROFIT_CENTER', 'REFERENCE_DOC',
      'PAYMENT_METHOD', 'CURRENCY', 'COMPANY_CODE', 'NARRATION',
    ].join(',');

    const csvRows = rows.map((r) => {
      const amount = Number(r.total_incentive).toFixed(2);
      const referenceDoc = `INC/${r.program_id}/${pTag}/${r.agent_code}`;
      const narration = `Sales Incentive ${pMMYYYY}`;

      return [
        csvField(r.agent_code),
        csvField(r.agent_name),
        csvField(paymentDate),
        csvField(amount),
        csvField(`CC-${r.channel_code || ''}`),
        csvField('400001'),
        csvField(r.region_code || ''),
        csvField(referenceDoc),
        csvField('T'),
        csvField(currency),
        csvField(companyCode),
        csvField(narration),
      ].join(',');
    });

    const csvContent = [header, ...csvRows].join('\r\n') + '\r\n';

    // --- File metadata ---
    const fileName = `SAP_PAYOUT_${fileTimestamp(now)}.csv`;
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_incentive), 0);

    // --- Log to outbound_file_log ---
    await pool.query(
      `INSERT INTO outbound_file_log
         (file_name, target_system, program_id, period_start, record_count, total_amount, file_path, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [fileName, 'SAP_FICO', programId, periodStart, rows.length, totalAmount, '/outbound/sap/', 'GENERATED']
    );

    // --- Update result status APPROVED → INITIATED ---
    await markResultsInitiated(rows.map(r => r.result_id));

    // --- Send CSV as download ---
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[Integration] SAP FICO export error:', err.message);
    res.status(500).json({ error: 'Failed to generate SAP FICO file' });
  }
});

// ─────────────────────────────────────────────
// Export History
// ─────────────────────────────────────────────

/**
 * @swagger
 * /api/integration/export/history:
 *   get:
 *     tags:
 *       - Integration - Outbound
 *     summary: List export file history
 *     description: >
 *       Returns recent entries from `outbound_file_log` filtered by optional
 *       programId and targetSystem. Includes the generating user's name.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema:
 *           type: integer
 *         description: Filter by program ID
 *       - in: query
 *         name: targetSystem
 *         schema:
 *           type: string
 *           enum: [SAP_FICO, ORACLE_AP]
 *         description: Filter by target system
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: Array of export log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   file_name:
 *                     type: string
 *                   target_system:
 *                     type: string
 *                   record_count:
 *                     type: integer
 *                   total_amount:
 *                     type: number
 *                   generated_by_name:
 *                     type: string
 *                   generated_at:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/history', async (req, res) => {
  try {
    const { programId, targetSystem } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (programId) {
      conditions.push(`o.program_id = $${idx++}`);
      params.push(programId);
    }
    if (targetSystem) {
      conditions.push(`o.target_system = $${idx++}`);
      params.push(targetSystem);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);

    const rows = await query(
      `SELECT
         o.file_name,
         o.target_system,
         o.record_count,
         o.total_amount,
         u.name AS generated_by_name,
         o.generated_at,
         o.status
       FROM outbound_file_log o
       LEFT JOIN users u ON u.id = o.generated_by
       ${whereClause}
       ORDER BY o.generated_at DESC
       LIMIT $${idx}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[Integration] Export history error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve export history' });
  }
});

export default router;
