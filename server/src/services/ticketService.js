// Ticket business logic, shared by the REST routes and the MCP tool
// handlers - same pattern as projectService.js and taskService.js.
//
// "Tickets" are rows in the same `tasks` table taskService.js uses (see
// migrations/002_teams_tickets.sql for why it wasn't renamed) - this
// module is the team-aware layer over that table: it reads/writes the
// newer columns (team_id, assignee_id, points, the widened status set)
// and authorizes by team membership instead of project ownership, so a
// ticket is only visible to/editable by members of its team.
import { query } from '../db.js';
import { isTeamMember } from './teamService.js';

export const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const POINTS = [1, 2, 3, 5, 8, 13];

// Every status transition a ticket goes through - used by
// statsService.getWeeklyStats to base "completed this week" on when a
// ticket actually moved into a terminal status, not just its current
// status. Also called from taskService.js, since legacy task tools
// write to the same underlying rows.
export async function recordStatusChange(ticketId, fromStatus, toStatus) {
  await query('INSERT INTO ticket_status_history (ticket_id, from_status, to_status) VALUES ($1, $2, $3)', [
    ticketId,
    fromStatus,
    toStatus,
  ]);
}

// Ticket if it exists, has a team, and userId is a member of that team;
// null otherwise (not found, no team, or not a member - deliberately
// not distinguished, same as taskService.getTask, so callers just 404).
export async function getTicket(userId, id) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
  const ticket = rows[0];
  if (!ticket || !ticket.team_id || !(await isTeamMember(userId, ticket.team_id))) {
    return null;
  }
  return ticket;
}

export async function listTickets(userId, { projectId, teamId, assigneeId, status } = {}) {
  const conditions = ['t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)'];
  const params = [userId];

  if (projectId) {
    params.push(projectId);
    conditions.push(`t.project_id = $${params.length}`);
  }
  if (teamId) {
    params.push(teamId);
    conditions.push(`t.team_id = $${params.length}`);
  }
  if (status) {
    if (!STATUSES.includes(status)) {
      throw new Error(`status must be one of ${STATUSES.join(', ')}`);
    }
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (assigneeId === 'unassigned') {
    conditions.push('t.assignee_id IS NULL');
  } else if (assigneeId !== undefined && assigneeId !== null) {
    params.push(assigneeId);
    conditions.push(`t.assignee_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT t.* FROM tasks t WHERE ${conditions.join(' AND ')} ORDER BY t.created_at DESC`,
    params
  );
  return rows;
}

async function assertAssigneeIsTeamMember(assigneeId, teamId) {
  if (assigneeId === null || assigneeId === undefined) return;
  if (!(await isTeamMember(assigneeId, teamId))) {
    throw new Error('Assignee must be a member of the ticket\'s team');
  }
}

export async function createTicket(
  userId,
  { projectId, title, description = '', status = 'backlog', priority = null, points = null, assigneeId = null }
) {
  if (!title || !title.trim()) {
    throw new Error('Ticket title is required');
  }
  if (!projectId) {
    throw new Error('projectId is required');
  }
  if (!STATUSES.includes(status)) {
    throw new Error(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (priority !== null && !PRIORITIES.includes(priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(', ')}`);
  }
  if (points !== null && !POINTS.includes(points)) {
    throw new Error(`points must be one of ${POINTS.join(', ')}`);
  }

  const { rows: projectRows } = await query('SELECT id, team_id FROM projects WHERE id = $1', [projectId]);
  const project = projectRows[0];
  if (!project) {
    throw new Error('Project not found');
  }
  if (!project.team_id) {
    throw new Error('Project has no team - add it to a team before creating tickets on it');
  }
  if (!(await isTeamMember(userId, project.team_id))) {
    throw new Error('You are not a member of this project\'s team');
  }
  await assertAssigneeIsTeamMember(assigneeId, project.team_id);

  const { rows } = await query(
    `INSERT INTO tasks (project_id, title, description, status, priority, points, assignee_id, team_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [projectId, title.trim(), description, status, priority ?? 'medium', points, assigneeId, project.team_id]
  );
  const ticket = rows[0];
  await recordStatusChange(ticket.id, null, ticket.status);
  return ticket;
}

export async function updateTicket(userId, id, fields) {
  const existing = await getTicket(userId, id);
  if (!existing) return null;

  if (fields.status !== undefined && !STATUSES.includes(fields.status)) {
    throw new Error(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (fields.priority !== undefined && fields.priority !== null && !PRIORITIES.includes(fields.priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(', ')}`);
  }
  if (fields.points !== undefined && fields.points !== null && !POINTS.includes(fields.points)) {
    throw new Error(`points must be one of ${POINTS.join(', ')}`);
  }
  if (fields.assigneeId !== undefined) {
    await assertAssigneeIsTeamMember(fields.assigneeId, existing.team_id);
  }

  const merged = {
    title: fields.title ?? existing.title,
    description: fields.description ?? existing.description,
    status: fields.status ?? existing.status,
    priority: fields.priority !== undefined ? fields.priority : existing.priority,
    points: fields.points !== undefined ? fields.points : existing.points,
    assignee_id: fields.assigneeId !== undefined ? fields.assigneeId : existing.assignee_id,
  };

  const { rows } = await query(
    `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4,
       points = $5, assignee_id = $6, updated_at = now()
     WHERE id = $7 RETURNING *`,
    [merged.title, merged.description, merged.status, merged.priority, merged.points, merged.assignee_id, id]
  );
  const ticket = rows[0];

  if (merged.status !== existing.status) {
    await recordStatusChange(ticket.id, existing.status, merged.status);
  }

  return ticket;
}

export async function deleteTicket(userId, id) {
  const existing = await getTicket(userId, id);
  if (!existing) return false;
  const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [id]);
  return rowCount > 0;
}
