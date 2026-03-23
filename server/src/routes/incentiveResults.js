import { Router } from 'express';
import { query } from '../db/pool.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();

/**
 * @swagger
 * /api/incentive-results/stage-summary:
 *   get:
 *     tags:
 *       - Incentive Results
 *     summary: Pipeline stage counts
 *     description: >
 *       Returns the count of incentive results and total incentive amount
 *       grouped by pipeline status (DRAFT, APPROVED, INITIATED, PAID).
 *       Useful for rendering the pipeline / funnel view.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema:
 *           type: integer
 *         description: Filter by incentive program ID
 *         example: 12
 *       - in: query
 *         name: periodStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by incentive period start date
 *         example: "2025-01-01"
 *     responses:
 *       200:
 *         description: Status-keyed map of count and total incentive amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: integer
 *                   total:
 *                     type: number
 *             example:
 *               DRAFT:
 *                 count: 45
 *                 total: 182500.00
 *               APPROVED:
 *                 count: 30
 *                 total: 125000.00
 *               INITIATED:
 *                 count: 12
 *                 total: 54000.00
 *               PAID:
 *                 count: 85
 *                 total: 340000.00
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Database connection failed"
 */
router.get('/stage-summary', async (req, res) => {
  try {
    const { programId, periodStart } = req.query;
    const conditions = [];
    const params = [];
    if (programId) { params.push(programId); conditions.push(`program_id = $${params.length}`); }
    if (periodStart) { params.push(periodStart); conditions.push(`period_start = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_incentive),0) AS total
       FROM ins_incentive_results ${where}
       GROUP BY status`,
      params
    );

    const summary = {};
    for (const r of rows) {
      summary[r.status] = { count: r.count, total: Number(r.total) };
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results/summary:
 *   get:
 *     tags:
 *       - Incentive Results
 *     summary: Channel summary
 *     description: >
 *       Returns aggregate incentive totals grouped by distribution channel
 *       for the specified program and period. Includes agent count, total
 *       pool, average incentive, and count of paid agents per channel.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Incentive program ID
 *         example: 12
 *       - in: query
 *         name: periodStart
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Incentive period start date
 *         example: "2025-01-01"
 *     responses:
 *       200:
 *         description: Array of per-channel incentive summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   channel:
 *                     type: string
 *                   agent_count:
 *                     type: integer
 *                   total_pool:
 *                     type: number
 *                   avg_incentive:
 *                     type: number
 *                   paid_count:
 *                     type: integer
 *             example:
 *               - channel: "Bancassurance"
 *                 agent_count: 48
 *                 total_pool: 245000.00
 *                 avg_incentive: 5104.17
 *                 paid_count: 30
 *               - channel: "Agency"
 *                 agent_count: 32
 *                 total_pool: 160000.00
 *                 avg_incentive: 5000.00
 *                 paid_count: 20
 *       400:
 *         description: Missing required query parameters
 *         content:
 *           application/json:
 *             example:
 *               error: "programId and periodStart are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/summary', async (req, res) => {
  try {
    const { programId, periodStart } = req.query;
    if (!programId || !periodStart) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'programId, periodStart' }));
    }

    const rows = await query(
      `SELECT c.name AS channel,
              COUNT(*)::int AS agent_count,
              SUM(r.total_incentive) AS total_pool,
              AVG(r.total_incentive) AS avg_incentive,
              SUM(CASE WHEN r.status = 'PAID' THEN 1 ELSE 0 END)::int AS paid_count
       FROM ins_incentive_results r
       JOIN ins_agents a ON a.agent_code = r.agent_code
       JOIN channels c ON c.id = a.channel_id
       WHERE r.program_id = $1 AND r.period_start = $2
       GROUP BY c.name
       ORDER BY total_pool DESC`,
      [programId, periodStart]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results:
 *   get:
 *     tags:
 *       - Incentive Results
 *     summary: List incentive results
 *     description: >
 *       Returns a filtered list of incentive results with joined agent,
 *       channel, region, and program details. All filter parameters are
 *       optional; omitting all filters returns every result.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema:
 *           type: integer
 *         description: Filter by incentive program ID
 *         example: 12
 *       - in: query
 *         name: periodStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by period start date
 *         example: "2025-01-01"
 *       - in: query
 *         name: channel
 *         schema:
 *           type: integer
 *         description: Filter by channel ID
 *         example: 3
 *       - in: query
 *         name: region
 *         schema:
 *           type: integer
 *         description: Filter by region ID
 *         example: 7
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, APPROVED, INITIATED, PAID]
 *         description: Filter by result status
 *         example: "APPROVED"
 *     responses:
 *       200:
 *         description: Array of incentive result objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   agent_code:
 *                     type: string
 *                   agent_name:
 *                     type: string
 *                   channel_name:
 *                     type: string
 *                   region_name:
 *                     type: string
 *                   program_name:
 *                     type: string
 *                   total_incentive:
 *                     type: number
 *                   status:
 *                     type: string
 *             example:
 *               - id: 1024
 *                 agent_code: "AGT-00451"
 *                 agent_name: "Priya Sharma"
 *                 channel_name: "Bancassurance"
 *                 region_name: "WEST"
 *                 program_name: "Q1 2025 Life Sales"
 *                 total_incentive: 12500.00
 *                 status: "APPROVED"
 *               - id: 1025
 *                 agent_code: "AGT-00322"
 *                 agent_name: "Rajesh Kumar"
 *                 channel_name: "Agency"
 *                 region_name: "NORTH"
 *                 program_name: "Q1 2025 Life Sales"
 *                 total_incentive: 9800.00
 *                 status: "DRAFT"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.get('/', async (req, res) => {
  try {
    const { programId, periodStart, channel, region, status } = req.query;

    const conditions = [];
    const params = [];

    if (programId) {
      params.push(programId);
      conditions.push(`r.program_id = $${params.length}`);
    }
    if (periodStart) {
      params.push(periodStart);
      conditions.push(`r.period_start = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (channel) {
      params.push(channel);
      conditions.push(`a.channel_id = $${params.length}`);
    }
    if (region) {
      params.push(region);
      conditions.push(`a.region_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT r.*,
              a.agent_name, c.name AS channel_name, rg.region_code AS region_name,
              p.name AS program_name
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       LEFT JOIN channels c ON c.id = a.channel_id
       LEFT JOIN ins_regions rg ON rg.id = a.region_id
       LEFT JOIN incentive_programs p ON p.id = r.program_id
       ${where}
       ORDER BY r.total_incentive DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results/bulk-approve:
 *   post:
 *     tags:
 *       - Incentive Results
 *     summary: Bulk approve DRAFT results
 *     description: >
 *       Moves DRAFT incentive results to APPROVED status for results that
 *       have passed the persistency gate. Supply specific IDs to approve
 *       individual records, or provide programId + periodStart to approve
 *       all eligible DRAFT results for that program period. Results that
 *       failed the persistency gate are skipped and counted separately.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Specific result IDs to approve (optional)
 *               programId:
 *                 type: integer
 *                 description: Program ID (required when ids not provided)
 *               periodStart:
 *                 type: string
 *                 format: date
 *                 description: Period start date (required when ids not provided)
 *               approvedBy:
 *                 type: string
 *                 description: Username of the approver
 *           example:
 *             programId: 12
 *             periodStart: "2025-01-01"
 *             approvedBy: "manager.rao"
 *     responses:
 *       200:
 *         description: Approval result counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 approved:
 *                   type: integer
 *                 skipped_gate_failed:
 *                   type: integer
 *                 approvedCount:
 *                   type: integer
 *             example:
 *               approved: 38
 *               skipped_gate_failed: 7
 *               approvedCount: 38
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             example:
 *               error: "programId and periodStart are required when ids not provided"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/bulk-approve', async (req, res) => {
  try {
    const { ids, programId, periodStart, approvedBy } = req.body;

    let rows;
    if (Array.isArray(ids) && ids.length > 0) {
      rows = await query(
        `UPDATE ins_incentive_results
         SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
         WHERE id = ANY($2::int[])
           AND status = 'DRAFT' AND persistency_gate_passed = TRUE
         RETURNING id`,
        [approvedBy || null, ids]
      );

      const skippedRows = await query(
        `SELECT COUNT(*)::int AS cnt FROM ins_incentive_results
         WHERE id = ANY($1::int[]) AND status = 'DRAFT' AND persistency_gate_passed = FALSE`,
        [ids]
      );
      const skipped = skippedRows[0]?.cnt || 0;
      return res.json({ approved: rows.length, skipped_gate_failed: skipped });
    }

    if (!programId || !periodStart) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'programId, periodStart' }));
    }

    const skippedRows = await query(
      `SELECT COUNT(*)::int AS cnt FROM ins_incentive_results
       WHERE program_id = $1 AND period_start = $2
         AND status = 'DRAFT' AND persistency_gate_passed = FALSE`,
      [programId, periodStart]
    );
    const skipped = skippedRows[0]?.cnt || 0;

    rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE program_id = $2 AND period_start = $3
         AND status = 'DRAFT' AND persistency_gate_passed = TRUE
       RETURNING id`,
      [approvedBy || null, programId, periodStart]
    );

    res.json({ approved: rows.length, skipped_gate_failed: skipped, approvedCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results/initiate-payment:
 *   post:
 *     tags:
 *       - Incentive Results
 *     summary: Initiate payment for approved results
 *     description: >
 *       Moves APPROVED incentive results to INITIATED status and creates
 *       entries in the payout disbursement log with the payment reference.
 *       Only results currently in APPROVED status will be transitioned.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Result IDs to initiate payment for
 *               paymentReference:
 *                 type: string
 *                 description: Bank or payment gateway reference
 *               paidBy:
 *                 type: string
 *                 description: Username of the person initiating payment
 *           example:
 *             ids: [1024, 1025, 1030]
 *             paymentReference: "NEFT-2025-Q1-BATCH-042"
 *             paidBy: "finance.singh"
 *     responses:
 *       200:
 *         description: Number of results moved to INITIATED
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *             example:
 *               count: 3
 *       400:
 *         description: Invalid or missing ids array
 *         content:
 *           application/json:
 *             example:
 *               error: "ids array is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/initiate-payment', async (req, res) => {
  try {
    const { ids, paymentReference, paidBy } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { field: 'ids' }));
    }

    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'INITIATED'
       WHERE id = ANY($1::int[]) AND status = 'APPROVED'
       RETURNING id`,
      [ids]
    );

    if (rows.length > 0) {
      const resultIds = rows.map((r) => r.id);
      const values = resultIds.map((_, i) =>
        `($${i + 1}, NOW(), $${resultIds.length + 1}, $${resultIds.length + 2})`
      ).join(', ');
      await query(
        `INSERT INTO payout_disbursement_log (result_id, paid_at, paid_by, payment_reference)
         VALUES ${values}`,
        [...resultIds, paidBy || null, paymentReference || null]
      );
    }

    res.json({ count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results/mark-paid:
 *   post:
 *     tags:
 *       - Incentive Results
 *     summary: Mark initiated results as paid
 *     description: >
 *       Moves INITIATED incentive results to PAID status and logs each
 *       payment in the payout disbursement log. Supply specific IDs to
 *       mark individual records, or provide programId + periodStart to
 *       mark all INITIATED results for that program period.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Specific result IDs to mark as paid (optional)
 *               programId:
 *                 type: integer
 *                 description: Program ID (required when ids not provided)
 *               periodStart:
 *                 type: string
 *                 format: date
 *                 description: Period start date (required when ids not provided)
 *               paidBy:
 *                 type: string
 *                 description: Username of the person confirming payment
 *           example:
 *             ids: [1024, 1025, 1030]
 *             paidBy: "finance.singh"
 *     responses:
 *       200:
 *         description: Number of results marked as paid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paid:
 *                   type: integer
 *                 paidCount:
 *                   type: integer
 *             example:
 *               paid: 3
 *               paidCount: 3
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             example:
 *               error: "ids or (programId + periodStart) required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/mark-paid', async (req, res) => {
  try {
    const { ids, programId, periodStart, paidBy } = req.body;

    let rows;
    if (Array.isArray(ids) && ids.length > 0) {
      rows = await query(
        `UPDATE ins_incentive_results
         SET status = 'PAID'
         WHERE id = ANY($1::int[]) AND status = 'INITIATED'
         RETURNING id`,
        [ids]
      );
    } else if (programId && periodStart) {
      rows = await query(
        `UPDATE ins_incentive_results
         SET status = 'PAID'
         WHERE program_id = $1 AND period_start = $2 AND status = 'INITIATED'
         RETURNING id`,
        [programId, periodStart]
      );
    } else {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'ids or programId + periodStart' }));
    }

    if (rows.length > 0) {
      const resultIds = rows.map((r) => r.id);
      const values = resultIds.map((_, i) => `($${i + 1}, NOW(), $${resultIds.length + 1})`).join(', ');
      await query(
        `INSERT INTO payout_disbursement_log (result_id, paid_at, paid_by)
         VALUES ${values}`,
        [...resultIds, paidBy || null]
      );
    }

    res.json({ paid: rows.length, paidCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/incentive-results/{id}/approve:
 *   post:
 *     tags:
 *       - Incentive Results
 *     summary: Approve a single result
 *     description: >
 *       Moves a single incentive result from DRAFT to APPROVED status.
 *       Returns 404 if the result does not exist or is no longer in
 *       DRAFT status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Incentive result ID
 *         example: 1024
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvedBy:
 *                 type: string
 *                 description: Username of the approver
 *           example:
 *             approvedBy: "manager.rao"
 *     responses:
 *       200:
 *         description: Result approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: integer
 *                 status:
 *                   type: string
 *             example:
 *               success: true
 *               id: 1024
 *               status: "APPROVED"
 *       404:
 *         description: Result not found or already approved
 *         content:
 *           application/json:
 *             example:
 *               error: "Result not found or already approved"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Database connection failed"
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body || {};
    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_by = $2, approved_at = NOW()
       WHERE id = $1 AND status = 'DRAFT'
       RETURNING id, status`,
      [id, approvedBy || null]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Result not found or already approved' });
    }

    res.json({ success: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
