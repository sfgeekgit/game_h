import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exits
const eW = { type: 'exit' as const, exitTarget: 'castle_gates' };
const eS = { type: 'exit' as const, exitTarget: 'dungeon_entrance' };

/**
 * Temple of Virtue — 20×15 grand temple interior.
 *
 * Marble columns (wall tiles) flank the central aisle. Altar at rows 3-5 cols 9-11.
 * Central path runs north-south (col 10). West-east nave at row 7.
 * Exits: west (0,7) → castle_gates, south (10,14) → dungeon_entrance
 * Spawn: (1, 7)
 */
export const temple: MapDef = {
  id: 'temple',
  name: 'Temple of Virtue',
  width: 20,
  height: 15,
  spawnX: 1,
  spawnY: 7,
  tiles: [
    // row 0
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 2 — outer columns
    [g, g, w, g, g, g, w, g, g, g, g, g, g, w, g, g, g, w, g, g],
    // row 3 — aisle + altar area begins
    [g, g, g, g, g, g, g, g, g, p, p, p, g, g, g, g, g, g, g, g],
    // row 4 — inner columns + altar
    [g, g, w, g, g, g, w, g, g, p, p, p, g, g, w, g, g, g, w, g],
    // row 5 — altar area
    [g, g, g, g, g, g, g, g, g, p, p, p, g, g, g, g, g, g, g, g],
    // row 6 — columns + central path
    [g, g, w, g, g, g, w, g, g, g, p, g, g, g, w, g, g, g, w, g],
    // row 7 — main nave (west-east); west exit (col 0) → castle_gates
    [eW, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, g],
    // row 8 — columns
    [g, g, w, g, g, g, w, g, g, g, p, g, g, g, w, g, g, g, w, g],
    // row 9
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 10 — columns
    [g, g, w, g, g, g, w, g, g, g, p, g, g, g, w, g, g, g, w, g],
    // row 11
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 12
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 13
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 14 — south exit to Dungeon at col 10
    [g, g, g, g, g, g, g, g, g, g, eS, g, g, g, g, g, g, g, g, g],
  ],
  npcs: [
    { id: 'priest', name: 'Father Aldwyn', x: 10, y: 4, facing: 'south', dialogueFile: 'priest' },
    { id: 'acolyte', name: 'Petra the Acolyte', x: 13, y: 8, facing: 'west', dialogueFile: 'acolyte' },
  ] satisfies NpcDef[],
};
