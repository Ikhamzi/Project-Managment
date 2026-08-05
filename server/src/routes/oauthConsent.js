// Backs the /mcp-authorize consent screen in the React app. Separate
// from the SDK's own OAuth routes (mounted at the app root by
// mcpAuthRouter) because this part - showing the user what's asking for
// access and recording their decision - is specific to how this app's
// sessions work (cookie + Google sign-in), not something the SDK can
// generate for us.
import { Router } from 'express';
import { getPendingRequest, resolvePendingRequest } from '../mcp/oauthProvider.js';

const router = Router();

router.get('/pending/:id', (req, res) => {
  const pending = getPendingRequest(req.params.id);
  if (!pending) return res.status(404).json({ error: 'This authorization request has expired. Go back to your MCP client and try connecting again.' });
  res.json({ clientName: pending.clientName });
});

router.post('/pending/:id/decision', (req, res) => {
  const redirectTo = resolvePendingRequest(req.params.id, {
    approve: Boolean(req.body?.approve),
    userId: req.user.id,
  });
  if (!redirectTo) return res.status(404).json({ error: 'This authorization request has expired. Go back to your MCP client and try connecting again.' });
  res.json({ redirectTo });
});

export default router;
