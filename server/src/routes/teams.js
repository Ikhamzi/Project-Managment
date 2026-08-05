import { Router } from 'express';
import * as teamService from '../services/teamService.js';

const router = Router();

router.get('/', async (req, res) => {
  const teams = await teamService.listTeams(req.user.id);
  res.json(teams);
});

router.post('/', async (req, res) => {
  try {
    const team = await teamService.createTeam(req.user.id, req.body);
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/members', async (req, res) => {
  try {
    if (!(await teamService.isTeamMember(req.user.id, req.params.id))) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(await teamService.listTeamMembers(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const members = await teamService.addTeamMember(req.user.id, req.params.id, req.body);
    res.status(201).json(members);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
