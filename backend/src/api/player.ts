import { Router } from 'express';
import type { Request, Response } from 'express';
import { getPlayerById, updatePlayer } from '../db/helpers.js';
import { calculateLevel } from '@game_h/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const player = await getPlayerById(userId);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    res.json({
      userId: player.user_id,
      displayName: player.display_name,
      points: Number(player.points),
      level: player.level,
      updatedAt: player.updated_at,
    });
  } catch (err) {
    console.error('Get player error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/points', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { amount } = req.body;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      res.status(400).json({ error: 'Amount must be an integer' });
      return;
    }
    if (Math.abs(amount) > 10000) {
      res.status(400).json({ error: 'Amount out of range' });
      return;
    }

    const player = await getPlayerById(userId);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const newPoints = Number(player.points) + amount;
    if (newPoints < 0) {
      res.status(400).json({ error: 'Insufficient points' });
      return;
    }

    const newLevel = calculateLevel(newPoints);
    await updatePlayer(userId, newPoints, newLevel);

    res.json({ points: newPoints, level: newLevel });
  } catch (err) {
    console.error('Update points error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
