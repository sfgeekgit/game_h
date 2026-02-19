/**
 * Area manager — knows how to load a map definition and get or create
 * the persistent backend area instance for a given area_def.
 *
 * This is the only place that bridges DB area records and the in-memory store.
 */
import { townSquare } from '@game_h/shared';
import type { MapDef, AreaState } from '@game_h/shared';
import { getPersistentArea, createArea } from '../db/helpers.js';
import { isAreaLoaded, loadArea } from './store.js';

const MAP_REGISTRY: Record<string, MapDef> = {
  town_square: townSquare,
};

function mapDefToAreaState(map: MapDef): AreaState {
  return {
    mapId: map.id,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    entities: [], // player entities are added when players join
  };
}

/**
 * Get the map definition for a given map_id.
 * Throws if the map_id is not registered.
 */
export function getMapDef(mapId: string): MapDef {
  const map = MAP_REGISTRY[mapId];
  if (!map) throw new Error(`Unknown map: ${mapId}`);
  return map;
}

/**
 * Get or create the single persistent area instance for the given area_def_id.
 * Loads the area into memory if not already loaded.
 * Returns the area_id.
 */
export async function getOrCreatePersistentArea(
  areaDefId: number,
  mapId: string,
): Promise<number> {
  // Get or create the DB record
  let areaRow = await getPersistentArea(areaDefId);
  if (!areaRow) {
    const newId = await createArea(areaDefId);
    areaRow = await getPersistentArea(areaDefId);
    if (!areaRow) throw new Error(`Failed to create area for area_def ${areaDefId}`);
    void newId; // insertId used by getPersistentArea re-fetch
  }

  const areaId = areaRow.area_id;

  // Load into memory if not already there (e.g. after server restart)
  if (!isAreaLoaded(areaId)) {
    const map = getMapDef(mapId);
    const initialState = mapDefToAreaState(map);
    loadArea(areaId, initialState);
  }

  return areaId;
}

/** The Town Square area_def_id — the only area in the prototype. */
export const TOWN_SQUARE_DEF_ID = 1;
export const TOWN_SQUARE_MAP_ID = 'town_square';
