// The externally-reachable base URL of this deployment, needed as a
// fixed value at startup for the OAuth issuer/resource identifiers
// (mcp/oauthProvider.js, index.js). Render sets RENDER_EXTERNAL_URL
// automatically for every web service; PUBLIC_URL is an escape hatch for
// other hosts, and localhost is the local-dev fallback.
export const publicUrl = new URL(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`);
