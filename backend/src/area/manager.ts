import { ROOM_REGISTRY } from './registry.js';
import type { MapDef, AreaState, Entity } from '@game_h/shared';
import { getPersistentArea, createArea, getNpcImages, getAreaDefByMapId } from '../db/helpers.js';
import { isAreaLoaded, loadArea } from './store.js';

// Safe to cache indefinitely — area_defs rows are immutable at runtime.
const areaDefIdCache = new Map<string, number>();
const areaIdCache = new Map<string, number>();
// Serializes concurrent first-joins for the same room to prevent duplicate DB rows.
const roomCreating = new Map<string, Promise<number>>();

async function resolveAreaDefId(mapId: string): Promise<number> {
  const cached = areaDefIdCache.get(mapId);
  if (cached !== undefined) return cached;
  const row = await getAreaDefByMapId(mapId);
  if (!row) throw new Error(`No area_def found for map: ${mapId}`);
  areaDefIdCache.set(mapId, row.area_def_id);
  return row.area_def_id;
}

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

export async function enrichWithImages(room: MapDef): Promise<MapDef> {
  const npcFiles = (room.npcs ?? []).map((npc) => npc.dialogueFile);
  const imageMap = await getNpcImages(npcFiles);
  return {
    ...room,
    npcs: (room.npcs ?? []).map((npc) => ({ ...npc, image: imageMap[npc.dialogueFile] })),
  };
}

export function getRoomDef(mapId: string): MapDef {
  const room = ROOM_REGISTRY[mapId];
  if (!room) throw new Error(`Unknown room: ${mapId}`);
  return room;
}

export function getOrCreateRoom(mapId: string): Promise<number> {
  const cachedId = areaIdCache.get(mapId);
  if (cachedId !== undefined && isAreaLoaded(cachedId)) return Promise.resolve(cachedId);

  const inflight = roomCreating.get(mapId);
  if (inflight) return inflight;

  const promise = _loadRoom(mapId).finally(() => roomCreating.delete(mapId));
  roomCreating.set(mapId, promise);
  return promise;
}

async function _loadRoom(mapId: string): Promise<number> {
  const areaDefId = await resolveAreaDefId(mapId);
  const areaRow = await getPersistentArea(areaDefId);
  const areaId = areaRow ? areaRow.area_id : await createArea(areaDefId);
  areaIdCache.set(mapId, areaId);

  if (!isAreaLoaded(areaId)) {
    const enriched = await enrichWithImages(getRoomDef(mapId));
    loadArea(areaId, mapDefToAreaState(enriched));
  }

  return areaId;
}

/** Returns the area_id for a map, using the cache then falling back to DB. Returns undefined if no area row exists. */
export async function findAreaId(mapId: string): Promise<number | undefined> {
  const cached = areaIdCache.get(mapId);
  if (cached !== undefined) return cached;
  const areaDefId = await resolveAreaDefId(mapId).catch(() => undefined);
  if (areaDefId === undefined) return undefined;
  const row = await getPersistentArea(areaDefId);
  return row?.area_id;
}

export const TOWN_SQUARE_MAP_ID = 'town_square';
