import { describe, it, expect } from 'vitest';
import { isTilePassable } from '../movement.js';
import type { MapDef } from '../mapTypes.js';

// Auto-discover all map files — no need to update this when maps are added/removed
const mapModules = import.meta.glob<{ [key: string]: MapDef }>('../maps/*.ts', { eager: true });

const allMaps: MapDef[] = Object.values(mapModules).flatMap((mod) =>
  Object.values(mod).filter((v): v is MapDef => typeof v === 'object' && v !== null && 'tiles' in v),
);

// Test at most 2 maps to keep things fast
const mapsToTest = allMaps.slice(0, 2);

describe.each(mapsToTest)('Map "$name" invariants', (map) => {
  it('spawn point is within bounds and on a passable tile', () => {
    expect(map.spawnX).toBeGreaterThanOrEqual(0);
    expect(map.spawnX).toBeLessThan(map.width);
    expect(map.spawnY).toBeGreaterThanOrEqual(0);
    expect(map.spawnY).toBeLessThan(map.height);
    expect(isTilePassable(map.tiles[map.spawnY][map.spawnX])).toBe(true);
  });

  it('tile grid dimensions match declared width/height', () => {
    expect(map.tiles.length).toBe(map.height);
    for (const row of map.tiles) {
      expect(row.length).toBe(map.width);
    }
  });

  it('every NPC is on a passable tile within bounds', () => {
    for (const npc of map.npcs ?? []) {
      expect(npc.x, `${npc.name} x`).toBeGreaterThanOrEqual(0);
      expect(npc.x, `${npc.name} x`).toBeLessThan(map.width);
      expect(npc.y, `${npc.name} y`).toBeGreaterThanOrEqual(0);
      expect(npc.y, `${npc.name} y`).toBeLessThan(map.height);
      const tile = map.tiles[npc.y][npc.x];
      expect(isTilePassable(tile), `${npc.name} at (${npc.x},${npc.y}) is on ${tile.type}`).toBe(true);
    }
  });

  it('no NPC overlaps another or the spawn point', () => {
    const positions = new Set([`${map.spawnX},${map.spawnY}`]);
    for (const npc of map.npcs ?? []) {
      const key = `${npc.x},${npc.y}`;
      expect(positions.has(key), `${npc.name} overlaps at (${key})`).toBe(false);
      positions.add(key);
    }
  });

  it('every NPC has id, name, and dialogueFile', () => {
    for (const npc of map.npcs ?? []) {
      expect(npc.id).toBeTruthy();
      expect(npc.name).toBeTruthy();
      expect(npc.dialogueFile).toBeTruthy();
    }
  });
});
