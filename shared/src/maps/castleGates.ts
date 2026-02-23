import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const w = { type: 'wall' as const };
// Exits
const eS = { type: 'exit' as const, exitTarget: 'marketplace' };
const eE = { type: 'exit' as const, exitTarget: 'temple' };

/**
 * Castle Gates — 20×15 castle courtyard.
 *
 * Diamond-shaped open courtyard ringed by thick castle walls.
 * Exits: south (10,14) → marketplace, east (19,7) → temple
 * Spawn: (10, 13)
 */
export const castleGates: MapDef = {
  id: 'castle_gates',
  name: 'Castle Gates',
  width: 20,
  height: 15,
  spawnX: 10,
  spawnY: 13,
  tiles: [
    // row 0 — solid castle wall
    [w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w],
    // row 1 — narrow opening
    [w, w, w, w, w, w, w, w, w, g, g, g, w, w, w, w, w, w, w, w],
    // row 2
    [w, w, w, w, w, w, w, g, g, g, g, g, g, g, w, w, w, w, w, w],
    // row 3
    [w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, w, w, w, w],
    // row 4
    [w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g, w, w, w],
    // row 5
    [w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, w, w],
    // row 6
    [w, w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, w],
    // row 7 — east exit to Temple at col 19
    [w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, eE],
    // row 8
    [w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, w],
    // row 9
    [w, w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, w],
    // row 10
    [w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g, g, w, w, w],
    // row 11
    [w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, w, w, w, w],
    // row 12
    [w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, w, w, w, w, w],
    // row 13
    [w, w, w, w, w, w, g, g, g, g, g, g, g, g, w, w, w, w, w, w],
    // row 14 — south exit to Marketplace at col 10
    [w, w, w, w, w, w, w, w, w, w, eS, w, w, w, w, w, w, w, w, w],
  ],
  npcs: [
    { id: 'guard', name: 'Roland the Gate Guard', x: 10, y: 7, facing: 'south', dialogueFile: 'guard' },
    { id: 'squire', name: 'Edmund the Squire', x: 14, y: 5, facing: 'west', dialogueFile: 'squire' },
  ] satisfies NpcDef[],
};
