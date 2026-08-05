// JWT helpers shared by the auth routes and the requireAuth middleware.
// We sign our own short-lived session token after verifying a Google ID
// token once at login, rather than re-verifying with Google on every
// request - that keeps every other route fast and offline-friendly.
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const SESSION_COOKIE = 'session';

export function signSession(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  req.user = payload;
  next();
}
