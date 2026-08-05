// Standalone entry point for `npm run migrate` - useful for running the
// migration by hand against any DATABASE_URL. index.js runs the same
// logic automatically on every boot, so this script isn't required for
// deploys; it's here for manual/local use.
import { pool } from './db.js';
import { runMigrations } from './runMigrations.js';

try {
  await runMigrations();
  console.log('Migration applied successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
