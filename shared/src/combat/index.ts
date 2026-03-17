export type {
  UnitSide, WeaponDef, SpellDef, UnitAction, UnitDef,
  CombatTileType, CombatTile, CombatEvent, CombatState,
  PlayerCommand,
} from './combatTypes.js';

export { WEAPONS } from './weapons.js';
export { SPELLS } from './spells.js';
export { createArena } from './combatMap.js';
export { createTestHeroes, createTestEnemies, createPvpEnemyParty, createPvpMonsters } from './combatData.js';
export { combatTick, createCombatState, createPvpCombatState, manhattanDistance } from './combatEngine.js';
