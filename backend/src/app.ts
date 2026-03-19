import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createSessionMiddleware } from './auth/session.js';
import passport from './auth/passport.js';
import { ensureAnonymousUser } from './middleware/anonymous.js';
import apiRouter from './api/routes.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NPC_ADMIN_DIR = join(__dirname, '../npc_admin');

export function createApp() {
  const app = express();

  // Trust reverse proxy (Caddy) — needed for secure cookies, rate limiting, etc.
  // Always enabled: both dev and prod are served through Caddy which sets X-Forwarded-For.
  // Without this, rate-limit treats all users as the same IP and they share one bucket.
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS — lock to frontend origin
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );

  // Rate limiting on API routes
  const API_WINDOW_MS = 4 * 60 * 1000;
  const API_WINDOW_MINUTES = API_WINDOW_MS / (60 * 1000);
  const API_MAX_REQUESTS = 720;
  const COMBAT_RATE_MULTIPLIER = 5;

  // Combat gets a higher limit (COMBAT_RATE_MULTIPLIER x) — registered first so it takes precedence
  app.use(
    '/api/combat/',
    rateLimit({
      windowMs: API_WINDOW_MS,
      max: API_MAX_REQUESTS * COMBAT_RATE_MULTIPLIER,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: `[combat] Rate limited. Please wait ${API_WINDOW_MINUTES} minutes and try again.` },
    }),
  );

  // General limit for all other API routes (combat has its own limiter above)
  app.use(
    '/api/',
    rateLimit({
      windowMs: API_WINDOW_MS,
      max: API_MAX_REQUESTS,
      skip: (req) => req.path.startsWith('/combat'),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: `[general] Rate limited. Please wait ${API_WINDOW_MINUTES} minutes and try again.` },
    }),
  );

  // Body parsing with size limit
  app.use(express.json({ limit: '1mb' }));

  // Sessions
  app.use(createSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  // Auto-create anonymous users for API routes
  app.use('/api/', ensureAnonymousUser);

  // API routes
  app.use('/api', apiRouter);
  app.use('/api/npc_admin', express.static(NPC_ADMIN_DIR));

  // Global error handler — never leak internals
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}
