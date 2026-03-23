// ─────────────────────────────────────────────
// Centralised error codes
// ─────────────────────────────────────────────

export const ERRORS = {
  // ── Authentication ───────────────────────────
  AUTH_001: { code: 'AUTH_001', status: 401, message: 'Authentication token is required' },
  AUTH_002: { code: 'AUTH_002', status: 401, message: 'Token has expired' },
  AUTH_003: { code: 'AUTH_003', status: 401, message: 'Token is invalid' },
  AUTH_004: { code: 'AUTH_004', status: 403, message: 'Insufficient permissions' },
  AUTH_005: { code: 'AUTH_005', status: 401, message: 'System client not found' },
  AUTH_006: { code: 'AUTH_006', status: 403, message: 'System client is inactive' },
  AUTH_007: { code: 'AUTH_007', status: 403, message: 'Endpoint not permitted for this client' },

  // ── Validation ───────────────────────────────
  VAL_001: { code: 'VAL_001', status: 400, message: 'Required field missing' },
  VAL_002: { code: 'VAL_002', status: 400, message: 'Invalid date format (expected YYYY-MM-DD)' },
  VAL_003: { code: 'VAL_003', status: 400, message: 'Invalid enum value' },
  VAL_004: { code: 'VAL_004', status: 400, message: 'Value out of allowed range' },
  VAL_005: { code: 'VAL_005', status: 409, message: 'Duplicate record' },
  VAL_006: { code: 'VAL_006', status: 400, message: 'Referenced record not found' },
  VAL_007: { code: 'VAL_007', status: 400, message: 'CSV missing required columns' },
  VAL_008: { code: 'VAL_008', status: 413, message: 'File too large (max 20 MB)' },
  VAL_009: { code: 'VAL_009', status: 400, message: 'Invalid file type (CSV only)' },
  VAL_010: { code: 'VAL_010', status: 400, message: 'Persistency month must be 13, 25, 37, 49, or 61' },

  // ── Business Rules ───────────────────────────
  BUS_001: { code: 'BUS_001', status: 422, message: 'Program is not in ACTIVE status' },
  BUS_002: { code: 'BUS_002', status: 409, message: 'Overlapping program date range for this channel' },
  BUS_003: { code: 'BUS_003', status: 422, message: 'Cannot modify APPROVED or PAID incentive result' },
  BUS_004: { code: 'BUS_004', status: 404, message: 'Agent not found in hierarchy system' },
  BUS_005: { code: 'BUS_005', status: 409, message: 'Incentive already calculated for this period' },
  BUS_006: { code: 'BUS_006', status: 422, message: 'No payout rules defined for program' },
  BUS_007: { code: 'BUS_007', status: 422, message: 'No KPI rules defined for program' },
  BUS_008: { code: 'BUS_008', status: 422, message: 'Agent license has expired' },
  BUS_009: { code: 'BUS_009', status: 422, message: 'Product is not active' },
  BUS_010: { code: 'BUS_010', status: 422, message: 'Cannot approve — persistency gate failed' },

  // ── Integration ──────────────────────────────
  INT_001: { code: 'INT_001', status: 502, message: 'SFTP connection failed' },
  INT_002: { code: 'INT_002', status: 404, message: 'SFTP file not found' },
  INT_003: { code: 'INT_003', status: 409, message: 'File already processed (duplicate filename)' },
  INT_004: { code: 'INT_004', status: 422, message: 'Staging validation failed' },
  INT_005: { code: 'INT_005', status: 502, message: 'Hierarchy API unreachable' },
  INT_006: { code: 'INT_006', status: 504, message: 'Penta API request timed out' },
  INT_007: { code: 'INT_007', status: 500, message: 'Export file generation failed' },
  INT_008: { code: 'INT_008', status: 422, message: 'SAP FICO format error' },
  INT_009: { code: 'INT_009', status: 422, message: 'Oracle AP format error' },

  // ── Calculation ──────────────────────────────
  CALC_001: { code: 'CALC_001', status: 422, message: 'No performance data found for agent and period' },
  CALC_002: { code: 'CALC_002', status: 422, message: 'No incentive rate defined for product and channel' },
  CALC_003: { code: 'CALC_003', status: 409, message: 'Calculation already in progress for this program' },
  CALC_004: { code: 'CALC_004', status: 422, message: 'Target value is zero (division error)' },
  CALC_005: { code: 'CALC_005', status: 500, message: 'Agent hierarchy path is corrupted' },
};

// ─────────────────────────────────────────────
// Helper — build a standard error response body
// ─────────────────────────────────────────────

/**
 * Build a consistent API error response object.
 *
 * @param {string} code  One of the keys in ERRORS (e.g. 'AUTH_001').
 * @param {*}      [details=null]  Optional extra context (field name, list of
 *                                  missing columns, upstream error message, etc.).
 * @returns {{ success: false, error: string, code: string, details: * }}
 */
export const apiError = (code, details = null) => ({
  success: false,
  error: ERRORS[code].message,
  code,
  details,
});
