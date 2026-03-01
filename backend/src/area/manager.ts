/**
 * Area manager — knows how to load a map definition and get or create
 * the persistent backend area instance for a given area_def.
 */
import {
  townSquare,
  tavern,
  marketplace,
  forestPath,
  castleGates,
  docks,
  herbalistGarden,
  graveyard,
  temple,
  dungeonEntrance,
} from '@game_h/shared';
import type { MapDef, AreaState, Entity } from '@game_h/shared';
import { getPersistentArea, createArea, getNpcImages } from '../db/helpers.js';
import { isAreaLoaded, loadArea } from './store.js';

const MAP_REGISTRY: Record<string, MapDef> = {
  town_square: townSquare,
  tavern,
  marketplace,
  forest_path: forestPath,
  castle_gates: castleGates,
  docks,
  herbalist_garden: herbalistGarden,
  graveyard,
  temple,
  dungeon_entrance: dungeonEntrance,
};

/** Maps each map_id to its area_def_id in the database. */
export const MAP_AREA_DEF_IDS: Record<string, number> = {
  town_square: 1,
  tavern: 2,
  marketplace: 3,
  forest_path: 4,
  castle_gates: 5,
  docks: 6,
  herbalist_garden: 7,
  graveyard: 8,
  temple: 9,
  dungeon_entrance: 10,
};

function mapDefToAreaState(map: MapDef): AreaState {
  const npcEntities: Entity[] = (map.npcs ?? []).map((npc) => ({
    id: npc.id,
    type: 'npc',
    x: npc.x,
    y: npc.y,
    name: npc.name,
    dialogueFile: npc.dialogueFile,
    image: npc.image,
  }));

  return {
    mapId: map.id,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    entities: npcEntities,
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
  let areaRow = await getPersistentArea(areaDefId);
  if (!areaRow) {
    const newId = await createArea(areaDefId);
    areaRow = await getPersistentArea(areaDefId);
    if (!areaRow) throw new Error(`Failed to create area for area_def ${areaDefId}`);
    void newId;
  }

  const areaId = areaRow.area_id;

  if (!isAreaLoaded(areaId)) {
    const map = getMapDef(mapId);
    const npcFiles = (map.npcs ?? []).map((npc) => npc.dialogueFile);
    const imageMap = await getNpcImages(npcFiles);
    const enrichedMap = {
      ...map,
      npcs: (map.npcs ?? []).map((npc) => ({ ...npc, image: imageMap[npc.dialogueFile] })),
    };
    const initialState = mapDefToAreaState(enrichedMap);
    loadArea(areaId, initialState);
  }

  return areaId;
}

/** Legacy constants kept for backward compat */
export const TOWN_SQUARE_DEF_ID = 1;
export const TOWN_SQUARE_MAP_ID = 'town_square';
