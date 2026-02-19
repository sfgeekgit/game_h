import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import passport from './passport.js';
import { getUserByEmail, registerUser } from '../db/helpers.js';

const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt silently truncates beyond this

// Stricter rate limit for auth endpoints (brute-force protection)
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_WINDOW_MINUTES = AUTH_WINDOW_MS / (60 * 1000);
const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Too many attempts. Please wait ${AUTH_WINDOW_MINUTES} minutes and try again.` },
});

const router = Router();
router.use(authLimiter);

router.get('/status', (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    userId: req.session.userId,
    isRegistered: req.session.isRegistered || false,
  });
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No active session' });
      return;
    }

    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      res.status(400).json({ error: 'Password too long' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await registerUser(userId, email, passwordHash);

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      req.session.userId = userId;
      req.session.isRegistered = true;
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', (req: Request, res: Response, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  passport.authenticate(
    'local',
    (err: Error | null, user: { user_id: string } | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Login failed' });
      }
      // Regenerate session to prevent session fixation
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        req.session.userId = user.user_id;
        req.session.isRegistered = true;
        res.json({ success: true, userId: user.user_id });
      });
    },
  )(req, res, next);
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.clearCookie('game_h_session');
    res.json({ success: true });
  });
});

export default router;
