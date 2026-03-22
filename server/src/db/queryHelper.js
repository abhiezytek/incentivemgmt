import { query } from './pool.js';

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a SQL identifier (table or column name) is safe.
 * Only allows letters, digits, and underscores — no special characters.
 */
const assertIdentifier = (name, label = 'identifier') => {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Invalid ${label}: ${name}`);
  }
};

/**
 * SELECT rows from a table with optional WHERE conditions.
 * @param {string} table  - Table name
 * @param {object} conditions - Key/value pairs for WHERE clause (ANDed)
 * @param {string} orderBy - Column to ORDER BY (default 'id')
 * @returns {Promise<Array>} Matched rows
 */
export const findAll = async (table, conditions = {}, orderBy = 'id') => {
  assertIdentifier(table, 'table name');
  assertIdentifier(orderBy, 'orderBy column');

  const keys = Object.keys(conditions);
  keys.forEach((k) => assertIdentifier(k, 'column name'));
  const values = Object.values(conditions);

  let text = `SELECT * FROM ${table}`;
  if (keys.length > 0) {
    const whereClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    text += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  text += ` ORDER BY ${orderBy}`;

  return query(text, values);
};

/**
 * SELECT a single row by its primary key.
 * @param {string} table - Table name
 * @param {number|string} id - Primary key value
 * @returns {Promise<object|undefined>} The row, or undefined
 */
export const findById = async (table, id) => {
  assertIdentifier(table, 'table name');
  const text = `SELECT * FROM ${table} WHERE id = $1`;
  const rows = await query(text, [id]);
  return rows[0];
};

/**
 * INSERT a row and return the created record.
 * @param {string} table - Table name
 * @param {object} dataObject - Column/value pairs to insert
 * @returns {Promise<object>} The inserted row
 */
export const insertRow = async (table, dataObject) => {
  assertIdentifier(table, 'table name');
  const keys = Object.keys(dataObject);
  keys.forEach((k) => assertIdentifier(k, 'column name'));
  const values = Object.values(dataObject);
  const placeholders = keys.map((_, i) => `$${i + 1}`);

  const text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const rows = await query(text, values);
  return rows[0];
};

/**
 * UPDATE a row by id and return the updated record.
 * @param {string} table - Table name
 * @param {number|string} id - Primary key value
 * @param {object} dataObject - Column/value pairs to update
 * @returns {Promise<object|undefined>} The updated row, or undefined
 */
export const updateRow = async (table, id, dataObject) => {
  assertIdentifier(table, 'table name');
  const keys = Object.keys(dataObject);
  keys.forEach((k) => assertIdentifier(k, 'column name'));
  const values = Object.values(dataObject);

  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
  const text = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`;
  const rows = await query(text, [...values, id]);
  return rows[0];
};

/**
 * DELETE a row by id and return the deleted record.
 * @param {string} table - Table name
 * @param {number|string} id - Primary key value
 * @returns {Promise<object|undefined>} The deleted row, or undefined
 */
export const deleteRow = async (table, id) => {
  assertIdentifier(table, 'table name');
  const text = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
  const rows = await query(text, [id]);
  return rows[0];
};
