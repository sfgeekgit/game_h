import type { UnitDef } from './combatTypes.js';
import { WEAPONS } from './weapons.js';

export function createTestHeroes(): UnitDef[] {
  return [
    {
      id: 'hero1', name: 'Aldric the Fighter', side: 'hero',
      maxHp: 50, hp: 50, maxMana: 0, mana: 0, defense: 3,
      x: 1, y: 4, weapon: { ...WEAPONS.short_sword },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.short_sword.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true,
    },
    {
      id: 'hero2', name: 'Elara the Wizard', side: 'hero',
      maxHp: 25, hp: 25, maxMana: 60, mana: 60, defense: 1,
      x: 0, y: 3, weapon: { ...WEAPONS.dagger },
      spells: ['burning_hands', 'magic_missile', 'fireball', 'ice_storm'],
      chargeProgress: 0, chargeTarget: WEAPONS.dagger.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true,
    },
    {
      id: 'hero3', name: 'Rowan the Archer', side: 'hero',
      maxHp: 35, hp: 35, maxMana: 0, mana: 0, defense: 2,
      x: 0, y: 5, weapon: { ...WEAPONS.long_bow },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.long_bow.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true,
    },
    {
      id: 'hero4', name: 'Liora the Cleric', side: 'hero',
      maxHp: 35, hp: 35, maxMana: 40, mana: 40, defense: 2,
      x: 0, y: 4, weapon: { ...WEAPONS.staff },
      spells: ['heal', 'magic_missile'],
      chargeProgress: 0, chargeTarget: WEAPONS.staff.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true,
    },
  ];
}

export function createTestEnemies(): UnitDef[] {
  return [
    {
      id: 'enemy1', name: 'Goblin Warrior', side: 'enemy',
      maxHp: 20, hp: 20, maxMana: 0, mana: 0, defense: 1,
      x: 9, y: 3, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy2', name: 'Goblin Warrior', side: 'enemy',
      maxHp: 20, hp: 20, maxMana: 0, mana: 0, defense: 1,
      x: 9, y: 5, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy3', name: 'Goblin Brute', side: 'enemy',
      maxHp: 30, hp: 30, maxMana: 0, mana: 0, defense: 2,
      x: 10, y: 4, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy4', name: 'Skeleton Archer', side: 'enemy',
      maxHp: 15, hp: 15, maxMana: 0, mana: 0, defense: 0,
      x: 11, y: 4, weapon: { ...WEAPONS.skeleton_bow },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.skeleton_bow.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
  ];
}
