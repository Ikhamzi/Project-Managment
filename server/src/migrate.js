// Applies migrations/001_init.sql against DATABASE_URL.
// Docker's postgres image runs this file automatically on first boot;
// this script exists so you can also run `npm run migrate` by hand
// (e.g. against a Render-managed Postgres instance that starts empty).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('Migration applied successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
