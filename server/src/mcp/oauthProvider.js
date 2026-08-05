// Implements the MCP SDK's OAuthServerProvider interface so this app can
// act as its own OAuth 2.1 authorization server - what lets a client like
// Claude Desktop's "Add custom connector" (URL only, no manual token/
// client id) discover how to authenticate, register itself (RFC 7591),
// send the user through a consent screen, and exchange a code for an
// access token, all without any shared secret.
//
// The access token it ultimately issues is just a row in mcp_tokens (see
// mcpTokenService.js) - the same personal-access-token table the "MCP
// access" panel writes to directly. So an OAuth-issued token shows up
// there too, and can be revoked the same way.
import crypto from 'node:crypto';
import { InvalidGrantError, InvalidTokenError, UnsupportedGrantTypeError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { query } from '../db.js';
import { createToken as createAccessToken, resolveUserIdFromToken } from '../services/mcpTokenService.js';

const AUTH_CODE_TTL_MS = 60 * 1000;
const PENDING_REQUEST_TTL_MS = 10 * 60 * 1000;

// Both maps are in-memory: entries live for at most 10 minutes (a human
// clicking through a consent screen) or 60 seconds (a client immediately
// exchanging a code it just received), so losing them on a process
// restart just means retrying the connector flow - never a stored token.
const pendingRequests = new Map();
const authorizationCodes = new Map();

function sweepExpired(map) {
  const now = Date.now();
  for (const [key, value] of map) {
    if (value.expiresAt < now) map.delete(key);
  }
}

export function getPendingRequest(requestId) {
  sweepExpired(pendingRequests);
  return pendingRequests.get(requestId);
}

export function resolvePendingRequest(requestId, { approve, userId }) {
  sweepExpired(pendingRequests);
  const pending = pendingRequests.get(requestId);
  if (!pending) return null;
  pendingRequests.delete(requestId);

  const redirectUrl = new URL(pending.redirectUri);
  if (!approve) {
    redirectUrl.searchParams.set('error', 'access_denied');
    if (pending.state) redirectUrl.searchParams.set('state', pending.state);
    return redirectUrl.toString();
  }

  const code = crypto.randomBytes(32).toString('base64url');
  authorizationCodes.set(code, {
    userId,
    clientId: pending.clientId,
    codeChallenge: pending.codeChallenge,
    redirectUri: pending.redirectUri,
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
  });

  redirectUrl.searchParams.set('code', code);
  if (pending.state) redirectUrl.searchParams.set('state', pending.state);
  return redirectUrl.toString();
}

function rowToClient(row) {
  if (!row) return undefined;
  return {
    client_id: row.client_id,
    client_secret: row.client_secret ?? undefined,
    client_secret_expires_at: row.client_secret_expires_at ? Number(row.client_secret_expires_at) : undefined,
    client_name: row.client_name ?? undefined,
    redirect_uris: row.redirect_uris,
    token_endpoint_auth_method: row.token_endpoint_auth_method ?? undefined,
    grant_types: row.grant_types ?? undefined,
    response_types: row.response_types ?? undefined,
  };
}

export const taskManagerOAuthProvider = {
  clientsStore: {
    async getClient(clientId) {
      const { rows } = await query('SELECT * FROM oauth_clients WHERE client_id = $1', [clientId]);
      return rowToClient(rows[0]);
    },

    async registerClient(client) {
      await query(
        `INSERT INTO oauth_clients
           (client_id, client_secret, client_secret_expires_at, client_name, redirect_uris, token_endpoint_auth_method, grant_types, response_types)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          client.client_id,
          client.client_secret ?? null,
          client.client_secret_expires_at ?? null,
          client.client_name ?? null,
          client.redirect_uris,
          client.token_endpoint_auth_method ?? 'none',
          client.grant_types ?? ['authorization_code'],
          client.response_types ?? ['code'],
        ]
      );
      return client;
    },
  },

  async authorize(client, params, res) {
    const requestId = crypto.randomBytes(16).toString('base64url');
    pendingRequests.set(requestId, {
      clientId: client.client_id,
      clientName: client.client_name || client.client_id,
      redirectUri: params.redirectUri,
      state: params.state,
      codeChallenge: params.codeChallenge,
      expiresAt: Date.now() + PENDING_REQUEST_TTL_MS,
    });
    res.redirect(302, `/mcp-authorize?request_id=${requestId}`);
  },

  async challengeForAuthorizationCode(client, authorizationCode) {
    sweepExpired(authorizationCodes);
    const record = authorizationCodes.get(authorizationCode);
    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid or expired authorization code');
    }
    return record.codeChallenge;
  },

  async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri) {
    sweepExpired(authorizationCodes);
    const record = authorizationCodes.get(authorizationCode);
    if (!record || record.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid or expired authorization code');
    }
    if (redirectUri && redirectUri !== record.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match the original request');
    }
    authorizationCodes.delete(authorizationCode);

    const { token } = await createAccessToken(record.userId, `OAuth: ${client.client_name || client.client_id}`);
    return { access_token: token, token_type: 'bearer' };
  },

  async exchangeRefreshToken() {
    throw new UnsupportedGrantTypeError('This server does not issue refresh tokens - reconnect the connector to get a new access token.');
  },

  async verifyAccessToken(token) {
    const userId = await resolveUserIdFromToken(token);
    if (!userId) {
      throw new InvalidTokenError('Invalid or revoked token');
    }
    // These tokens don't actually expire - they're revoked explicitly,
    // from the "MCP access" panel, same as a GitHub/GitLab PAT. The
    // SDK's bearer-auth middleware requires *some* numeric expiresAt
    // though, so this reports one far enough out to never matter.
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
    return { token, clientId: '', scopes: [], expiresAt, extra: { userId } };
  },
};
