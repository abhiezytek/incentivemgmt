import { Router } from 'express';
import { query } from '../db/pool.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();

/**
 * @swagger
 * /api/exception-log:
 *   get:
 *     tags: [Exception Log]
 *     summary: List operational exceptions
 *     description: >
 *       Returns paginated operational exceptions with filtering by type,
 *       status, severity, source system, and search term. Exceptions are
 *       stored in the additive operational_exceptions table and represent
 *       data quality issues, integration errors, and calculation anomalies.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Exception type filter
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, INVESTIGATING, RESOLVED, DISMISSED] }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated exception list with summary counts
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, severity, source, search, limit = 25, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (type)     { params.push(type);     conditions.push(`exception_type = $${params.length}`); }
    if (status)   { params.push(status);   conditions.push(`status = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
    if (source)   { params.push(source);   conditions.push(`source_system = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(entity_id ILIKE $${params.length} OR description ILIKE $${params.length} OR exception_type ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Summary counts (unfiltered for cards)
    const summaryRows = await query(`
      SELECT
        COUNT(*) FILTER(WHERE status = 'OPEN')::int          AS open_count,
        COUNT(*) FILTER(WHERE status = 'RESOLVED' AND DATE(resolved_at) = CURRENT_DATE)::int AS resolved_today,
        COUNT(*) FILTER(WHERE severity = 'CRITICAL' AND status = 'OPEN')::int AS critical_count,
        COUNT(DISTINCT source_system)::int                   AS sources_affected,
        COUNT(*)::int                                         AS total_count
      FROM operational_exceptions
    `);

    // Paginated list
    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const rows = await query(
      `SELECT * FROM operational_exceptions
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    // Filtered count for pagination
    const countParams = params.slice(0, params.length - 2);
    const countRows = await query(
      `SELECT COUNT(*)::int AS cnt FROM operational_exceptions ${where}`,
      countParams
    );

    res.json({
      summary: summaryRows[0] || {},
      rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: countRows[0]?.cnt || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/exception-log/{id}:
 *   get:
 *     tags: [Exception Log]
 *     summary: Get exception detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Full exception detail
 *       404:
 *         description: Exception not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(`SELECT * FROM operational_exceptions WHERE id = $1`, [id]);

    if (!rows.length) {
      return res.status(404).json(apiError('VAL_006', { field: 'id' }));
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/exception-log/{id}/resolve:
 *   post:
 *     tags: [Exception Log]
 *     summary: Resolve an exception
 *     description: >
 *       Marks an operational exception as RESOLVED or DISMISSED with an
 *       optional resolution note. Only updates the additive
 *       operational_exceptions table.
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
 *               status: { type: string, enum: [RESOLVED, DISMISSED] }
 *               resolvedBy: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Exception resolved
 *       404:
 *         description: Exception not found
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'RESOLVED', resolvedBy, note } = req.body || {};

    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(ERRORS.VAL_003.status).json(apiError('VAL_003', { field: 'status', allowed: ['RESOLVED', 'DISMISSED'] }));
    }

    const rows = await query(
      `UPDATE operational_exceptions
       SET status = $2, resolved_by = $3, resolved_at = NOW(), resolution_note = $4
       WHERE id = $1 AND status NOT IN ('RESOLVED', 'DISMISSED')
       RETURNING *`,
      [id, status, resolvedBy || null, note || null]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Exception not found or already resolved' });
    }

    res.json({ success: true, exception: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
