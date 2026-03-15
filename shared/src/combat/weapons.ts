import type { WeaponDef } from './combatTypes.js';

export const WEAPONS: Record<string, WeaponDef> = {
  short_sword:  { id: 'short_sword',  name: 'Short Sword',  damage: 8,  speed: 9,    range: 1 },
  long_sword:   { id: 'long_sword',   name: 'Long Sword',   damage: 12, speed: 12,   range: 1 },
  dagger:       { id: 'dagger',       name: 'Dagger',       damage: 5,  speed: 4.5,  range: 1 },
  staff:        { id: 'staff',        name: 'Staff',        damage: 4,  speed: 7.5,  range: 1 },
  long_bow:     { id: 'long_bow',     name: 'Long Bow',     damage: 6,  speed: 12,   range: 6 },
  short_bow:    { id: 'short_bow',    name: 'Short Bow',    damage: 4,  speed: 7.5,  range: 4 },
  goblin_club:  { id: 'goblin_club',  name: 'Goblin Club',  damage: 6,  speed: 10.5, range: 1 },
  skeleton_bow: { id: 'skeleton_bow', name: 'Skeleton Bow', damage: 5,  speed: 12,   range: 5 },
};
