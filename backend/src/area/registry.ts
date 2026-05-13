/**
 * Room registry — auto-discovers all rooms from shared/src/maps/ at startup.
 *
 * TO ADD A ROOM:
 *   1. Create shared/src/maps/yourRoom.ts exporting a MapDef.
 *      Copy an existing file; set a unique `id` string (e.g. 'your_room').
 *   2. Insert a row in the area_defs DB table:
 *        INSERT INTO area_defs (name, type, map_id) VALUES ('Your Room', 'fixed', 'your_room');
 *      map_id must match the `id` field in your MapDef.
 *   3. Add an entry to shared/src/overworldLayout.ts so it appears on the world map.
 *   4. Add an exit tile in at least one existing room pointing exitTarget: 'your_room',
 *      otherwise players can see it on the overworld but cannot walk into it.
 *
 * TO REMOVE A ROOM:
 *   1. Remove all exitTarget references to it from other room files.
 *   2. Remove its entry from shared/src/overworldLayout.ts.
 *   3. Delete or disable its row in area_defs.
 *   4. Delete the map file from shared/src/maps/.
 *
 * No changes needed in this file — rooms are discovered automatically on startup.
 */
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import type { MapDef } from '@game_h/shared';

const MAPS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../shared/src/maps');

const files = readdirSync(MAPS_DIR).filter(
  (f) => (f.endsWith('.ts') || f.endsWith('.js')) && f !== 'index.ts' && f !== 'index.js',
);

const modules = await Promise.all(
  files.map((f) => import(pathToFileURL(join(MAPS_DIR, f.replace(/\.(ts|js)$/, '.js'))).href)),
);

function isMapDef(v: unknown): v is MapDef {
  return typeof v === 'object' && v !== null && 'id' in v && 'tiles' in v && 'spawnX' in v;
}

const registry: Record<string, MapDef> = {};
for (const mod of modules) {
  for (const value of Object.values(mod as Record<string, unknown>)) {
    if (isMapDef(value)) registry[value.id] = value;
  }
}
export const ROOM_REGISTRY: Readonly<Record<string, MapDef>> = Object.freeze(registry);
