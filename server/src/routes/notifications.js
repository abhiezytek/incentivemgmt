import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notification events
 *     description: >
 *       Returns notification events ordered by creation date. Supports
 *       filtering by read status and event type.
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Notification list
 */
router.get('/', async (req, res) => {
  try {
    const { unreadOnly, type, limit = 20, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (unreadOnly === 'true') {
      conditions.push(`is_read = FALSE`);
    }
    if (type) {
      params.push(type);
      conditions.push(`event_type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Number(limit));
    const limitIdx = params.length;
    params.push(Number(offset));
    const offsetIdx = params.length;

    const rows = await query(
      `SELECT * FROM notification_events ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const countRows = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER(WHERE is_read = FALSE)::int AS unread
       FROM notification_events ${where}`,
      countParams
    );

    res.json({
      rows,
      total: countRows[0]?.total || 0,
      unread: countRows[0]?.unread || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE notification_events SET is_read = TRUE WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const result = await query(
      `UPDATE notification_events SET is_read = TRUE WHERE is_read = FALSE`
    );
    res.json({ success: true, updated: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
