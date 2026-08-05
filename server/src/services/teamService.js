// Single source of truth for team business logic, shared by the REST
// routes and the MCP tool handlers - same pattern as projectService.js
// and taskService.js.
//
// Teams are the authorization boundary for everything ticket-related:
// projects and tickets carry a team_id, and ticketService/commentService/
// statsService all check isTeamMember(userId, teamId) before letting a
// user touch anything scoped to that team.
import { query } from '../db.js';
import { getUserByEmail } from './userService.js';

export async function listTeams(userId) {
  const { rows } = await query(
    `SELECT t.* FROM teams t
     JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getTeam(id) {
  const { rows } = await query('SELECT * FROM teams WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function isTeamMember(userId, teamId) {
  const { rows } = await query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
  return rows.length > 0;
}

export async function listTeamMembers(teamId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, tm.created_at AS joined_at
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY tm.created_at ASC`,
    [teamId]
  );
  return rows;
}

export async function createTeam(userId, { name }) {
  if (!name || !name.trim()) {
    throw new Error('Team name is required');
  }

  const { rows } = await query('INSERT INTO teams (name) VALUES ($1) RETURNING *', [name.trim()]);
  const team = rows[0];
  await query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)', [team.id, userId]);
  return team;
}

export async function addTeamMember(userId, teamId, { email }) {
  if (!email || !email.trim()) {
    throw new Error('email is required');
  }
  if (!(await isTeamMember(userId, teamId))) {
    throw new Error('Team not found');
  }

  const member = await getUserByEmail(email.trim());
  if (!member) {
    throw new Error(`No account found for ${email}. They need to sign in to the web app at least once first.`);
  }

  await query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
    teamId,
    member.id,
  ]);
  return listTeamMembers(teamId);
}
