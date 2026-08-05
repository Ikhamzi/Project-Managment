// Remote MCP transport - lets an MCP client (Claude Code, Claude Desktop,
// claude.ai connectors) talk to this same tools/resources over HTTPS
// instead of spawning server.js locally over stdio. Mounted at /mcp by
// index.js.
//
// Auth: every request needs `Authorization: Bearer <token>`, where the
// token is either a personal access token from the "MCP access" panel,
// or one issued by the OAuth flow (oauthProvider.js) - both resolve to a
// user id the same way (see mcpTokenService.resolveUserIdFromToken).
// requireBearerAuth (from the SDK) also attaches a `resource_metadata`
// hint on 401s so clients that only speak OAuth (e.g. Claude Desktop's
// "Add custom connector", which has no field for a raw token) can
// discover the authorization server and connect without ever seeing a
// token themselves.
//
// Stateless: each request gets its own McpServer + transport instance
// (per the SDK's documented stateless pattern), so concurrent requests
// from different users never share JSON-RPC request IDs or user
// context. There's no server-initiated push in this app, so GET (SSE
// stream) and DELETE (session close) aren't needed.
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { httpUserContext } from './context.js';
import { taskManagerOAuthProvider } from './oauthProvider.js';
import { publicUrl } from '../publicUrl.js';

export const mcpRouter = express.Router();

mcpRouter.use(
  requireBearerAuth({
    verifier: taskManagerOAuthProvider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(new URL('/mcp', publicUrl)),
  })
);

mcpRouter.post('/', async (req, res) => {
  const userId = req.auth.extra.userId;
  await httpUserContext.run(userId, async () => {
    const server = new McpServer({ name: 'task-manager-mcp', version: '1.0.0' });
    registerTools(server);
    registerResources(server);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
});

mcpRouter.get('/', (req, res) => {
  res.status(405).json({ error: 'Method not allowed - this server does not use server-initiated notifications' });
});

mcpRouter.delete('/', (req, res) => {
  res.status(405).json({ error: 'Method not allowed - this server is stateless, there is no session to close' });
});
