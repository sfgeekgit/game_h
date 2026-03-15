export type UnitSide = 'hero' | 'enemy';

export interface WeaponDef {
  id: string;
  name: string;
  damage: number;
  speed: number;       // charge time in seconds
  range: number;       // 1 = melee (adjacent), 2+ = ranged
}

export interface SpellDef {
  id: string;
  name: string;
  damage: number;
  castTime: number;    // charge time in seconds
  range: number;       // 1 = adjacent, 999 = unlimited
  aoeRadius: number;   // 0 = single target, N = tile radius
  manaCost: number;
  targetType?: 'tile' | 'unit';  // 'unit' = tracks target by ID, not tile position
}

export type UnitAction =
  | { type: 'idle' }
  | { type: 'charging_weapon'; targetId: string }
  | { type: 'charging_spell'; spellId: string; targetX: number; targetY: number; targetUnitId?: string }
  | { type: 'moving'; toX: number; toY: number };

export interface UnitDef {
  id: string;
  name: string;
  side: UnitSide;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  defense: number;
  x: number;
  y: number;
  weapon: WeaponDef;
  spells: string[];
  chargeProgress: number;   // 0.0 to 1.0
  chargeTarget: number;     // seconds to fill
  currentAction: UnitAction;
  autoAttack: boolean;
  alive: boolean;
}

export type CombatTileType = 'floor' | 'wall';

export interface CombatTile {
  type: CombatTileType;
}

export interface CombatEvent {
  tick: number;
  message: string;
  unitId?: string;
  targetId?: string;
  damage?: number;
}

export interface CombatState {
  gridWidth: number;
  gridHeight: number;
  tiles: CombatTile[][];
  units: UnitDef[];
  events: CombatEvent[];
  tickCount: number;
  elapsedMs: number;
  outcome: 'ongoing' | 'victory' | 'defeat';
  randomPool: number[];
  randomIndex: number;
}

export type PlayerCommand =
  | { type: 'set_weapon_target'; unitId: string; targetId: string; autoAttack: boolean }
  | { type: 'cast_spell'; unitId: string; spellId: string; targetX: number; targetY: number; targetUnitId?: string }
  | { type: 'move_unit'; unitId: string; toX: number; toY: number }
  | { type: 'cancel_action'; unitId: string }
  | { type: 'toggle_auto_attack'; unitId: string };
