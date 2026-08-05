#!/usr/bin/env node
// Entry point for the MCP server. Run with `npm run mcp` from server/,
// or point an MCP client (Claude Code, Claude Desktop) straight at this
// file - see the README's "MCP server" section for client config.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';

const server = new McpServer({ name: 'project-manager-mcp', version: '1.0.0' });

registerTools(server);
registerResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);
