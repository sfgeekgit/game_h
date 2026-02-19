import { Router } from 'express';
import type { Request, Response } from 'express';
import { applyMove } from '@game_h/shared';
import type { Direction, Entity } from '@game_h/shared';
import { getOrCreatePersistentArea, TOWN_SQUARE_DEF_ID, TOWN_SQUARE_MAP_ID, getMapDef } from '../area/manager.js';
import { withAreaLock, readAreaState, findPlayerEntity } from '../area/store.js';
import { updatePlayerPosition } from '../db/helpers.js';
import { townSquare } from '@game_h/shared';

const router = Router();

const VALID_DIRECTIONS = new Set<string>(['north', 'south', 'east', 'west']);

/**
 * GET /api/area/map
 * Returns the Town Square map definition (tiles + metadata, no player entities).
 * Used by the frontend for client-side mode.
 */
router.get('/map', (_req: Request, res: Response) => {
  res.json(townSquare);
});

/**
 * POST /api/area/join
 * Join the persistent Town Square backend instance.
 * Adds the player entity to in-memory state and records the area in session.
 */
router.post('/join', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No session' });
      return;
    }

    const areaId = await getOrCreatePersistentArea(TOWN_SQUARE_DEF_ID, TOWN_SQUARE_MAP_ID);

    const map = getMapDef(TOWN_SQUARE_MAP_ID);

    // Determine spawn position (map default; could later use last_x/last_y from players table)
    const spawnX = map.spawnX;
    const spawnY = map.spawnY;

    // --- DO ALL ASYNC WORK BEFORE THIS LINE ---
    // Add player entity to area if not already present (idempotent join).
    await withAreaLock(areaId, (state) => {
      // CRITICAL SECTION — synchronous only.
      const existing = state.entities.find((e) => e.id === userId && e.type === 'player');
      if (!existing) {
        const playerEntity: Entity = {
          id: userId,
          type: 'player',
          x: spawnX,
          y: spawnY,
          facing: 'south',
        };
        state.entities.push(playerEntity);
      }
    });
    // --- DB WRITES AND OTHER ASYNC WORK GO AFTER THIS LINE ---

    req.session.currentAreaId = areaId;

    const state = readAreaState(areaId);
    const player = state?.entities.find((e) => e.id === userId && e.type === 'player') ?? null;

    res.json({ areaId, state, player });
  } catch (err) {
    console.error('Area join error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/area/move
 * Submit a move in the backend area.
 * Body: { direction: 'north' | 'south' | 'east' | 'west' }
 */
router.post('/move', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    const areaId = req.session?.currentAreaId;
    if (!userId || !areaId) {
      res.status(400).json({ error: 'Not in an area' });
      return;
    }

    const { direction } = req.body;
    if (!direction || !VALID_DIRECTIONS.has(direction)) {
      res.status(400).json({ error: 'Invalid direction' });
      return;
    }

    // Read current player state before the lock (async-safe read).
    const playerBefore = findPlayerEntity(areaId, userId);
    if (!playerBefore) {
      res.status(400).json({ error: 'Player not in area' });
      return;
    }

    // Compute the move result outside the lock using the current state snapshot.
    const stateBefore = readAreaState(areaId);
    if (!stateBefore) {
      res.status(500).json({ error: 'Area not in memory' });
      return;
    }
    const moveResult = applyMove(stateBefore, playerBefore, direction as Direction);

    // --- DO ALL ASYNC WORK BEFORE THIS LINE ---
    // Apply the pre-computed result inside the lock synchronously.
    await withAreaLock(areaId, (state) => {
      // CRITICAL SECTION — synchronous only.
      // Read current map state, apply pre-computed update, write back.
      // DO NOT add async operations here. If you think you need to, redesign.
      const entity = state.entities.find((e) => e.id === userId && e.type === 'player');
      if (entity) {
        entity.x = moveResult.newX;
        entity.y = moveResult.newY;
        entity.facing = moveResult.newFacing;
      }
    });
    // --- DB WRITES AND OTHER ASYNC WORK GO AFTER THIS LINE ---

    // Persist position to DB asynchronously (fire and forget for prototype).
    if (moveResult.success) {
      updatePlayerPosition(userId, areaId, moveResult.newX, moveResult.newY).catch((err) =>
        console.error('Failed to persist player position:', err),
      );
    }

    // If player exited, remove entity from area state.
    if (moveResult.exitedArea) {
      await withAreaLock(areaId, (state) => {
        // CRITICAL SECTION — synchronous only.
        const idx = state.entities.findIndex((e) => e.id === userId && e.type === 'player');
        if (idx !== -1) state.entities.splice(idx, 1);
      });
      req.session.currentAreaId = undefined as unknown as number;
    }

    const state = readAreaState(areaId);
    const player = state?.entities.find((e) => e.id === userId && e.type === 'player') ?? null;

    res.json({ moveResult, state, player });
  } catch (err) {
    console.error('Area move error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/area/state
 * Fetch current area state (all entities, including other players).
 */
router.get('/state', (req: Request, res: Response) => {
  const userId = req.session?.userId;
  const areaId = req.session?.currentAreaId;
  if (!userId || !areaId) {
    res.status(400).json({ error: 'Not in an area' });
    return;
  }

  const state = readAreaState(areaId);
  if (!state) {
    res.status(500).json({ error: 'Area not in memory' });
    return;
  }

  const player = state.entities.find((e) => e.id === userId && e.type === 'player') ?? null;
  res.json({ state, player });
});

/**
 * POST /api/area/exit
 * Record final player position (used by frontend-mode on exit tile).
 * Body: { x, y, areaDefId }
 */
router.post('/exit', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No session' });
      return;
    }

    const { x, y, areaDefId } = req.body;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      typeof areaDefId !== 'number'
    ) {
      res.status(400).json({ error: 'Invalid position' });
      return;
    }

    // Validate coords are within map bounds
    const map = getMapDef(TOWN_SQUARE_MAP_ID);
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      res.status(400).json({ error: 'Position out of bounds' });
      return;
    }

    // For frontend mode, areaId is the persistent area's ID (or 0 if never joined).
    // We persist the last known position either way.
    const areaRow = await (await import('../db/helpers.js')).getPersistentArea(areaDefId);
    const areaId = areaRow?.area_id ?? 0;
    if (areaId) {
      await updatePlayerPosition(userId, areaId, x, y);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Area exit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
