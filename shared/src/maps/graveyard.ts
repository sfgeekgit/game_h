import type { MapDef, NpcDef } from '../mapTypes.js';

const g = { type: 'grass' as const };
const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exit
const eS = { type: 'exit' as const, exitTarget: 'forest_path' };

/**
 * The Graveyard — 20×15 eerie cemetery.
 *
 * Scattered grave markers (wall tiles). Ancient crypt (rows 8-11, cols 2-6).
 * Narrow paths wind between the graves.
 * Exit: south (7,14) → forest_path
 * Spawn: (7, 1)
 */
export const graveyard: MapDef = {
  id: 'graveyard',
  name: 'The Graveyard',
  width: 20,
  height: 15,
  spawnX: 7,
  spawnY: 1,
  tiles: [
    // row 0
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 1
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 2 — grave markers
    [g, w, g, g, w, g, g, g, w, g, g, w, g, g, g, w, g, g, w, g],
    // row 3
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 4 — more graves
    [g, g, w, g, g, g, w, g, g, g, w, g, g, g, w, g, g, g, g, g],
    // row 5
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 6 — scattered graves
    [g, w, g, g, g, w, g, g, g, g, g, g, g, w, g, g, g, w, g, g],
    // row 7
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 8 — ancient crypt
    [g, g, w, w, w, w, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 9
    [g, g, w, p, p, p, w, g, g, g, w, g, g, g, w, g, g, g, g, g],
    // row 10
    [g, g, w, p, p, p, w, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 11 — crypt bottom wall
    [g, g, w, w, w, w, w, g, g, g, g, g, g, w, g, g, g, w, g, g],
    // row 12
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 13
    [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
    // row 14 — south exit to Forest Path at col 7
    [g, g, g, g, g, g, g, eS, g, g, g, g, g, g, g, g, g, g, g, g],
  ],
  npcs: [
    { id: 'gravedigger', name: 'Mortimer the Gravedigger', x: 5, y: 7, dialogueFile: 'gravedigger' },
    { id: 'ghost', name: 'Elara the Ghost', x: 12, y: 6, dialogueFile: 'ghost' },
  ] satisfies NpcDef[],
};
