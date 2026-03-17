import { Router } from 'express';
import {
  createSession,
  joinSession,
  findWaitingPvpSession,
  getState,
  getPlayerSide,
  getSessionStatus,
  enqueueCommand,
  leaveSession,
  touchSession,
  validateCommand,
} from '../combat/sessionManager.js';

const router = Router();

router.post('/create', (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const mode = req.body.mode === 'pvp' ? 'pvp' as const : 'pve' as const;
  const result = createSession(userId, mode);

  req.session.currentCombatSessionId = result.sessionId;
  res.json(result);
});

router.post('/join', (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Missing sessionId' }); return;
  }

  const result = joinSession(sessionId, userId);
  if (!result) { res.status(404).json({ error: 'Session not found or not joinable' }); return; }

  req.session.currentCombatSessionId = sessionId;
  res.json({ sessionId, ...result });
});

router.get('/find-pvp', (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const sessionId = findWaitingPvpSession(userId);
  if (!sessionId) { res.status(404).json({ error: 'No PVP session waiting' }); return; }

  const result = joinSession(sessionId, userId);
  if (!result) { res.status(404).json({ error: 'Session no longer joinable' }); return; }

  req.session.currentCombatSessionId = sessionId;
  res.json({ sessionId, ...result });
});

router.get('/state', (req, res) => {
  const userId = req.session.userId;
  const sessionId = (req.query.sessionId as string) || req.session.currentCombatSessionId;
  if (!userId || !sessionId) { res.status(400).json({ error: 'No active combat session' }); return; }

  const state = getState(sessionId);
  if (!state) { res.status(404).json({ error: 'Session not found' }); return; }

  const side = getPlayerSide(sessionId, userId);
  const status = getSessionStatus(sessionId);
  touchSession(sessionId, userId);
  res.json({ state, side, status });
});

router.post('/command', (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const sessionId = req.body.sessionId || req.session.currentCombatSessionId;
  if (!sessionId) { res.status(400).json({ error: 'No active combat session' }); return; }

  const side = getPlayerSide(sessionId, userId);
  if (!side) { res.status(403).json({ error: 'Not in this session' }); return; }

  const state = getState(sessionId);
  if (!state) { res.status(404).json({ error: 'Session not found' }); return; }

  const command = req.body.command;
  if (!command || !command.type || !command.unitId) {
    res.status(400).json({ error: 'Invalid command' }); return;
  }

  const error = validateCommand(state, command, side);
  if (error) { res.status(400).json({ error }); return; }

  enqueueCommand(sessionId, command);
  touchSession(sessionId, userId);
  res.json({ ok: true });
});

router.post('/leave', (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const sessionId = req.body.sessionId || req.session.currentCombatSessionId;
  if (sessionId) {
    leaveSession(sessionId, userId);
    req.session.currentCombatSessionId = undefined;
  }

  res.json({ ok: true });
});

export default router;
