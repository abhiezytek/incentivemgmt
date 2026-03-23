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

export default router;
