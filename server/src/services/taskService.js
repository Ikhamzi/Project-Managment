// Single source of truth for task business logic, shared by the REST
// routes and the MCP tool/resource handlers (see mcp/tools.js and
// mcp/resources.js).
//
// Tasks don't store user_id directly - ownership flows through the
// project (tasks.project_id -> projects.user_id), so every query here
// joins to projects and filters on userId. That keeps the schema
// normalized and makes it impossible to read or edit a task that
// belongs to someone else's project.
import { query } from '../db.js';
import { recordStatusChange } from './ticketService.js';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

export async function listTasks(userId, { projectId, status } = {}) {
  const conditions = ['p.user_id = $1'];
  const params = [userId];

  if (projectId) {
    params.push(projectId);
    conditions.push(`t.project_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT t.* FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
    params
  );
  return rows;
}

export async function listOverdueTasks(userId) {
  const { rows } = await query(
    `SELECT t.* FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.user_id = $1 AND t.due_date < CURRENT_DATE AND t.status != 'done'
     ORDER BY t.due_date ASC`,
    [userId]
  );
  return rows;
}

export async function getTask(userId, id) {
  const { rows } = await query(
    `SELECT t.* FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1 AND p.user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

async function assertOwnsProject(userId, projectId) {
  const { rows } = await query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
  return rows.length > 0;
}

export async function createTask(userId, { projectId, title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) {
  if (!title || !title.trim()) {
    throw new Error('Task title is required');
  }
  if (!projectId) {
    throw new Error('projectId is required');
  }
  if (!STATUSES.includes(status)) {
    throw new Error(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (!PRIORITIES.includes(priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(', ')}`);
  }
  if (!(await assertOwnsProject(userId, projectId))) {
    throw new Error('Project not found');
  }

  const { rows } = await query(
    `INSERT INTO tasks (project_id, title, description, status, priority, due_date, assignee)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [projectId, title.trim(), description, status, priority, dueDate, assignee]
  );
  const task = rows[0];
  // Shares ticket_status_history with ticketService.js (same underlying
  // rows), so weekly completion stats stay accurate no matter which
  // tool - the legacy create_task/update_task or the newer
  // create_ticket/update_ticket - changed a ticket's status.
  await recordStatusChange(task.id, null, task.status);
  return task;
}

export async function updateTask(userId, id, fields) {
  const existing = await getTask(userId, id);
  if (!existing) return null;

  if (fields.status && !STATUSES.includes(fields.status)) {
    throw new Error(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (fields.priority && !PRIORITIES.includes(fields.priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(', ')}`);
  }

  const merged = {
    title: fields.title ?? existing.title,
    description: fields.description ?? existing.description,
    status: fields.status ?? existing.status,
    priority: fields.priority ?? existing.priority,
    due_date: fields.dueDate !== undefined ? fields.dueDate : existing.due_date,
    assignee: fields.assignee !== undefined ? fields.assignee : existing.assignee,
  };

  const { rows } = await query(
    `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4,
       due_date = $5, assignee = $6, updated_at = now()
     WHERE id = $7 RETURNING *`,
    [merged.title, merged.description, merged.status, merged.priority, merged.due_date, merged.assignee, id]
  );
  const task = rows[0];
  if (merged.status !== existing.status) {
    await recordStatusChange(task.id, existing.status, merged.status);
  }
  return task;
}

export async function deleteTask(userId, id) {
  const existing = await getTask(userId, id);
  if (!existing) return false;
  const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [id]);
  return rowCount > 0;
}
