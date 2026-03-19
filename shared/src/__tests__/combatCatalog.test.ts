import { describe, it, expect } from 'vitest';
import { combatTick, createCombatState, createPvpCombatState } from '../combat/combatEngine.js';
import type { CombatState, PlayerCommand, WeaponDef, SpellDef } from '../combat/combatTypes.js';

// Minimal weapon/spell catalogs for testing — keys must match what combatData.ts references
const defaultAnim = { type: 'slash', ms: 300, particles: 5 };
function makeTestWeapons(): Record<string, WeaponDef> {
  return {
    short_sword: { id: 'short_sword', name: 'Short Sword', damage: 10, castTime: 5, reach: 1, anim: defaultAnim },
    dagger: { id: 'dagger', name: 'Dagger', damage: 6, castTime: 3, reach: 1, anim: defaultAnim },
    long_bow: { id: 'long_bow', name: 'Long Bow', damage: 8, castTime: 8, reach: 5, anim: { type: 'arrow', ms: 400, particles: 4 } },
    staff: { id: 'staff', name: 'Staff', damage: 4, castTime: 4, reach: 1, anim: defaultAnim },
    long_sword: { id: 'long_sword', name: 'Long Sword', damage: 12, castTime: 6, reach: 1, anim: defaultAnim },
    goblin_club: { id: 'goblin_club', name: 'Goblin Club', damage: 5, castTime: 4, reach: 1, anim: defaultAnim },
    skeleton_bow: { id: 'skeleton_bow', name: 'Skeleton Bow', damage: 6, castTime: 7, reach: 4, anim: { type: 'arrow', ms: 400, particles: 3 } },
  };
}

function makeTestSpells(): Record<string, SpellDef> {
  return {
    burning_hands: { id: 'burning_hands', name: 'Burning Hands', damage: 8, manaCost: 5, castTime: 4, reach: 2, aoeRadius: 0, targetType: 'unit', anim: { type: 'fire', ms: 300, particles: 6 } },
    magic_missile: { id: 'magic_missile', name: 'Magic Missile', damage: 12, manaCost: 8, castTime: 6, reach: 5, aoeRadius: 0, targetType: 'unit', anim: { type: 'projectile', ms: 400, particles: 4 } },
    fireball: { id: 'fireball', name: 'Fireball', damage: 20, manaCost: 10, castTime: 10, reach: 6, aoeRadius: 2, targetType: 'tile', anim: { type: 'fire', ms: 500, particles: 8 } },
    ice_storm: { id: 'ice_storm', name: 'Ice Storm', damage: 15, manaCost: 12, castTime: 8, reach: 5, aoeRadius: 2, targetType: 'tile', anim: { type: 'ice', ms: 600, particles: 10 } },
    heal: { id: 'heal', name: 'Heal', damage: -15, manaCost: 8, castTime: 8, reach: 3, aoeRadius: 0, targetType: 'unit', anim: { type: 'heal', ms: 400, particles: 6 } },
  };
}

describe('CombatState carries spellCatalog', () => {
  const weapons = makeTestWeapons();
  const spells = makeTestSpells();

  it('createCombatState embeds the spell catalog in state', () => {
    const state = createCombatState(weapons, spells);
    expect(state.spellCatalog).toBeDefined();
    expect(state.spellCatalog.fireball.name).toBe('Fireball');
    expect(state.spellCatalog.heal.damage).toBe(-15);
  });

  it('createPvpCombatState embeds the spell catalog in state', () => {
    const state = createPvpCombatState(weapons, spells);
    expect(state.spellCatalog).toBeDefined();
    expect(Object.keys(state.spellCatalog).length).toBe(Object.keys(spells).length);
  });

  it('spell catalog survives combat ticks', () => {
    const state = createCombatState(weapons, spells);
    const after = combatTick(state, 100, []);
    expect(after.spellCatalog).toBeDefined();
    expect(after.spellCatalog.fireball).toBe(state.spellCatalog.fireball);
  });
});

describe('combat engine uses spellCatalog from state', () => {
  it('rejects cast_spell command when spell is not in catalog', () => {
    const weapons = makeTestWeapons();
    const spells = makeTestSpells();
    const state = createCombatState(weapons, spells);
    const caster = state.units.find(u => u.spells.length > 0 && u.alive)!;

    // Try to cast a spell that exists in unit's spells array but NOT in catalog
    caster.spells = ['nonexistent_spell'];
    const after = combatTick(state, 100, [{
      type: 'cast_spell', unitId: caster.id, spellId: 'nonexistent_spell',
      targetX: caster.x + 1, targetY: caster.y,
    }]);
    // Should remain idle — spell not found in catalog
    const unit = after.units.find(u => u.id === caster.id)!;
    expect(unit.currentAction.type).toBe('idle');
  });

  it('spell reach is enforced by combat engine', () => {
    const weapons = makeTestWeapons();
    const spells = makeTestSpells();
    spells.short_spell = { id: 'short_spell', name: 'Short', damage: 5, manaCost: 1, castTime: 1, reach: 1, aoeRadius: 0, targetType: 'tile', anim: { type: 'x', ms: 100, particles: 1 } };
    const state = createCombatState(weapons, spells);
    const caster = state.units.find(u => u.spells.length > 0 && u.alive)!;
    caster.spells = ['short_spell'];
    caster.mana = 100;

    // Target a tile that's way out of reach=1
    const after = combatTick(state, 100, [{
      type: 'cast_spell', unitId: caster.id, spellId: 'short_spell',
      targetX: caster.x + 5, targetY: caster.y,
    }]);
    const unit = after.units.find(u => u.id === caster.id)!;
    // Should not be casting — out of range
    expect(unit.currentAction.type).toBe('idle');
    expect(after.events.some(e => e.message.includes('out of range'))).toBe(true);
  });

  it('weapon reach is enforced for auto-attack targeting', () => {
    const weapons = makeTestWeapons();
    // Override all weapons to have reach=1 so no one can attack at range
    for (const w of Object.values(weapons)) w.reach = 1;
    const spells = makeTestSpells();
    const state = createCombatState(weapons, spells);
    // All heroes have reach=1 melee weapons; enemies start at x=6+
    // Heroes start at x=0-1, so enemies are out of melee range
    const hero = state.units.find(u => u.side === 'hero' && u.alive)!;
    const enemy = state.units.find(u => u.side === 'enemy' && u.alive)!;

    // Verify they're far apart
    const dist = Math.abs(hero.x - enemy.x) + Math.abs(hero.y - enemy.y);
    expect(dist).toBeGreaterThan(1);

    // AI won't auto-attack at this range — it should try to move instead
    const after = combatTick(state, 100, []);
    // Enemies should be moving toward heroes, not attacking
    const enemyAfter = after.units.find(u => u.id === enemy.id)!;
    if (enemyAfter.currentAction.type !== 'idle') {
      expect(enemyAfter.currentAction.type).toBe('moving');
    }
  });
});

describe('units get weapon data from catalog', () => {
  it('unit weapon has correct castTime and reach from catalog', () => {
    const weapons = makeTestWeapons();
    const spells = makeTestSpells();
    const state = createCombatState(weapons, spells);
    // combatData.ts assigns weapons by key — verify the properties made it through
    for (const unit of state.units) {
      expect(unit.weapon.castTime).toBeGreaterThan(0);
      expect(unit.weapon.reach).toBeGreaterThanOrEqual(1);
      expect(unit.weapon.anim).toBeDefined();
      expect(unit.weapon.anim.type).toBeTruthy();
    }
  });
});
