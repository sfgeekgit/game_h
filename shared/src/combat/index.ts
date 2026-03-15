export type {
  UnitSide, WeaponDef, SpellDef, UnitAction, UnitDef,
  CombatTileType, CombatTile, CombatEvent, CombatState,
  PlayerCommand,
} from './combatTypes.js';

export { WEAPONS } from './weapons.js';
export { SPELLS } from './spells.js';
export { createArena } from './combatMap.js';
export { createTestHeroes, createTestEnemies } from './combatData.js';
export { combatTick, createCombatState, manhattanDistance } from './combatEngine.js';
