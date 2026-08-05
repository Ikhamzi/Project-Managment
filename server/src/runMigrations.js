// Applies every file in migrations/, in filename order, against
// DATABASE_URL. Each one is written entirely with CREATE TABLE/COLUMN
// IF NOT EXISTS (or DROP-then-ADD for constraints), so it's safe to run
// on every boot - index.js does exactly that, which means deploying
// (e.g. to Render's free tier, which has no shell access) never needs a
// separate manual migration step.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

export async function runMigrations() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
  }
}
