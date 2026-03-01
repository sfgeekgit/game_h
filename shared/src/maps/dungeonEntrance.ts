import type { MapDef, NpcDef } from '../mapTypes.js';

const p = { type: 'path' as const };
const w = { type: 'wall' as const };
// Exit
const eN = { type: 'exit' as const, exitTarget: 'temple' };

/**
 * Dungeon Entrance — 20×15 ancient stone dungeon.
 *
 * All stone walls and torchlit path. Inner chamber (rows 3-12, cols 3-14).
 * Foreboding atmosphere — the deepest accessible level.
 * Exit: north (10,0) → temple
 * Spawn: (10, 1)
 */
export const dungeonEntrance: MapDef = {
  id: 'dungeon_entrance',
  name: 'Dungeon Entrance',
  width: 20,
  height: 15,
  spawnX: 10,
  spawnY: 1,
  tiles: [
    // row 0 — north exit to Temple at col 10
    [w, w, w, w, w, w, w, w, w, w, eN, w, w, w, w, w, w, w, w, w],
    // row 1 — entry corridor
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 2
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 3 — inner chamber outer wall
    [w, p, p, w, w, w, w, w, w, w, w, w, w, w, w, w, p, p, p, w],
    // row 4 — chamber interior
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 5
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 6
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 7
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 8
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 9
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 10
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 11
    [w, p, p, w, p, p, p, p, p, p, p, p, p, p, w, p, p, p, p, w],
    // row 12 — chamber bottom wall
    [w, p, p, w, w, w, w, w, w, w, w, w, w, w, w, w, p, p, p, w],
    // row 13
    [w, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, w],
    // row 14 — south dead end
    [w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w],
  ],
  npcs: [
    { id: 'dungeon_keeper', name: 'Grimwald the Keeper', x: 5, y: 7, dialogueFile: 'dungeon_keeper' },
    { id: 'adventurer_ghost', name: 'Ghost of Sir Gareth', x: 10, y: 7, dialogueFile: 'adventurer_ghost' },
  ] satisfies NpcDef[],
};
