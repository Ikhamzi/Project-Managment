import { query } from '../db.js';

export async function findOrCreateGoogleUser({ googleId, email, name, avatarUrl }) {
  const existing = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const { rows } = await query(
    `INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *`,
    [googleId, email, name, avatarUrl]
  );
  return rows[0];
}

export async function getUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}
