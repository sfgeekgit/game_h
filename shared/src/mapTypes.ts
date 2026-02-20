export type TileType = 'grass' | 'path' | 'water' | 'wall' | 'exit';

export type Direction = 'north' | 'south' | 'east' | 'west';

export type EntityType = 'player' | 'npc';

export interface Tile {
  type: TileType;
}

export interface Entity {
  id: string; // userId for players, npcId for NPCs
  type: EntityType;
  x: number;
  y: number;
  facing: Direction;
  name?: string; // display name (NPCs)
  dialogueFile?: string; // YAML filename for NPC dialogue
}

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Direction;
  dialogueFile: string; // filename in text_content/npcs/
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  /** tiles[row][col], row 0 = top */
  tiles: Tile[][];
  npcs?: NpcDef[];
}

/** Runtime state of an area instance (tiles + live entities) */
export interface AreaState {
  mapId: string;
  width: number;
  height: number;
  tiles: Tile[][];
  entities: Entity[];
}

export interface MoveResult {
  success: boolean;
  reason?: 'out_of_bounds' | 'impassable' | 'entity_collision';
  newX: number;
  newY: number;
  newFacing: Direction;
  exitedArea: boolean;
}
