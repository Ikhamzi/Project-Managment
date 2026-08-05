// Comment business logic, shared by the REST routes and the MCP tool
// handlers - same pattern as the other services/ files. Comments are a
// flat list per ticket (no threading), scoped by the same team
// membership check ticketService.js uses.
import { query } from '../db.js';
import { getTicket } from './ticketService.js';

export async function listComments(userId, ticketId) {
  if (!(await getTicket(userId, ticketId))) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  const { rows } = await query(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.ticket_id = $1
     ORDER BY c.created_at ASC`,
    [ticketId]
  );
  return rows;
}

export async function addComment(userId, ticketId, { body }) {
  if (!body || !body.trim()) {
    throw new Error('Comment body is required');
  }
  if (!(await getTicket(userId, ticketId))) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  const { rows } = await query(
    `INSERT INTO comments (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING *`,
    [ticketId, userId, body.trim()]
  );
  return rows[0];
}
