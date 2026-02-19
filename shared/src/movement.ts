import type { AreaState, Direction, Entity, MoveResult, Tile } from './mapTypes.js';

const PASSABLE_TYPES = new Set<string>(['grass', 'path', 'exit']);

export function isTilePassable(tile: Tile): boolean {
  return PASSABLE_TYPES.has(tile.type);
}

export function directionDelta(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'north':
      return { dx: 0, dy: -1 };
    case 'south':
      return { dx: 0, dy: 1 };
    case 'east':
      return { dx: 1, dy: 0 };
    case 'west':
      return { dx: -1, dy: 0 };
  }
}

/**
 * Apply a move to a player entity against the current area state.
 * Facing always updates even if movement is blocked.
 * Returns the result — does NOT mutate state (caller handles that).
 */
export function applyMove(state: AreaState, player: Entity, direction: Direction): MoveResult {
  const { dx, dy } = directionDelta(direction);
  const newX = player.x + dx;
  const newY = player.y + dy;
  const newFacing = direction;

  if (newX < 0 || newX >= state.width || newY < 0 || newY >= state.height) {
    return {
      success: false,
      reason: 'out_of_bounds',
      newX: player.x,
      newY: player.y,
      newFacing,
      exitedArea: false,
    };
  }

  const tile = state.tiles[newY][newX];
  if (!isTilePassable(tile)) {
    return {
      success: false,
      reason: 'impassable',
      newX: player.x,
      newY: player.y,
      newFacing,
      exitedArea: false,
    };
  }

  return {
    success: true,
    newX,
    newY,
    newFacing,
    exitedArea: tile.type === 'exit',
  };
}
