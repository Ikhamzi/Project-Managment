// Applies migrations/001_init.sql against DATABASE_URL. The migration is
// written entirely with CREATE TABLE IF NOT EXISTS, so it's safe to run
// on every boot - index.js does exactly that, which means deploying
// (e.g. to Render's free tier, which has no shell access) never needs a
// separate manual migration step.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const sql = readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8');
  await pool.query(sql);
}
