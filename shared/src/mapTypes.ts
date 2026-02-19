export type TileType = 'grass' | 'path' | 'water' | 'wall' | 'exit';

export type Direction = 'north' | 'south' | 'east' | 'west';

export type EntityType = 'player';

export interface Tile {
  type: TileType;
}

export interface Entity {
  id: string; // userId for players
  type: EntityType;
  x: number;
  y: number;
  facing: Direction;
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
  reason?: 'out_of_bounds' | 'impassable';
  newX: number;
  newY: number;
  newFacing: Direction;
  exitedArea: boolean;
}
