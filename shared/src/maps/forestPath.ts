import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exits
const eE = { type: 'exit' as const, exitTarget: 'town_square' };
const eW = { type: 'exit' as const, exitTarget: 'herbalist_garden' };
const eN = { type: 'exit' as const, exitTarget: 'graveyard' };

/**
 * Forest Path — 20×15 outdoor wooded area.
 *
 * Wall tiles = dense trees. Central vertical path at col 7 meets horizontal
 * path at row 7. Old trees flank the route.
 * Exits: east (19,7) → town_square, west (0,7) → herbalist_garden, north (7,0) → graveyard
 * Spawn: (18, 7)
 */
export const forestPath: MapDef = {
  id: 'forest_path',
  name: 'Forest Path',
  width: 20,
  height: 15,
  spawnX: 18,
  spawnY: 7,
  tiles: [
    // row 0 — north exit to Graveyard at col 7
    [g, g, g, g, g, g, g, eN, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1 — trees flanking path
    [g, w, w, g, g, g, g, p, g, w, w, g, g, g, g, w, w, g, g, g],
    // row 2
    [g, w, w, g, g, g, g, p, g, w, w, g, g, g, g, w, w, g, g, g],
    // row 3
    [g, g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 4 — tree clusters
    [g, g, g, g, g, w, w, p, g, g, g, g, w, w, g, g, g, g, g, g],
    // row 5
    [g, g, g, g, g, w, w, p, g, g, g, g, w, w, g, g, g, g, g, g],
    // row 6 — path bends east
    [g, g, g, g, g, g, g, p, p, p, p, p, p, g, g, g, g, g, g, g],
    // row 7 — main east-west path; west exit (col 0), east exit (col 19)
    [eW, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, eE],
    // row 8 — path leads from crossroads
    [g, g, g, g, g, g, p, p, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 9 — trees
    [g, g, g, g, g, g, p, g, g, g, w, w, g, g, g, g, g, w, w, g],
    // row 10
    [g, g, g, g, g, g, p, g, g, g, w, w, g, g, g, g, g, w, w, g],
    // row 11
    [g, g, g, w, w, g, p, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 12
    [g, g, g, w, w, g, p, g, g, g, g, g, g, g, g, g, w, w, g, g],
    // row 13
    [g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g, w, w, g, g],
    // row 14
    [g, g, g, g, g, g, p, g, g, g, g, g, g, g, g, g, g, g, g, g],
  ],
  npcs: [
    { id: 'ranger', name: 'Erin the Ranger', x: 10, y: 5, dialogueFile: 'ranger' },
    { id: 'pilgrim', name: 'Brother Oswald', x: 5, y: 10, dialogueFile: 'pilgrim' },
  ] satisfies NpcDef[],
};
