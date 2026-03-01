import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exit
const eE = { type: 'exit' as const, exitTarget: 'forest_path' };

/**
 * Herbalist's Garden — 20×15 cottage garden.
 *
 * Cottage with doorway (rows 2-5, cols 2-6). Second structure south (rows 9-12).
 * Garden beds (path tiles) running north-south. Main east path at row 7.
 * Exit: east (19,7) → forest_path
 * Spawn: (17, 7)
 */
export const herbalistGarden: MapDef = {
  id: 'herbalist_garden',
  name: "Herbalist's Garden",
  width: 20,
  height: 15,
  spawnX: 17,
  spawnY: 7,
  tiles: [
    // row 0
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 2 — cottage top wall
    [g, g, w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 3 — cottage interior + garden beds
    [g, g, w, p, p, p, w, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 4
    [g, g, w, p, p, p, w, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 5 — cottage doorway at col 4
    [g, g, w, w, p, w, w, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 6 — path from doorway to main path
    [g, g, g, g, p, g, g, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 7 — main east path; exit east (col 19) → forest_path
    [g, g, g, g, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, eE],
    // row 8 — garden beds continue
    [g, g, g, g, p, g, g, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 9 — second structure (wizard's cottage)
    [g, g, w, w, p, w, w, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 10
    [g, g, w, p, p, p, w, g, g, p, g, g, p, g, g, p, g, g, g, g],
    // row 11
    [g, g, w, p, p, p, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 12 — second cottage bottom wall
    [g, g, w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 13
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 14
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
  ],
  npcs: [
    { id: 'herbalist', name: 'Sylva the Herbalist', x: 4, y: 4, dialogueFile: 'herbalist' },
    { id: 'hedge_wizard', name: 'Bramwell the Wizard', x: 4, y: 10, dialogueFile: 'hedge_wizard' },
  ] satisfies NpcDef[],
};
