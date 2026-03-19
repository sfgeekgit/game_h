export type UnitSide = 'hero' | 'enemy' | 'monster';

export interface AnimDef {
  type: string;       // animation name — references an entry in the source file registries
  ms: number;         // how long the effect plays
  particles: number;  // number of particles to spawn
}

export interface WeaponDef {
  id: string;
  name: string;
  damage: number;
  castTime: number;    // charge time in seconds (DB: cast_time)
  reach: number;       // 1 = melee (adjacent), 2+ = ranged (DB: reach)
  anim: AnimDef;
}

export interface SpellDef {
  id: string;
  name: string;
  damage: number;
  castTime: number;       // charge time in seconds (DB: cast_time)
  reach: number;          // 1 = adjacent, 999 = unlimited (DB: reach)
  aoeRadius: number;      // 0 = single target, N = tile radius (DB: aoe_radius)
  manaCost: number;       // DB: mana_cost
  targetType?: 'tile' | 'unit';  // 'unit' = tracks target by ID (DB: target_type)
  anim: AnimDef;
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
  playerControlled?: boolean;  // if true, AI skips this unit (human controls it)
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
  fizzled?: boolean;   // true when a charge was cancelled without resolving
  source?: 'weapon' | 'spell';  // discriminates weapon hits from spell damage
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
  spellCatalog: Record<string, SpellDef>;
}

export type PlayerCommand =
  | { type: 'set_weapon_target'; unitId: string; targetId: string; autoAttack: boolean }
  | { type: 'cast_spell'; unitId: string; spellId: string; targetX: number; targetY: number; targetUnitId?: string }
  | { type: 'move_unit'; unitId: string; toX: number; toY: number }
  | { type: 'cancel_action'; unitId: string }
  | { type: 'toggle_auto_attack'; unitId: string };
