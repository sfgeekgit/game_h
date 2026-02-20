import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { getPoolForSessionStore } from '../db/query.js';

const MySQLStore = MySQLStoreFactory(session);

export function createSessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = new MySQLStore({ endConnectionOnClose: false }, getPoolForSessionStore() as any);

  return session({
    name: 'game_h_session',
    secret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      path: '/',
    },
  });
}
