import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';

const router = Router();

/**
 * POST /api/auth/system-token
 *
 * Issues a JWT for system-to-system API calls.
 *
 * Body: { client_id, client_secret }
 *
 * Steps:
 *  1. Lookup client_id in api_clients
 *  2. Verify client_secret against stored bcrypt hash
 *  3. Generate JWT with { client_id, type: 'SYSTEM' }
 *  4. Expiry: 24 hours
 *  5. Return { token, expires_at }
 */
router.post('/system-token', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({ error: 'client_id and client_secret are required' });
    }

    // 1. Lookup client
    const rows = await query(
      'SELECT id, client_id, client_name, client_secret_hash, is_active FROM api_clients WHERE client_id = $1',
      [client_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid client_id or client_secret' });
    }

    const client = rows[0];

    if (!client.is_active) {
      return res.status(401).json({ error: 'CLIENT_DISABLED', message: 'Client account is deactivated' });
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
