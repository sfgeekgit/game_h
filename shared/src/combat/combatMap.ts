import type { CombatTile } from './combatTypes.js';

/** Create a simple open arena. Heroes spawn left, enemies spawn right. */
export function createArena(width: number = 9, height: number = 9): {
  tiles: CombatTile[][];
  width: number;
  height: number;
} {
  const tiles: CombatTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: CombatTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ type: 'floor' });
    }
    tiles.push(row);
  }

  // Add a couple of walls for tactical interest
  tiles[3][4] = { type: 'wall' };
  tiles[4][4] = { type: 'wall' };
  tiles[5][4] = { type: 'wall' };

  return { tiles, width, height };
}
