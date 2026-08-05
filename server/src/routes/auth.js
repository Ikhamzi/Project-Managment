import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { findOrCreateGoogleUser } from '../services/userService.js';
import { signSession, verifySession, SESSION_COOKIE } from '../auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Frontend posts the Google ID token it received from the Google Sign-In
// button here. We verify it belongs to our app (audience check), upsert
// the user, then hand back our own session cookie - the frontend never
// has to think about Google again after this call.
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google credential' });
  }

  const user = await findOrCreateGoogleUser({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.picture,
  });

  const token = signSession(user);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
  res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  res.json({ id: payload.id, email: payload.email, name: payload.name });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  res.status(204).end();
});

export default router;
