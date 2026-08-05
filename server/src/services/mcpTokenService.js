// Personal access tokens that let a signed-up user connect their own AI
// client to the remote MCP server (POST /mcp) as themselves, without any
// developer-side config. Token format mirrors GitHub/GitLab PATs: a
// random secret is shown once at creation time, and only its SHA-256
// hash is ever stored, so a leaked database dump doesn't hand out usable
// tokens.
import crypto from 'node:crypto';
import { query } from '../db.js';

const TOKEN_PREFIX = 'tmcp_';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createToken(userId, label) {
  const secret = crypto.randomBytes(32).toString('base64url');
  const token = `${TOKEN_PREFIX}${secret}`;
  const { rows } = await query(
    `INSERT INTO mcp_tokens (user_id, token_hash, label) VALUES ($1, $2, $3)
     RETURNING id, label, created_at`,
    [userId, hashToken(token), label?.trim() || 'MCP token']
  );
  return { ...rows[0], token };
}

export async function listTokens(userId) {
  const { rows } = await query(
    `SELECT id, label, created_at, last_used_at FROM mcp_tokens
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function revokeToken(userId, tokenId) {
  await query('DELETE FROM mcp_tokens WHERE id = $1 AND user_id = $2', [tokenId, userId]);
}

export async function resolveUserIdFromToken(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;

  const { rows } = await query('SELECT id, user_id FROM mcp_tokens WHERE token_hash = $1', [hashToken(token)]);
  const row = rows[0];
  if (!row) return null;

  query('UPDATE mcp_tokens SET last_used_at = now() WHERE id = $1', [row.id]).catch(() => {});
  return row.user_id;
}
