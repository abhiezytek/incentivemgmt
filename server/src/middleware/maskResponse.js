import { shouldMask, maskPolicyNumberInObject } from '../utils/dataMask.js';

// Paths that must NEVER be masked (finance export files need real numbers)
const SKIP_PREFIXES = ['/api/integration/export/'];

/**
 * Express middleware that intercepts res.json() and masks policy numbers
 * in the response body before sending.
 *
 * Skipped for:
 *  - /api/integration/export/* (Oracle/SAP payment files need real numbers)
 */
export default function maskResponse(req, res, next) {
  const path = req.originalUrl || req.url;

  // Skip export endpoints entirely — no masking overhead
  if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  // Save reference to original res.json
  const originalJson = res.json.bind(res);

  res.json = async function maskedJson(body) {
    try {
      const enabled = await shouldMask();
      if (enabled && body != null && typeof body === 'object') {
        return originalJson(maskPolicyNumberInObject(body));
      }
    } catch (err) {
      // On error, fall through and send unmasked — don't break the response
      console.error('[maskResponse] Masking error:', err.message);
    }
    return originalJson(body);
  };

  next();
}
