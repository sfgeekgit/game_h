import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
const W = { type: 'water' as const };
// Exit
const eW = { type: 'exit' as const, exitTarget: 'marketplace' };

/**
 * The Docks — 20×15 waterfront.
 *
 * Warehouses north, open quayside, three piers (cols 4, 10, 15) extending into water.
 * Exit: west (0,7) → marketplace
 * Spawn: (1, 7)
 */
export const docks: MapDef = {
  id: 'docks',
  name: 'The Docks',
  width: 20,
  height: 15,
  spawnX: 1,
  spawnY: 7,
  tiles: [
    // row 0
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 2 — warehouses
    [g, g, w, w, w, w, g, g, g, g, g, g, g, w, w, w, w, g, g, g],
    // row 3
    [g, g, w, p, p, w, g, g, g, g, g, g, g, w, p, p, w, g, g, g],
    // row 4
    [g, g, w, p, p, w, g, g, g, g, g, g, g, w, p, p, w, g, g, g],
    // row 5
    [g, g, w, w, w, w, g, g, g, g, g, g, g, w, w, w, w, g, g, g],
    // row 6 — open quayside
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 7 — west exit to Marketplace at col 0
    [eW, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, g],
    // row 8 — pier heads
    [g, g, g, g, p, g, g, g, g, g, p, g, g, g, g, p, g, g, g, g],
    // row 9
    [g, g, g, g, p, g, g, g, g, g, p, g, g, g, g, p, g, g, g, g],
    // row 10 — water begins; piers continue on path tiles
    [W, W, W, W, p, W, W, W, W, W, p, W, W, W, W, p, W, W, W, W],
    // row 11
    [W, W, W, W, p, W, W, W, W, W, p, W, W, W, W, p, W, W, W, W],
    // row 12
    [W, W, W, W, p, W, W, W, W, W, p, W, W, W, W, p, W, W, W, W],
    // row 13
    [W, W, W, W, p, W, W, W, W, W, p, W, W, W, W, p, W, W, W, W],
    // row 14
    [W, W, W, W, p, W, W, W, W, W, p, W, W, W, W, p, W, W, W, W],
  ],
  npcs: [
    { id: 'dockmaster', name: 'Henrik the Dockmaster', x: 10, y: 6, dialogueFile: 'dockmaster' },
    { id: 'sailor', name: 'Harwick the Sailor', x: 16, y: 6, dialogueFile: 'sailor' },
    { id: 'fisherman', name: 'Old Thomas', x: 4, y: 9, dialogueFile: 'fisherman' },
  ] satisfies NpcDef[],
};
