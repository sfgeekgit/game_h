import type { MapDef, NpcDef } from '../mapTypes.js';

// Shorthand builders
const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
const W = { type: 'water' as const };
const e = { type: 'exit' as const };

/**
 * Town Square — 20×15 fixed map.
 *
 * Layout (col 0-19, row 0-14):
 *   - Stone building (rows 2-6, cols 2-6) with interior floor and doorway at (4,6)
 *   - Path from building south then east (col 4 rows 7-8, then row 8 cols 4-9)
 *   - Pond (rows 4-6, cols 13-15) — impassable water
 *   - Second building (rows 12-14, cols 11-14) — enclosed, no entry in prototype
 *   - Exit tile at (7, 14) — south-center of map
 *   - Player spawns at (9, 9)
 */
export const townSquare: MapDef = {
  id: 'town_square',
  name: 'Town Square',
  width: 20,
  height: 15,
  spawnX: 9,
  spawnY: 9,
  tiles: [
    // row 0
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 2 — top wall of building
    [g, g, w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 3 — building interior
    [g, g, w, p, p, p, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 4 — building interior + pond begins
    [g, g, w, p, p, p, w, g, g, g, g, g, g, W, W, W, g, g, g, g],
    // row 5 — building interior + pond
    [g, g, w, p, p, p, w, g, g, g, g, g, g, W, W, W, g, g, g, g],
    // row 6 — bottom wall with doorway at col 4 + pond
    [g, g, w, w, p, w, w, g, g, g, g, g, g, W, W, W, g, g, g, g],
    // row 7 — path south from doorway
    [g, g, g, g, p, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 8 — path turns east
    [g, g, g, g, p, p, p, p, p, p, g, g, g, g, g, g, g, g, g, g],
    // row 9 — open grass, spawn at col 9
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 10
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 11
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 12 — second building top wall
    [g, g, g, g, g, g, g, g, g, g, g, w, w, w, w, g, g, g, g, g],
    // row 13 — second building interior
    [g, g, g, g, g, g, g, g, g, g, g, w, p, p, w, g, g, g, g, g],
    // row 14 — second building bottom wall + exit tile
    [g, g, g, g, g, g, g, e, g, g, g, w, w, w, w, g, g, g, g, g],
  ],
  npcs: [
    { id: 'blacksmith', name: 'Gareth the Blacksmith', x: 3, y: 4, facing: 'south', dialogueFile: 'blacksmith' },
    { id: 'elder', name: 'Elder Miriam', x: 6, y: 8, facing: 'west', dialogueFile: 'elder' },
    { id: 'stranger', name: 'Hooded Stranger', x: 11, y: 5, facing: 'south', dialogueFile: 'stranger' },
  ] satisfies NpcDef[],
};
