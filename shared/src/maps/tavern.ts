import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
const eS = { type: 'exit' as const, exitTarget: 'town_square' };

/**
 * The Rusty Flagon Tavern — 20×15
 *
 * Interior tavern. Enclosed by walls with a south exit back to Town Square.
 * Bar counter rows 5-6, cols 3-4 and 14-15. Tables at rows 9-10.
 * Exit: (10, 14) → town_square
 * Spawn: (10, 13)
 */
export const tavern: MapDef = {
  id: 'tavern',
  name: 'The Rusty Flagon',
  width: 20,
  height: 15,
  spawnX: 10,
  spawnY: 13,
  tiles: [
    // row 0 — north outer wall
    [w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w],
    // row 1
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 2
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 3
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 4
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 5 — bar counter along north side of bar area
    [w, p, p, w, w, p, p, p, p, p, p, p, p, p, w, w, p, p, p, w],
    // row 6 — bar counter (front)
    [w, p, p, w, w, p, p, p, p, p, p, p, p, p, w, w, p, p, p, w],
    // row 7
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 8
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 9 — tables (pairs of wall tiles acting as furniture)
    [w, p, p, w, w, p, p, w, w, p, p, w, w, p, p, w, w, p, p, w],
    // row 10
    [w, p, p, w, w, p, p, w, w, p, p, w, w, p, p, w, w, p, p, w],
    // row 11
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 12
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 13
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 14 — south wall with exit at col 10 back to Town Square
    [w, w, w, w, w, w, w, w, w, w, eS, w, w, w, w, w, w, w, w, w],
  ],
  npcs: [
    { id: 'innkeeper', name: 'Marta the Innkeeper', x: 10, y: 4, facing: 'south', dialogueFile: 'innkeeper' },
    { id: 'bard', name: 'Aldric the Bard', x: 5, y: 12, facing: 'east', dialogueFile: 'bard' },
    { id: 'drunk_merchant', name: 'Tobias the Merchant', x: 14, y: 10, facing: 'south', dialogueFile: 'drunk_merchant' },
  ] satisfies NpcDef[],
};
