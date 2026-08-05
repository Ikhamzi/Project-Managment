import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

// Keep DATE columns as plain 'YYYY-MM-DD' strings instead of pg's default
// conversion to a JS Date (which shifts by timezone and serializes to a
// full ISO timestamp). The frontend's <input type="date"> and due-date
// comparisons both expect the plain string form.
types.setTypeParser(1082, (val) => val);

// Render's external Postgres endpoint (the one you'd connect to from your
// own machine, e.g. to run the MCP server against production data)
// requires SSL; its internal endpoint and local Docker Postgres don't
// need or support it, so only turn SSL on for non-local hosts.
const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

export async function query(text, params) {
  return pool.query(text, params);
}
