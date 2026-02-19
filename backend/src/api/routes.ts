import { Router } from 'express';
import playerRouter from './player.js';
import textRouter from './text.js';
import authRouter from '../auth/routes.js';
import areaRouter from './area.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/player', playerRouter);
router.use('/text', textRouter);
router.use('/area', areaRouter);

export default router;
