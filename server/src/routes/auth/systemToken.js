import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { ERRORS, apiError } from '../../utils/errorCodes.js';

const router = Router();

/**
 * @swagger
 * /api/auth/system-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Issue a system-to-system JWT
 *     description: >
 *       Validates API-client credentials and returns a signed JWT for
 *       machine-to-machine communication. The token is valid for 24 hours.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - client_secret
 *             properties:
 *               client_id:
 *                 type: string
 *                 example: ins-claims-service
 *               client_secret:
 *                 type: string
 *                 example: s3cr3t-k3y-value
 *     responses:
 *       200:
 *         description: JWT issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-11T18:30:00.000Z"
 *       400:
 *         description: Missing required credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: client_id and client_secret are required
 *       401:
 *         description: Invalid credentials or disabled client
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: INVALID_CREDENTIALS
 *                 message:
 *                   type: string
 *                   example: Invalid client_id or client_secret
 *       500:
 *         description: Server configuration or internal error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to generate system token
 */
router.post('/system-token', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      return res.status(ERRORS.VAL_001.status).json(apiError('VAL_001', { fields: 'client_id, client_secret' }));
    }

    // 1. Lookup client
    const rows = await query(
      'SELECT id, client_id, client_name, client_secret_hash, is_active FROM api_clients WHERE client_id = $1',
      [client_id]
    );

    if (rows.length === 0) {
      return res.status(ERRORS.AUTH_005.status).json(apiError('AUTH_005'));
    }

    const client = rows[0];

    if (!client.is_active) {
      return res.status(ERRORS.AUTH_006.status).json(apiError('AUTH_006'));
    }

    // 2. Verify secret
    const valid = await bcrypt.compare(client_secret, client.client_secret_hash);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid client_id or client_secret' });
    }

    // 3 & 4. Generate JWT — 24-hour expiry
    const secret = process.env.SYSTEM_JWT_SECRET;
    if (!secret) {
      console.error('[systemToken] SYSTEM_JWT_SECRET is not configured');
      return res.status(500).json({ error: 'SERVER_CONFIG_ERROR', message: 'System authentication is not configured' });
    }

    const expiresInSec = 24 * 60 * 60; // 24 hours
    const token = jwt.sign(
      { client_id: client.client_id, type: 'SYSTEM' },
      secret,
      { expiresIn: expiresInSec }
    );

    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // 5. Return token
    res.json({ token, expires_at: expiresAt });
  } catch (err) {
    console.error('[systemToken] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate system token' });
  }
});

export default router;
