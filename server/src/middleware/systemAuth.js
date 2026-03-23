import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import pool from '../db/pool.js';

const SYSTEM_SECRET = () => process.env.SYSTEM_JWT_SECRET;

/**
 * Middleware for system-to-system API authentication.
 *
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT using SYSTEM_JWT_SECRET
 * 3. Validates token payload (client_id, type)
 * 4. Looks up client_id in api_clients — checks is_active
 * 5. Checks requested endpoint is in allowed_endpoints
 * 6. Updates api_clients.last_used_at
 * 7. Attaches client info to req.apiClient
 */
export default async function systemAuth(req, res, next) {
  try {
    // 1. Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'MISSING_TOKEN', message: 'Authorization header with Bearer token is required' });
    }

    const token = authHeader.slice(7);

    // 2. Verify JWT
    const secret = SYSTEM_SECRET();
    if (!secret) {
      console.error('[systemAuth] SYSTEM_JWT_SECRET is not configured');
      return res.status(500).json({ error: 'SERVER_CONFIG_ERROR', message: 'System authentication is not configured' });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return res.status(401).json({ error: code, message: err.message });
    }

    // 3. Validate payload fields
    if (!payload.client_id || payload.type !== 'SYSTEM') {
      return res.status(401).json({ error: 'INVALID_TOKEN_PAYLOAD', message: 'Token must contain client_id and type SYSTEM' });
    }

    // 4. Lookup client in api_clients
    const rows = await query(
      'SELECT id, client_id, client_name, allowed_endpoints, is_active FROM api_clients WHERE client_id = $1',
      [payload.client_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'UNKNOWN_CLIENT', message: 'Client not registered' });
    }

    const client = rows[0];

    if (!client.is_active) {
      return res.status(401).json({ error: 'CLIENT_DISABLED', message: 'Client account is deactivated' });
    }

    // 5. Check endpoint authorization
    const requestedPath = req.originalUrl || req.url;
    const allowed = client.allowed_endpoints || [];

    const isAllowed = allowed.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1); // remove trailing *
        return requestedPath.startsWith(prefix);
      }
      return requestedPath === pattern;
    });

    if (!isAllowed) {
      return res.status(401).json({ error: 'ENDPOINT_NOT_ALLOWED', message: `Client is not authorized for ${requestedPath}` });
    }

    // 6. Update last_used_at
    pool.query('UPDATE api_clients SET last_used_at = NOW() WHERE id = $1', [client.id]).catch((err) => {
      console.error('[systemAuth] Failed to update last_used_at:', err.message);
    });

    // 7. Attach client info to request
    req.apiClient = {
      id: client.id,
      client_id: client.client_id,
      client_name: client.client_name,
      allowed_endpoints: client.allowed_endpoints,
    };

    next();
  } catch (err) {
    console.error('[systemAuth] Unexpected error:', err.message);
    return res.status(500).json({ error: 'AUTH_ERROR', message: 'Authentication failed' });
  }
}
