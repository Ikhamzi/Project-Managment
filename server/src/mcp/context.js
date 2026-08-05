// Two ways the MCP server learns which user's projects/tasks it's
// allowed to touch, depending on how it's running:
//
// - Local, over stdio (launched by Claude Code/Desktop): there's no
//   browser and no per-request identity, so it's told once, up front,
//   via the MCP_USER_EMAIL environment variable in the MCP client
//   config. That email must match a user who has already signed in at
//   least once through the web app's Google sign-in.
// - Remote, over HTTP (POST /mcp): each request carries its own bearer
//   token (a personal access token generated from the web app), and
//   httpServer.js resolves that to a user id per request. Since a single
//   server process serves many users concurrently there, the id is
//   threaded through AsyncLocalStorage instead of a module-level cache.
import { AsyncLocalStorage } from 'node:async_hooks';
import dotenv from 'dotenv';
import { getUserByEmail } from '../services/userService.js';

dotenv.config();

export const httpUserContext = new AsyncLocalStorage();

let cachedStdioUserId = null;

export async function resolveUserId() {
  const httpUserId = httpUserContext.getStore();
  if (httpUserId) return httpUserId;

  if (cachedStdioUserId) return cachedStdioUserId;

  const email = process.env.MCP_USER_EMAIL;
  if (!email) {
    throw new Error(
      'MCP_USER_EMAIL is not set. Add it to your MCP client config (env block) so this server knows whose projects and tasks to manage.'
    );
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(
      `No account found for ${email}. Sign in to the web app with that Google account first, then restart this MCP server.`
    );
  }

  cachedStdioUserId = user.id;
  return cachedStdioUserId;
}
