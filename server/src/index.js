import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import mcpTokenRoutes from './routes/mcpTokens.js';
import oauthConsentRoutes from './routes/oauthConsent.js';
import { requireAuth } from './auth.js';
import { runMigrations } from './runMigrations.js';
import { mcpRouter } from './mcp/httpServer.js';
import { taskManagerOAuthProvider } from './mcp/oauthProvider.js';
import { publicUrl } from './publicUrl.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/mcp-tokens', requireAuth, mcpTokenRoutes);
app.use('/api/oauth', requireAuth, oauthConsentRoutes);

// MCP authorization server endpoints (/authorize, /token, /register,
// /.well-known/...) - lets an MCP client discover this server, register
// itself, and get a user-authorized token without any shared secret.
// Must be mounted at the app root (see mcpAuthRouter's own doc comment).
app.use(
  mcpAuthRouter({
    provider: taskManagerOAuthProvider,
    issuerUrl: publicUrl,
    resourceServerUrl: new URL('/mcp', publicUrl),
    resourceName: 'Task Manager',
  })
);

app.use('/mcp', mcpRouter);

// In production the client is built into client/dist and served by this
// same Express process - one service to deploy, no CORS to configure.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;

await runMigrations();
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
