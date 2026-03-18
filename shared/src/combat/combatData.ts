import type { UnitDef } from './combatTypes.js';
import { WEAPONS } from './weapons.js';

export function createTestHeroes(): UnitDef[] {
  return [
    {
      id: 'hero1', name: 'Aldric the Fighter', side: 'hero',
      maxHp: 50, hp: 50, maxMana: 0, mana: 0, defense: 3,
      x: 1, y: 4, weapon: { ...WEAPONS.short_sword },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.short_sword.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'hero2', name: 'Elara the Wizard', side: 'hero',
      maxHp: 25, hp: 25, maxMana: 60, mana: 60, defense: 1,
      x: 0, y: 3, weapon: { ...WEAPONS.dagger },
      spells: ['burning_hands', 'magic_missile', 'fireball', 'ice_storm'],
      chargeProgress: 0, chargeTarget: WEAPONS.dagger.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'hero3', name: 'Rowan the Archer', side: 'hero',
      maxHp: 35, hp: 35, maxMana: 0, mana: 0, defense: 2,
      x: 0, y: 5, weapon: { ...WEAPONS.long_bow },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.long_bow.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'hero4', name: 'Liora the Cleric', side: 'hero',
      maxHp: 35, hp: 35, maxMana: 40, mana: 40, defense: 2,
      x: 0, y: 4, weapon: { ...WEAPONS.staff },
      spells: ['heal', 'magic_missile'],
      chargeProgress: 0, chargeTarget: WEAPONS.staff.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
  ];
}

/** Player 2's party for PVP — mirrors the hero party on the right side */
export function createPvpEnemyParty(): UnitDef[] {
  return [
    {
      id: 'pvp1', name: 'Kael the Berserker', side: 'enemy',
      maxHp: 55, hp: 55, maxMana: 0, mana: 0, defense: 2,
      x: 7, y: 4, weapon: { ...WEAPONS.long_sword },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.long_sword.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'pvp2', name: 'Mira the Sorceress', side: 'enemy',
      maxHp: 25, hp: 25, maxMana: 60, mana: 60, defense: 1,
      x: 8, y: 3, weapon: { ...WEAPONS.dagger },
      spells: ['magic_missile', 'fireball', 'ice_storm'],
      chargeProgress: 0, chargeTarget: WEAPONS.dagger.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'pvp3', name: 'Voss the Ranger', side: 'enemy',
      maxHp: 35, hp: 35, maxMana: 0, mana: 0, defense: 2,
      x: 8, y: 5, weapon: { ...WEAPONS.long_bow },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.long_bow.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
    {
      id: 'pvp4', name: 'Thessa the Priestess', side: 'enemy',
      maxHp: 35, hp: 35, maxMana: 40, mana: 40, defense: 2,
      x: 8, y: 4, weapon: { ...WEAPONS.staff },
      spells: ['heal', 'magic_missile'],
      chargeProgress: 0, chargeTarget: WEAPONS.staff.speed,
      currentAction: { type: 'idle' }, autoAttack: false, alive: true, playerControlled: true,
    },
  ];
}

/** NPC monsters for PVP arena — spawned in the middle, AI-controlled, attack anyone */
export function createPvpMonsters(): UnitDef[] {
  return [
    {
      id: 'mon1', name: 'Cave Troll', side: 'monster',
      maxHp: 40, hp: 40, maxMana: 0, mana: 0, defense: 3,
      x: 5, y: 2, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'mon2', name: 'Giant Spider', side: 'monster',
      maxHp: 25, hp: 25, maxMana: 0, mana: 0, defense: 1,
      x: 6, y: 6, weapon: { ...WEAPONS.dagger },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.dagger.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
  ];
}

export function createTestEnemies(): UnitDef[] {
  return [
    {
      id: 'enemy1', name: 'Goblin Warrior', side: 'enemy',
      maxHp: 20, hp: 20, maxMana: 0, mana: 0, defense: 1,
      x: 6, y: 3, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy2', name: 'Goblin Warrior', side: 'enemy',
      maxHp: 20, hp: 20, maxMana: 0, mana: 0, defense: 1,
      x: 6, y: 5, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy3', name: 'Goblin Brute', side: 'enemy',
      maxHp: 30, hp: 30, maxMana: 0, mana: 0, defense: 2,
      x: 7, y: 4, weapon: { ...WEAPONS.goblin_club },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.goblin_club.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
    {
      id: 'enemy4', name: 'Skeleton Archer', side: 'enemy',
      maxHp: 15, hp: 15, maxMana: 0, mana: 0, defense: 0,
      x: 8, y: 4, weapon: { ...WEAPONS.skeleton_bow },
      spells: [], chargeProgress: 0, chargeTarget: WEAPONS.skeleton_bow.speed,
      currentAction: { type: 'idle' }, autoAttack: true, alive: true,
    },
  ];
}
