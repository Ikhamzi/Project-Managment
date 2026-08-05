// The MCP server runs locally over stdio (e.g. launched by Claude Code),
// completely separate from the web app's cookie-based session. It has
// no browser to hold a cookie in, so instead it's told up front, via the
// MCP_USER_EMAIL environment variable in the MCP client config, which
// signed-up user's data it's allowed to touch. That email must match a
// user who has already signed in at least once through the web app's
// Google sign-in (so the users row exists).
import dotenv from 'dotenv';
import { getUserByEmail } from '../services/userService.js';

dotenv.config();

let cachedUserId = null;

export async function resolveUserId() {
  if (cachedUserId) return cachedUserId;

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

  cachedUserId = user.id;
  return cachedUserId;
}
