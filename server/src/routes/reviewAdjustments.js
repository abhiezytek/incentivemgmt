import { Router } from 'express';
import { query } from '../db/pool.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();

/**
 * @swagger
 * /api/review-adjustments:
 *   get:
 *     tags: [Review & Adjustments]
 *     summary: List incentive results for review
 *     description: >
 *       Returns incentive results enriched with adjustment totals and hold
 *       status. Supports filtering by program, period, channel, status, and
 *       search term. Adjustments are aggregated from the additive
 *       incentive_adjustments table and never modify the original calculated
 *       values in ins_incentive_results.
 *     parameters:
 *       - in: query
 *         name: programId
 *         schema: { type: integer }
 *       - in: query
 *         name: periodStart
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: channel
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, APPROVED, INITIATED, PAID, HOLD] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by agent code or name
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Review results with adjustment data
 */
router.get('/', async (req, res) => {
  try {
    const { programId, periodStart, channel, status, search, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (programId)   { params.push(programId);   conditions.push(`r.program_id = $${params.length}`); }
    if (periodStart) { params.push(periodStart); conditions.push(`r.period_start = $${params.length}`); }
    if (channel)     { params.push(channel);     conditions.push(`a.channel_id = $${params.length}`); }
    if (status) {
      if (status === 'HOLD') {
        // HOLD is a virtual status — filter by existence of un-released hold adjustments
        conditions.push(`EXISTS (
          SELECT 1 FROM incentive_adjustments adj
          WHERE adj.result_id = r.id AND adj.adjustment_type = 'HOLD'
            AND NOT EXISTS (
              SELECT 1 FROM incentive_adjustments rel
              WHERE rel.result_id = r.id AND rel.adjustment_type = 'RELEASE'
                AND rel.created_at > adj.created_at
            )
        )`);
      } else {
        params.push(status);
        conditions.push(`r.status = $${params.length}`);
      }
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(a.agent_code ILIKE $${params.length} OR a.agent_name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch results with aggregated adjustments
    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const rows = await query(
      `SELECT r.id, r.agent_code, r.program_id, r.period_start, r.period_end,
              r.total_incentive AS calculated,
              r.net_self_incentive, r.total_override,
              r.status, r.persistency_gate_passed,
              a.agent_name, c.name AS channel_name, rg.region_code AS region_name,
              p.name AS program_name,
              COALESCE(adj.total_adjustment, 0) AS adjustment,
              COALESCE(adj.hold_count, 0) AS hold_count,
              r.total_incentive + COALESCE(adj.total_adjustment, 0) AS total_payout
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       LEFT JOIN channels c ON c.id = a.channel_id
       LEFT JOIN ins_regions rg ON rg.id = a.region_id
       LEFT JOIN incentive_programs p ON p.id = r.program_id
       LEFT JOIN LATERAL (
         SELECT SUM(CASE WHEN adjustment_type NOT IN ('HOLD','RELEASE') THEN adjustment_amount ELSE 0 END) AS total_adjustment,
                COUNT(*) FILTER(WHERE adjustment_type = 'HOLD') -
                COUNT(*) FILTER(WHERE adjustment_type = 'RELEASE') AS hold_count
         FROM incentive_adjustments WHERE result_id = r.id
       ) adj ON true
       ${where}
       ORDER BY r.total_incentive DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    // Summary cards
    const summaryRows = await query(
      `SELECT
         SUM(r.total_incentive) AS total_calculated,
         SUM(CASE WHEN EXISTS (
           SELECT 1 FROM incentive_adjustments h
           WHERE h.result_id = r.id AND h.adjustment_type = 'HOLD'
             AND NOT EXISTS (
               SELECT 1 FROM incentive_adjustments rel
               WHERE rel.result_id = r.id AND rel.adjustment_type = 'RELEASE'
                 AND rel.created_at > h.created_at
             )
         ) THEN r.total_incentive ELSE 0 END) AS total_held,
         COALESCE((SELECT SUM(adjustment_amount) FROM incentive_adjustments
           WHERE adjustment_type NOT IN ('HOLD','RELEASE')), 0) AS total_adjustments,
         SUM(r.total_incentive) +
           COALESCE((SELECT SUM(adjustment_amount) FROM incentive_adjustments
             WHERE adjustment_type NOT IN ('HOLD','RELEASE')), 0) AS net_payout,
         COUNT(*)::int AS total_count
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       ${where}`,
      params.slice(0, params.length - 2) // exclude limit/offset for summary
    );

    res.json({
      summary: summaryRows[0] || {},
      rows,
      pagination: { limit: Number(limit), offset: Number(offset), total: Number(summaryRows[0]?.total_count || 0) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/{id}:
 *   get:
 *     tags: [Review & Adjustments]
 *     summary: Get single result detail for review
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full result detail with adjustments and audit trail
 *       404:
 *         description: Result not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT r.*,
              a.agent_name, a.branch_code, a.hierarchy_level,
              c.name AS channel_name, rg.region_code AS region_name,
              p.name AS program_name,
              k.nb_achievement_pct, k.nb_total_premium, k.persistency_13m,
              k.nb_policy_count, k.nb_target_premium
       FROM ins_incentive_results r
       LEFT JOIN ins_agents a ON a.agent_code = r.agent_code
       LEFT JOIN channels c ON c.id = a.channel_id
       LEFT JOIN ins_regions rg ON rg.id = a.region_id
       LEFT JOIN incentive_programs p ON p.id = r.program_id
       LEFT JOIN ins_agent_kpi_summary k
         ON k.agent_code = r.agent_code AND k.program_id = r.program_id AND k.period_start = r.period_start
       WHERE r.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json(apiError('VAL_006', { field: 'id' }));
    }

    const adjustments = await query(
      `SELECT * FROM incentive_adjustments WHERE result_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const auditTrail = await query(
      `SELECT * FROM incentive_review_actions WHERE result_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ ...rows[0], adjustments, auditTrail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/{id}/adjust:
 *   post:
 *     tags: [Review & Adjustments]
 *     summary: Apply a manual adjustment
 *     description: >
 *       Stores a manual adjustment in the additive incentive_adjustments table.
 *       Does NOT modify the original calculated value in ins_incentive_results.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               reason: { type: string }
 *               notes: { type: string }
 *               adjustedBy: { type: string }
 *     responses:
 *       200:
 *         description: Adjustment recorded
 *       400:
 *         description: Missing amount
 *       404:
 *         description: Result not found
 */
router.post('/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, notes, adjustedBy } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { field: 'amount' }));
    }

    // Verify result exists
    const result = await query(`SELECT id, status FROM ins_incentive_results WHERE id = $1`, [id]);
    if (!result.length) {
      return res.status(404).json(apiError('VAL_006', { field: 'id' }));
    }

    // Cannot adjust PAID results
    if (result[0].status === 'PAID') {
      return res.status(ERRORS.BUS_003.status).json(apiError('BUS_003'));
    }

    // Insert adjustment (additive — never modifies ins_incentive_results)
    const adj = await query(
      `INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by, notes)
       VALUES ($1, $2, 'MANUAL', $3, $4, $5)
       RETURNING *`,
      [id, amount, reason || null, adjustedBy || null, notes || null]
    );

    // Record audit action
    await query(
      `INSERT INTO incentive_review_actions (result_id, action, actor, details)
       VALUES ($1, 'ADJUST', $2, $3)`,
      [id, adjustedBy || null, JSON.stringify({ amount, reason })]
    );

    res.json({ success: true, adjustment: adj[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/{id}/hold:
 *   post:
 *     tags: [Review & Adjustments]
 *     summary: Place a result on hold
 *     description: >
 *       Records a HOLD action in the additive adjustments table. Does NOT
 *       change the status column of ins_incentive_results (DRAFT→APPROVED→
 *       INITIATED→PAID pipeline remains intact).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *               heldBy: { type: string }
 *     responses:
 *       200:
 *         description: Hold recorded
 */
router.post('/:id/hold', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, heldBy } = req.body || {};

    const result = await query(`SELECT id, status FROM ins_incentive_results WHERE id = $1`, [id]);
    if (!result.length) {
      return res.status(404).json(apiError('VAL_006', { field: 'id' }));
    }

    await query(
      `INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
       VALUES ($1, 0, 'HOLD', $2, $3)`,
      [id, reason || null, heldBy || null]
    );

    await query(
      `INSERT INTO incentive_review_actions (result_id, action, actor, details)
       VALUES ($1, 'HOLD', $2, $3)`,
      [id, heldBy || null, JSON.stringify({ reason })]
    );

    res.json({ success: true, held: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/{id}/release:
 *   post:
 *     tags: [Review & Adjustments]
 *     summary: Release a held result
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               releasedBy: { type: string }
 *     responses:
 *       200:
 *         description: Hold released
 */
router.post('/:id/release', async (req, res) => {
  try {
    const { id } = req.params;
    const { releasedBy } = req.body || {};

    const result = await query(`SELECT id FROM ins_incentive_results WHERE id = $1`, [id]);
    if (!result.length) {
      return res.status(404).json(apiError('VAL_006', { field: 'id' }));
    }

    await query(
      `INSERT INTO incentive_adjustments (result_id, adjustment_amount, adjustment_type, reason, created_by)
       VALUES ($1, 0, 'RELEASE', 'Hold released', $2)`,
      [id, releasedBy || null]
    );

    await query(
      `INSERT INTO incentive_review_actions (result_id, action, actor, details)
       VALUES ($1, 'RELEASE', $2, '{}')`,
      [id, releasedBy || null]
    );

    res.json({ success: true, released: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/batch-approve:
 *   post:
 *     tags: [Review & Adjustments]
 *     summary: Batch approve results (delegates to existing bulk-approve)
 *     description: >
 *       Approves DRAFT results by delegating to the existing bulk-approve
 *       logic in incentiveResults.js. Also records audit trail entries in
 *       the additive incentive_review_actions table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids: { type: array, items: { type: integer } }
 *               approvedBy: { type: string }
 *     responses:
 *       200:
 *         description: Batch approval result
 */
router.post('/batch-approve', async (req, res) => {
  try {
    const { ids, approvedBy } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { field: 'ids' }));
    }

    // Check for held results — exclude them
    const heldRows = await query(
      `SELECT DISTINCT result_id FROM incentive_adjustments
       WHERE result_id = ANY($1::int[]) AND adjustment_type = 'HOLD'
         AND NOT EXISTS (
           SELECT 1 FROM incentive_adjustments rel
           WHERE rel.result_id = incentive_adjustments.result_id
             AND rel.adjustment_type = 'RELEASE'
             AND rel.created_at > incentive_adjustments.created_at
         )`,
      [ids]
    );
    const heldIds = new Set(heldRows.map(r => r.result_id));
    const eligibleIds = ids.filter(id => !heldIds.has(id));

    if (eligibleIds.length === 0) {
      return res.json({ approved: 0, skipped_held: heldIds.size, skipped_gate_failed: 0 });
    }

    // Delegate to existing approval logic (same as incentiveResults bulk-approve)
    const rows = await query(
      `UPDATE ins_incentive_results
       SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE id = ANY($2::int[])
         AND status = 'DRAFT' AND persistency_gate_passed = TRUE
       RETURNING id`,
      [approvedBy || null, eligibleIds]
    );

    const skippedGate = await query(
      `SELECT COUNT(*)::int AS cnt FROM ins_incentive_results
       WHERE id = ANY($1::int[]) AND status = 'DRAFT' AND persistency_gate_passed = FALSE`,
      [eligibleIds]
    );

    // Record audit trail for each approved result
    for (const row of rows) {
      await query(
        `INSERT INTO incentive_review_actions (result_id, action, actor, details)
         VALUES ($1, 'BATCH_APPROVE', $2, '{}')`,
        [row.id, approvedBy || null]
      );
    }

    res.json({
      approved: rows.length,
      skipped_held: heldIds.size,
      skipped_gate_failed: skippedGate[0]?.cnt || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/review-adjustments/{id}/audit:
 *   get:
 *     tags: [Review & Adjustments]
 *     summary: Get audit trail for a result
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Audit trail entries
 */
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;

    const actions = await query(
      `SELECT * FROM incentive_review_actions WHERE result_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const adjustments = await query(
      `SELECT * FROM incentive_adjustments WHERE result_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ actions, adjustments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
