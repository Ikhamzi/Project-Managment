import { Router } from 'express';
import * as mcpTokenService from '../services/mcpTokenService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await mcpTokenService.listTokens(req.user.id));
});

router.post('/', async (req, res) => {
  const created = await mcpTokenService.createToken(req.user.id, req.body?.label);
  res.status(201).json(created);
});

router.delete('/:id', async (req, res) => {
  await mcpTokenService.revokeToken(req.user.id, req.params.id);
  res.status(204).end();
});

export default router;
