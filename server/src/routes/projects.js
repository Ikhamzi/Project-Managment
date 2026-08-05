import { Router } from 'express';
import * as projectService from '../services/projectService.js';

const router = Router();

router.get('/', async (req, res) => {
  const projects = await projectService.listProjects(req.user.id);
  res.json(projects);
});

router.post('/', async (req, res) => {
  try {
    const project = await projectService.createProject(req.user.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const project = await projectService.getProject(req.user.id, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.patch('/:id', async (req, res) => {
  try {
    const project = await projectService.updateProject(req.user.id, req.params.id, req.body);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const deleted = await projectService.deleteProject(req.user.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Project not found' });
  res.status(204).end();
});

export default router;
