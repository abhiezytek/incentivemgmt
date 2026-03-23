import express from 'express';
import multer from 'multer';
import { parseCSV } from '../utils/csvParser.js';
import { bulkInsertTyped } from '../utils/bulkInsert.js';
import { query } from '../db/pool.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Validation helper ──
function validateColumns(rows, required) {
  if (!rows.length) return 'File is empty';
  const headers = Object.keys(rows[0]);
  const missing = required.filter(c => !headers.includes(c));
  return missing.length ? `Missing columns: ${missing.join(', ')}` : null;
}

/**
 * @swagger
 * /api/upload/policy-transactions:
 *   post:
 *     tags: [Data Upload]
 *     summary: Upload policy transactions CSV
 *     description: |
 *       Parses an uploaded CSV file containing insurance policy transactions and upserts
 *       them into the `ins_policy_transactions` table. Duplicate rows (matched on
 *       policy_number + transaction_type + due_date) are updated with the latest
 *       premium_amount, paid_date, and policy_status.
 *
 *       **Required CSV columns:** policy_number, agent_code, product_code,
 *       transaction_type, premium_amount, annualized_premium, paid_date
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file (max 20 MB)
 *     responses:
 *       200:
 *         description: Upload summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               inserted: 1240
 *               total: 1300
 *               skipped: 60
 *       400:
 *         description: Validation error (empty file or missing columns)
 *         content:
 *           application/json:
 *             example:
 *               error: "Missing columns: paid_date"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/policy-transactions', upload.single('file'), async (req, res) => {
  try {
    const rows = await parseCSV(req.file.buffer);
    const REQUIRED = ['policy_number','agent_code','product_code','transaction_type',
                      'premium_amount','annualized_premium','paid_date'];
    const err = validateColumns(rows, REQUIRED);
    if (err) return res.status(ERRORS.VAL_007.status).json(apiError('VAL_007', { message: err }));

    // Pre-fetch lookup maps
    const channelRows = await query(`SELECT id, name FROM channels`);
    const channelMap = new Map(channelRows.filter(r => r.name).map(r => [r.name.toUpperCase(), r.id]));
    const regionRows = await query(`SELECT id, region_code FROM ins_regions`);
    const regionMap = new Map(regionRows.filter(r => r.region_code).map(r => [r.region_code.toUpperCase(), r.id]));

    const mapped = rows.map(r => {
      const channelId = r.channel_code ? channelMap.get(r.channel_code.toUpperCase()) || null : null;
      const regionId = r.region_code ? regionMap.get(r.region_code.toUpperCase()) || null : null;
      return [
        r.policy_number, r.agent_code, r.product_code,
        channelId, regionId,
        r.transaction_type, r.policy_year || 1,
        r.premium_amount, r.sum_assured, r.annualized_premium,
        r.payment_mode, r.issue_date, r.due_date,
        r.paid_date || null, r.policy_status || 'ACTIVE', 'UPLOAD'
      ];
    });

    const cols = ['policy_number','agent_code','product_code','channel_id','region_id',
                  'transaction_type','policy_year','premium_amount','sum_assured',
                  'annualized_premium','payment_mode','issue_date','due_date',
                  'paid_date','policy_status','source_system'];

    const typeMap = {
      policy_year: 'int', premium_amount: 'numeric', sum_assured: 'numeric',
      annualized_premium: 'numeric', channel_id: 'int', region_id: 'int',
      issue_date: 'date', due_date: 'date', paid_date: 'date'
    };

    const count = await bulkInsertTyped(
      'ins_policy_transactions', cols, typeMap, mapped,
      `ON CONFLICT (policy_number, transaction_type, due_date)
       DO UPDATE SET premium_amount=EXCLUDED.premium_amount,
       paid_date=EXCLUDED.paid_date, policy_status=EXCLUDED.policy_status`
    );

    res.json({ success: true, inserted: count, total: rows.length,
               skipped: rows.length - count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/upload/agents:
 *   post:
 *     tags: [Data Upload]
 *     summary: Upload agents CSV
 *     description: |
 *       Parses an uploaded CSV file of insurance agents and upserts them into the
 *       `ins_agents` table. Existing agents (matched on agent_code) have their name,
 *       status, and parent_agent_id updated. After insertion the hierarchy_path column
 *       is recalculated for all agents.
 *
 *       **Required CSV columns:** agent_code, agent_name, channel_code, region_code,
 *       hierarchy_level
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file (max 20 MB)
 *     responses:
 *       200:
 *         description: Upload summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               inserted: 350
 *       400:
 *         description: Validation error (empty file or missing columns)
 *         content:
 *           application/json:
 *             example:
 *               error: "Missing columns: hierarchy_level"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/agents', upload.single('file'), async (req, res) => {
  try {
    const rows = await parseCSV(req.file.buffer);
    const REQUIRED = ['agent_code','agent_name','channel_code','region_code','hierarchy_level'];
    const err = validateColumns(rows, REQUIRED);
    if (err) return res.status(ERRORS.VAL_007.status).json(apiError('VAL_007', { message: err }));

    // Pre-fetch lookup maps
    const channelRows = await query(`SELECT id, name FROM channels`);
    const channelMap = new Map(channelRows.filter(r => r.name).map(r => [r.name.toUpperCase(), r.id]));
    const regionRows = await query(`SELECT id, region_code FROM ins_regions`);
    const regionMap = new Map(regionRows.filter(r => r.region_code).map(r => [r.region_code.toUpperCase(), r.id]));
    const existingAgents = await query(`SELECT id, agent_code FROM ins_agents`);
    const agentLookup = new Map(existingAgents.map(r => [r.agent_code.toUpperCase(), r.id]));

    const mapped = rows.map(r => {
      const channelId = r.channel_code ? channelMap.get(r.channel_code.toUpperCase()) || null : null;
      const regionId = r.region_code ? regionMap.get(r.region_code.toUpperCase()) || null : null;
      const parentId = r.parent_agent_code
        ? agentLookup.get(r.parent_agent_code.toUpperCase()) || null
        : null;

      return [
        r.agent_code, r.agent_name, channelId, regionId,
        r.branch_code, r.license_number, r.license_expiry || null,
        r.activation_date || null, parentId,
        r.hierarchy_level || 1, r.status || 'ACTIVE'
      ];
    });

    const cols = ['agent_code','agent_name','channel_id','region_id','branch_code',
                  'license_number','license_expiry','activation_date',
                  'parent_agent_id','hierarchy_level','status'];
    const typeMap = {
      channel_id:'int', region_id:'int', parent_agent_id:'int',
      hierarchy_level:'int', license_expiry:'date', activation_date:'date'
    };

    const count = await bulkInsertTyped(
      'ins_agents', cols, typeMap, mapped,
      `ON CONFLICT (agent_code) DO UPDATE SET
       agent_name=EXCLUDED.agent_name, status=EXCLUDED.status,
       parent_agent_id=EXCLUDED.parent_agent_id`
    );

    // Update hierarchy_path after all agents inserted
    await query(`
      UPDATE ins_agents a SET hierarchy_path =
        CASE WHEN parent_agent_id IS NULL THEN id::text
             ELSE (SELECT hierarchy_path FROM ins_agents p
                   WHERE p.id = a.parent_agent_id) || '.' || a.id::text
        END
    `);

    res.json({ success: true, inserted: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/upload/persistency:
 *   post:
 *     tags: [Data Upload]
 *     summary: Upload persistency data CSV
 *     description: |
 *       Parses an uploaded CSV file containing agent policy-persistency metrics and
 *       upserts them into `ins_persistency_data`. Duplicates (matched on agent_code +
 *       program_id + persistency_month + period_start) are updated with the latest
 *       policies_due and policies_renewed counts.
 *
 *       **Required CSV columns:** agent_code, persistency_month, period_start,
 *       period_end, policies_due, policies_renewed
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, programId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file (max 20 MB)
 *               programId:
 *                 type: integer
 *                 description: Incentive program ID the data belongs to
 *                 example: 10
 *     responses:
 *       200:
 *         description: Upload summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               inserted: 820
 *       400:
 *         description: Validation error (empty file or missing columns)
 *         content:
 *           application/json:
 *             example:
 *               error: "Missing columns: policies_renewed"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/persistency', upload.single('file'), async (req, res) => {
  try {
    const { programId } = req.body;
    const rows = await parseCSV(req.file.buffer);
    const REQUIRED = ['agent_code','persistency_month','period_start','period_end',
                      'policies_due','policies_renewed'];
    const err = validateColumns(rows, REQUIRED);
    if (err) return res.status(ERRORS.VAL_007.status).json(apiError('VAL_007', { message: err }));

    const mapped = rows.map(r => [
      r.agent_code, programId, r.persistency_month,
      r.period_start, r.period_end, r.policies_due, r.policies_renewed
    ]);

    const cols = ['agent_code','program_id','persistency_month',
                  'period_start','period_end','policies_due','policies_renewed'];
    const typeMap = {
      program_id:'int', persistency_month:'int',
      policies_due:'int', policies_renewed:'int',
      period_start:'date', period_end:'date'
    };

    const count = await bulkInsertTyped(
      'ins_persistency_data', cols, typeMap, mapped,
      `ON CONFLICT (agent_code, program_id, persistency_month, period_start)
       DO UPDATE SET policies_due=EXCLUDED.policies_due,
       policies_renewed=EXCLUDED.policies_renewed`
    );

    res.json({ success: true, inserted: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/upload/incentive-rates:
 *   post:
 *     tags: [Data Upload]
 *     summary: Upload incentive rates CSV
 *     description: |
 *       Parses an uploaded CSV file of product-level incentive rates and inserts them
 *       into `ins_incentive_rates`. Each row maps a product, channel, policy year, and
 *       transaction type to a commission or bonus rate, optionally bounded by premium
 *       slabs and policy term ranges.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, programId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file (max 20 MB)
 *               programId:
 *                 type: integer
 *                 description: Incentive program ID the rates belong to
 *                 example: 10
 *     responses:
 *       200:
 *         description: Upload summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               inserted: 156
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/incentive-rates', upload.single('file'), async (req, res) => {
  try {
    const { programId } = req.body;
    const rows = await parseCSV(req.file.buffer);

    // Pre-fetch channel lookup
    const channelRows = await query(`SELECT id, name FROM channels`);
    const channelMap = new Map(channelRows.filter(r => r.name).map(r => [r.name.toUpperCase(), r.id]));

    const mapped = rows.map(r => {
      const channelId = r.channel_code ? channelMap.get(r.channel_code.toUpperCase()) || null : null;
      return [
        programId, r.product_code, channelId,
        r.policy_year, r.transaction_type, r.rate_type,
        r.incentive_rate, r.min_premium_slab || 0,
        r.max_premium_slab || 999999999,
        r.min_policy_term || 0, r.max_policy_term || 99,
        r.effective_from, r.effective_to || null, true
      ];
    });

    const cols = ['program_id','product_code','channel_id','policy_year',
                  'transaction_type','rate_type','incentive_rate',
                  'min_premium_slab','max_premium_slab','min_policy_term',
                  'max_policy_term','effective_from','effective_to','is_active'];
    const typeMap = {
      program_id:'int', channel_id:'int', policy_year:'int',
      incentive_rate:'numeric', min_premium_slab:'numeric',
      max_premium_slab:'numeric', min_policy_term:'int',
      max_policy_term:'int', effective_from:'date', effective_to:'date',
      is_active:'boolean'
    };

    const count = await bulkInsertTyped('ins_incentive_rates', cols, typeMap, mapped, '');
    res.json({ success: true, inserted: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
