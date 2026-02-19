import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createSessionMiddleware } from './auth/session.js';
import passport from './auth/passport.js';
import { ensureAnonymousUser } from './middleware/anonymous.js';
import apiRouter from './api/routes.js';

export function createApp() {
  const app = express();

  // Trust reverse proxy (Caddy) — needed for secure cookies, rate limiting, etc.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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
  app.use(
    '/api/',
    rateLimit({
      windowMs: 4 * 60 * 1000,
      max: 720,
      standardHeaders: true,
      legacyHeaders: false,
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

  // Global error handler — never leak internals
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}
