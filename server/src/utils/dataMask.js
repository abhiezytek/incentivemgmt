import { query } from '../db/pool.js';

// ─────────────────────────────────────────────
// Policy-number key names to mask
// ─────────────────────────────────────────────
const POLICY_KEYS = new Set([
  'policy_number',
  'policy_no',
  'POLICY_NO',
  'POLICY_NUMBER',
  'policyNumber',
  'policyNo',
]);

// ─────────────────────────────────────────────
// shouldMask() — cached DB lookup
// ─────────────────────────────────────────────
let _maskCache = { value: null, expiresAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Read POLICY_MASK_ENABLED from system_config.
 * Result is cached for 5 minutes to avoid repeated DB calls.
 * Returns true when masking is enabled (default true on DB error).
 */
export async function shouldMask() {
  const now = Date.now();
  if (_maskCache.value !== null && now < _maskCache.expiresAt) {
    return _maskCache.value;
  }

  try {
    const rows = await query(
      "SELECT config_value FROM system_config WHERE config_key = 'POLICY_MASK_ENABLED'",
    );
    const enabled = rows.length > 0 && rows[0].config_value === 'TRUE';
    _maskCache = { value: enabled, expiresAt: now + CACHE_TTL_MS };
    return enabled;
  } catch (err) {
    console.error('[dataMask] Failed to read POLICY_MASK_ENABLED:', err.message);
    // Default to masking on error — safer to over-mask than leak data
    return true;
  }
}

// ─────────────────────────────────────────────
// maskPolicyNumber
// ─────────────────────────────────────────────

/**
 * Mask a policy number string.
 * Rule: show first 3 chars + asterisks + last 3 chars.
 * Short strings (≤6 chars) are fully replaced with asterisks.
 *
 * @param {string} policyNo
 * @returns {string}
 */
export function maskPolicyNumber(policyNo) {
  if (policyNo == null) return policyNo;
  const str = String(policyNo);
  if (str.length <= 6) {
    return '*'.repeat(str.length);
  }
  const first = str.slice(0, 3);
  const last = str.slice(-3);
  const middle = '*'.repeat(str.length - 6);
  return `${first}${middle}${last}`;
}

// ─────────────────────────────────────────────
// maskPolicyNumberInObject / InArray
// ─────────────────────────────────────────────

/**
 * Recursively mask any key that matches a policy-number field name.
 * Returns a new object (does not mutate the original).
 *
 * @param {*} obj
 * @returns {*}
 */
export function maskPolicyNumberInObject(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return maskPolicyNumberInArray(obj);

  const out = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (POLICY_KEYS.has(key) && (typeof val === 'string' || typeof val === 'number')) {
      out[key] = maskPolicyNumber(val);
    } else if (val != null && typeof val === 'object') {
      out[key] = Array.isArray(val)
        ? maskPolicyNumberInArray(val)
        : maskPolicyNumberInObject(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Map an array through maskPolicyNumberInObject.
 *
 * @param {Array} arr
 * @returns {Array}
 */
export function maskPolicyNumberInArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) =>
    item != null && typeof item === 'object'
      ? maskPolicyNumberInObject(item)
      : item,
  );
}
