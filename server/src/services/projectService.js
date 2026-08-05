// Single source of truth for project business logic.
// Both the Express REST routes and the MCP tool handlers call these
// functions directly, so there is exactly one implementation of
// "how to create a project" no matter which front door was used.
import { query } from '../db.js';
import { isTeamMember } from './teamService.js';

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

export async function createProject(userId, { name, description = '', teamId }) {
  if (!name || !name.trim()) {
    throw new Error('Project name is required');
  }
  if (!teamId) {
    throw new Error('teamId is required');
  }
  if (!(await isTeamMember(userId, teamId))) {
    throw new Error('Team not found');
  }
  const { rows } = await query(
    'INSERT INTO projects (user_id, name, description, team_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, name.trim(), description, teamId]
  );
  return rows[0];
}

export async function updateProject(userId, id, { name, description, teamId }) {
  const existing = await getProject(userId, id);
  if (!existing) return null;

  if (teamId !== undefined && !(await isTeamMember(userId, teamId))) {
    throw new Error('Team not found');
  }

  const { rows } = await query(
    'UPDATE projects SET name = $1, description = $2, team_id = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
    [name ?? existing.name, description ?? existing.description, teamId ?? existing.team_id, id, userId]
  );
  return rows[0];
}

export async function deleteProject(userId, id) {
  const { rowCount } = await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}
