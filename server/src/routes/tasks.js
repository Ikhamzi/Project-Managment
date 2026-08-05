import { Router } from 'express';
import * as taskService from '../services/taskService.js';

const router = Router();

router.get('/', async (req, res) => {
  const { projectId, status } = req.query;
  const tasks = await taskService.listTasks(req.user.id, { projectId, status });
  res.json(tasks);
});

router.get('/overdue', async (req, res) => {
  const tasks = await taskService.listOverdueTasks(req.user.id);
  res.json(tasks);
});

router.post('/', async (req, res) => {
  try {
    const task = await taskService.createTask(req.user.id, req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const task = await taskService.getTask(req.user.id, req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.patch('/:id', async (req, res) => {
  try {
    const task = await taskService.updateTask(req.user.id, req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const deleted = await taskService.deleteTask(req.user.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

export default router;
