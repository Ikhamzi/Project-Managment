// Single source of truth for project business logic.
// Both the Express REST routes and the MCP tool handlers call these
// functions directly, so there is exactly one implementation of
// "how to create a project" no matter which front door was used.
import { query } from '../db.js';

// Every function is scoped by userId so one user can never read or
// modify another user's projects. The MCP server resolves a userId
// from MCP_USER_EMAIL once at startup and passes it through the same
// way the REST routes pass req.user.id.

export async function listProjects(userId) {
  const { rows } = await query(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

export async function getProject(userId, id) {
  const { rows } = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0] ?? null;
}

export async function createProject(userId, { name, description = '' }) {
  if (!name || !name.trim()) {
    throw new Error('Project name is required');
  }
  const { rows } = await query(
    'INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [userId, name.trim(), description]
  );
  return rows[0];
}

export async function updateProject(userId, id, { name, description }) {
  const existing = await getProject(userId, id);
  if (!existing) return null;

  const { rows } = await query(
    'UPDATE projects SET name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [name ?? existing.name, description ?? existing.description, id, userId]
  );
  return rows[0];
}

export async function deleteProject(userId, id) {
  const { rowCount } = await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}
