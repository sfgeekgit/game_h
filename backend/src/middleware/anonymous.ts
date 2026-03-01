import type { Request, Response, NextFunction } from 'express';
import { createUser, createPlayer } from '../db/helpers.js';

function randomSixDigit(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}

async function generateUserId(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const userId = randomSixDigit();
    try {
      await createUser(userId);
      await createPlayer(userId);
      return userId;
    } catch (err: unknown) {
      // MySQL error ER_DUP_ENTRY means this random ID is already taken — try another
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException & { code: string }).code === 'ER_DUP_ENTRY') {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate unique user ID after 20 attempts');
}

export async function ensureAnonymousUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.session.userId) {
      const userId = await generateUserId();
      req.session.userId = userId;
      req.session.isRegistered = false;
    }
    next();
  } catch (err) {
    next(err);
  }
}
