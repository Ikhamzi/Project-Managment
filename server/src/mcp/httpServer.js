// Remote MCP transport - lets an MCP client (Claude Code, Claude Desktop,
// claude.ai connectors) talk to this same tools/resources over HTTPS
// instead of spawning server.js locally over stdio. Mounted at /mcp by
// index.js, guarded by a bearer token (MCP_API_TOKEN) since anyone who
// can reach it can read/write the account set by MCP_USER_EMAIL.
//
// Stateless: each request gets its own McpServer + transport instance
// (per the SDK's documented stateless pattern), so concurrent requests
// never share JSON-RPC request IDs. There's no server-initiated push in
// this app, so GET (SSE stream) and DELETE (session close) aren't needed.
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';

function requireBearerToken(req, res, next) {
  const expected = process.env.MCP_API_TOKEN;
  if (!expected) {
    res.status(500).json({ error: 'MCP_API_TOKEN is not configured on the server' });
    return;
  }
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || token !== expected) {
    res.status(401).json({ error: 'Missing or invalid bearer token' });
    return;
  }
  next();
}

export const mcpRouter = express.Router();

mcpRouter.use(requireBearerToken);

mcpRouter.post('/', async (req, res) => {
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

mcpRouter.get('/', (req, res) => {
  res.status(405).json({ error: 'Method not allowed - this server does not use server-initiated notifications' });
});

mcpRouter.delete('/', (req, res) => {
  res.status(405).json({ error: 'Method not allowed - this server is stateless, there is no session to close' });
});
