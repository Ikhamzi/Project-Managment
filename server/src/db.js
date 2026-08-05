import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

// Keep DATE columns as plain 'YYYY-MM-DD' strings instead of pg's default
// conversion to a JS Date (which shifts by timezone and serializes to a
// full ISO timestamp). The frontend's <input type="date"> and due-date
// comparisons both expect the plain string form.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params) {
  return pool.query(text, params);
}
