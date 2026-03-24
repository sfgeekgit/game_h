import { describe, it, expect } from 'vitest';
import { combatTick, createCombatState } from '../combat/combatEngine.js';
import type { CombatState, PlayerCommand, WeaponDef, SpellDef } from '../combat/combatTypes.js';

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

function getUnit(state: CombatState, id: string) {
  return state.units.find(u => u.id === id)!;
}

/** Tick enough to complete a move (MOVE_CHARGE_TIME is 3.0s) */
function tickToCompleteMove(state: CombatState, commands: PlayerCommand[] = []): CombatState {
  return combatTick(state, 3100, commands);
}

describe('Heroes should never get stuck', () => {
  const weapons = makeTestWeapons();
  const spells = makeTestSpells();

  // hero2 (Elara) starts at (0, 3) — left edge of the 9x9 grid

  it('rejected move (off board) does not prevent future moves', () => {
    let state = createCombatState(weapons, spells);
    const hero = getUnit(state, 'hero2');
    expect(hero.x).toBe(0);
    expect(hero.y).toBe(3);

    // Try to move off the left edge — should be rejected
    state = combatTick(state, 100, [{ type: 'move_unit', unitId: 'hero2', toX: -1, toY: 3 }]);
    const afterBad = getUnit(state, 'hero2');
    expect(afterBad.currentAction.type).toBe('idle');
    expect(afterBad.x).toBe(0);

    // Now send a valid move — hero must not be stuck
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero2', toX: 0, toY: 2 }]);
    const afterGood = getUnit(state, 'hero2');
    expect(afterGood.y).toBe(2);
  });

  it('rejected move (into wall) does not prevent future moves', () => {
    let state = createCombatState(weapons, spells);
    // hero1 starts at (1, 4). Walls at (4,3), (4,4), (4,5).
    // Move hero1 close to the wall first
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero1', toX: 2, toY: 4 }]);
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero1', toX: 3, toY: 4 }]);
    expect(getUnit(state, 'hero1').x).toBe(3);

    // Try to move into wall at (4, 4) — should be rejected
    state = combatTick(state, 100, [{ type: 'move_unit', unitId: 'hero1', toX: 4, toY: 4 }]);
    expect(getUnit(state, 'hero1').currentAction.type).toBe('idle');
    expect(getUnit(state, 'hero1').x).toBe(3);

    // Valid move should still work
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero1', toX: 3, toY: 3 }]);
    expect(getUnit(state, 'hero1').y).toBe(3);
  });

  it('rejected move (into occupied tile) does not prevent future moves', () => {
    let state = createCombatState(weapons, spells);
    // hero2 is at (0, 3). Move hero1 to (1, 3) so it's adjacent and occupied.
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero1', toX: 1, toY: 3 }]);
    // Verify hero1 is blocking
    expect(getUnit(state, 'hero1').x).toBe(1);
    expect(getUnit(state, 'hero1').y).toBe(3);

    // hero2 tries to move into hero1's tile — should be rejected
    state = combatTick(state, 100, [{ type: 'move_unit', unitId: 'hero2', toX: 1, toY: 3 }]);
    expect(getUnit(state, 'hero2').currentAction.type).toBe('idle');

    // hero2 should still be able to move elsewhere
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero2', toX: 0, toY: 2 }]);
    expect(getUnit(state, 'hero2').y).toBe(2);
  });

  it('multiple rejected moves in a row do not corrupt hero state', () => {
    let state = createCombatState(weapons, spells);
    // hero2 at (0, 3) — spam invalid moves off the left edge
    for (let i = 0; i < 5; i++) {
      state = combatTick(state, 100, [{ type: 'move_unit', unitId: 'hero2', toX: -1, toY: 3 }]);
    }
    const hero = getUnit(state, 'hero2');
    expect(hero.currentAction.type).toBe('idle');
    expect(hero.x).toBe(0);
    expect(hero.y).toBe(3);
    expect(hero.alive).toBe(true);

    // Still accepts valid move
    state = tickToCompleteMove(state, [{ type: 'move_unit', unitId: 'hero2', toX: 0, toY: 2 }]);
    expect(getUnit(state, 'hero2').y).toBe(2);
  });
});
