import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exits
const eW = { type: 'exit' as const, exitTarget: 'town_square' };
const eN = { type: 'exit' as const, exitTarget: 'castle_gates' };
const eE = { type: 'exit' as const, exitTarget: 'docks' };

/**
 * The Marketplace — 20×15 outdoor market.
 *
 * Central north-south path (col 10) + east-west path (row 7).
 * Market stalls (wall pairs) on either side of paths.
 * Exits: west (0,7) → town_square, north (10,0) → castle_gates, east (19,7) → docks
 * Spawn: (1, 7)
 */
export const marketplace: MapDef = {
  id: 'marketplace',
  name: 'The Marketplace',
  width: 20,
  height: 15,
  spawnX: 1,
  spawnY: 7,
  tiles: [
    // row 0 — north exit to Castle Gates at col 10
    [g, g, g, g, g, g, g, g, g, g, eN, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 2 — stalls
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 3
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 4
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 5
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 6 — stalls
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 7 — main east-west path; west exit (col 0), east exit (col 19)
    [eW, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, eE],
    // row 8 — stalls
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 9
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 10
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 11
    [g, g, g, g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g],
    // row 12 — stalls
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 13
    [g, g, w, w, g, g, g, g, g, g, p, g, g, g, g, w, w, g, g, g],
    // row 14
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
  ],
  npcs: [
    { id: 'merchant', name: 'Bram the Merchant', x: 7, y: 4, dialogueFile: 'merchant' },
    { id: 'fishmonger', name: 'Agnes the Fishmonger', x: 13, y: 8, dialogueFile: 'fishmonger' },
    { id: 'minstrel', name: 'Lyra the Minstrel', x: 5, y: 12, dialogueFile: 'minstrel' },
  ] satisfies NpcDef[],
};
