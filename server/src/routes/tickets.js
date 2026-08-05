import { Router } from 'express';
import * as ticketService from '../services/ticketService.js';
import * as commentService from '../services/commentService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { projectId, teamId, assigneeId, status } = req.query;
    const tickets = await ticketService.listTickets(req.user.id, { projectId, teamId, assigneeId, status });
    res.json(tickets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const ticket = await ticketService.createTicket(req.user.id, req.body);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const ticket = await ticketService.getTicket(req.user.id, req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

router.patch('/:id', async (req, res) => {
  try {
    const ticket = await ticketService.updateTicket(req.user.id, req.params.id, req.body);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const deleted = await ticketService.deleteTicket(req.user.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Ticket not found' });
  res.status(204).end();
});

router.get('/:id/comments', async (req, res) => {
  try {
    res.json(await commentService.listComments(req.user.id, req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const comment = await commentService.addComment(req.user.id, req.params.id, req.body);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
