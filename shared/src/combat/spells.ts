import type { SpellDef } from './combatTypes.js';

export const SPELLS: Record<string, SpellDef> = {
  burning_hands: {
    id: 'burning_hands',
    name: 'Burning Hands',
    damage: 12,
    castTime: 12,
    range: 1,
    aoeRadius: 1,
    manaCost: 5,
  },
  magic_missile: {
    id: 'magic_missile',
    name: 'Magic Missile',
    damage: 10,
    castTime: 9,
    range: 999,
    aoeRadius: 0,
    manaCost: 8,
    targetType: 'unit',
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    damage: -15,  // negative = healing
    castTime: 15,
    range: 2,
    aoeRadius: 0,
    manaCost: 10,
    targetType: 'unit',
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    damage: 20,
    castTime: 30,
    range: 8,
    aoeRadius: 3,
    manaCost: 25,
  },
  ice_storm: {
    id: 'ice_storm',
    name: 'Ice Storm',
    damage: 14,
    castTime: 24,
    range: 6,
    aoeRadius: 2,
    manaCost: 18,
  },
};
