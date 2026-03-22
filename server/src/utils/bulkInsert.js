import pool from '../db/pool.js';

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const TYPE_RE = /^[a-zA-Z_][a-zA-Z0-9_ ]*$/;

function assertIdentifier(name) {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
}

function assertType(type) {
  if (!TYPE_RE.test(type)) {
    throw new Error(`Invalid SQL type: ${type}`);
  }
}

export async function bulkInsert(tableName, columns, rows, onConflict = '') {
  if (!rows.length) return 0;

  assertIdentifier(tableName);
  columns.forEach(assertIdentifier);

  // Build column arrays for UNNEST
  const colArrays = columns.map((_, ci) => rows.map(row => row[ci] ?? null));
  const params = colArrays.map((_, i) => `$${i + 1}`);

  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    SELECT * FROM UNNEST(${params.map(p => `${p}::text[]`).join(', ')})
    AS t(${columns.join(', ')})
    ${onConflict}
  `;

  // Pass arrays as parameters
  const result = await pool.query(sql, colArrays);
  return result.rowCount;
}

// For typed inserts (more performant — use when column types known)
export async function bulkInsertTyped(tableName, columns, typeMap, rows, onConflict = '') {
  if (!rows.length) return 0;

  assertIdentifier(tableName);
  columns.forEach(assertIdentifier);

  const colArrays = columns.map((_, ci) => rows.map(row => row[ci] ?? null));
  const params = columns.map((col, i) => {
    const type = typeMap[col] || 'text';
    assertType(type);
    return `$${i + 1}::${type}[]`;
  });

  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    SELECT * FROM UNNEST(${params.join(', ')}) AS t(${columns.join(', ')})
    ${onConflict}
  `;

  const result = await pool.query(sql, colArrays);
  return result.rowCount;
}
