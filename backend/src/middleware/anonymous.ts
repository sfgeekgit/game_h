import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createUser, createPlayer } from '../db/helpers.js';

export async function ensureAnonymousUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.session.userId) {
      const userId = uuidv4();
      await createUser(userId);
      await createPlayer(userId);
      req.session.userId = userId;
      req.session.isRegistered = false;
    }
    next();
  } catch (err) {
    next(err);
  }
}
