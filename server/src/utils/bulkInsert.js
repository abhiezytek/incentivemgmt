import pool from '../db/pool.js';

export async function bulkInsert(tableName, columns, rows, onConflict = '') {
  if (!rows.length) return 0;

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

  const colArrays = columns.map((_, ci) => rows.map(row => row[ci] ?? null));
  const params = columns.map((col, i) => `$${i + 1}::${typeMap[col] || 'text'}[]`);

  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    SELECT * FROM UNNEST(${params.join(', ')}) AS t(${columns.join(', ')})
    ${onConflict}
  `;

  const result = await pool.query(sql, colArrays);
  return result.rowCount;
}
