import { parse } from 'csv-parse';

const DATE_PATTERN = /date|_at$|_from$|_to$|period_start|period_end|effective/i;

/**
 * Parse a CSV file buffer into an array of row objects.
 *  - Headers are lower-cased and trimmed (used as object keys).
 *  - All values are trimmed; empty rows are skipped.
 *  - Columns whose header matches a date-like pattern are converted to
 *    ISO-8601 date strings (YYYY-MM-DD) when the value is a valid date.
 *
 * @param {Buffer} fileBuffer - Raw CSV file contents.
 * @returns {Promise<Array<Object>>} Parsed rows.
 */
export async function parseCSV(fileBuffer) {
  return new Promise((resolve, reject) => {
    const rows = [];

    const parser = parse(fileBuffer, {
      columns: (headers) =>
        headers.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      skip_records_with_empty_values: false,
      relax_column_count: true,
      bom: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // Skip rows where every value is empty
        const values = Object.values(record);
        if (values.every((v) => v === '' || v == null)) continue;

        // Convert date-like fields
        for (const key of Object.keys(record)) {
          if (DATE_PATTERN.test(key) && record[key]) {
            const d = new Date(record[key]);
            if (!Number.isNaN(d.getTime())) {
              record[key] = d.toISOString().slice(0, 10);
            }
          }
        }

        rows.push(record);
      }
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve(rows));
  });
}
