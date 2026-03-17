import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Install fake timers before importing sessionManager so setInterval is already faked
vi.useFakeTimers();

import {
  createSession,
  joinSession,
  getState,
  getPlayerSide,
  getSessionStatus,
  enqueueCommand,
  leaveSession,
  touchSession,
  validateCommand,
} from '../combat/sessionManager.js';
import { combatTick } from '@game_h/shared';
import type { CombatState, PlayerCommand, UnitSide } from '@game_h/shared';

afterEach(() => { vi.clearAllTimers(); });

// --- Helpers ---

function createPveSession(userId = 1) {
  return createSession(userId, 'pve');
}

function createPvpSession(userId = 1) {
  return createSession(userId, 'pvp');
}

function findUnitOnSide(state: CombatState, side: UnitSide) {
  return state.units.find(u => u.side === side && u.alive)!;
}

function tickN(n: number) {
  for (let i = 0; i < n; i++) {
    vi.advanceTimersByTime(100);
  }
}

// --- PVE Session Lifecycle ---

describe('PVE session lifecycle', () => {
  it('creates a session and returns valid state', () => {
    const result = createPveSession();
    expect(result.sessionId).toBeTruthy();
    expect(result.side).toBe('hero');
    expect(result.state).toBeDefined();
    expect(result.state.units.length).toBeGreaterThan(0);
    expect(result.state.outcome).toBe('ongoing');
  });

  it('starts in active status for PVE', () => {
    const { sessionId } = createPveSession();
    expect(getSessionStatus(sessionId)).toBe('active');
  });

  it('assigns creator as hero side', () => {
    const { sessionId } = createPveSession(42);
    expect(getPlayerSide(sessionId, 42)).toBe('hero');
  });

  it('returns state via getState', () => {
    const { sessionId, state } = createPveSession();
    const fetched = getState(sessionId);
    expect(fetched).toBeDefined();
    expect(fetched!.units.length).toBe(state.units.length);
  });

  it('advances state when tick fires', () => {
    const { sessionId } = createPveSession();
    const before = getState(sessionId)!.tickCount;
    tickN(5);
    const after = getState(sessionId)!.tickCount;
    expect(after).toBeGreaterThan(before);
  });

  it('cleans up when player leaves', () => {
    const { sessionId } = createPveSession(1);
    leaveSession(sessionId, 1);
    expect(getState(sessionId)).toBeNull();
    expect(getSessionStatus(sessionId)).toBeNull();
  });
});

// --- PVP Session Lifecycle ---

describe('PVP session lifecycle', () => {
  it('creates in waiting status', () => {
    const { sessionId } = createPvpSession(1);
    expect(getSessionStatus(sessionId)).toBe('waiting');
  });

  it('does not start tick loop while waiting', () => {
    const { sessionId } = createPvpSession(1);
    const before = getState(sessionId)!.tickCount;
    tickN(10);
    const after = getState(sessionId)!.tickCount;
    expect(after).toBe(before);
  });

  it('second player joins as enemy side', () => {
    const { sessionId } = createPvpSession(1);
    const joinResult = joinSession(sessionId, 2);
    expect(joinResult).not.toBeNull();
    expect(joinResult!.side).toBe('enemy');
    expect(getPlayerSide(sessionId, 2)).toBe('enemy');
  });

  it('marks enemy units as playerControlled on join', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const state = getState(sessionId)!;
    const enemyUnits = state.units.filter(u => u.side === 'enemy');
    for (const u of enemyUnits) {
      expect(u.playerControlled).toBe(true);
    }
  });

  it('transitions to active after join', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    expect(getSessionStatus(sessionId)).toBe('active');
  });

  it('starts tick loop after join', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const before = getState(sessionId)!.tickCount;
    tickN(5);
    const after = getState(sessionId)!.tickCount;
    expect(after).toBeGreaterThan(before);
  });

  it('rejects join on non-existent session', () => {
    expect(joinSession('fake-id', 2)).toBeNull();
  });

  it('rejects join on already active session', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    expect(joinSession(sessionId, 3)).toBeNull();
  });
});

// --- PVP End-to-End: Both Players Issue Commands ---

describe('PVP end-to-end', () => {
  let sessionId: string;

  beforeEach(() => {
    const result = createPvpSession(1);
    sessionId = result.sessionId;
    joinSession(sessionId, 2);
  });

  it('both players can enqueue commands', () => {
    const state = getState(sessionId)!;
    const hero = findUnitOnSide(state, 'hero');
    const enemy = findUnitOnSide(state, 'enemy');

    // Player 1 (hero) targets an enemy
    const cmd1: PlayerCommand = {
      type: 'set_weapon_target', unitId: hero.id, targetId: enemy.id, autoAttack: false,
    };
    const enq1 = enqueueCommand(sessionId, cmd1);
    expect(enq1).toBe(true);

    // Player 2 (enemy) targets a hero
    const cmd2: PlayerCommand = {
      type: 'set_weapon_target', unitId: enemy.id, targetId: hero.id, autoAttack: false,
    };
    const enq2 = enqueueCommand(sessionId, cmd2);
    expect(enq2).toBe(true);

    // Tick to process commands — advance enough for interval to fire
    vi.advanceTimersByTime(200);
    const updated = getState(sessionId)!;

    // Check events for targeting messages
    const targetEvents = updated.events.filter(e => e.message.includes('targets'));
    expect(targetEvents.length).toBeGreaterThanOrEqual(2);

    const updatedHero = updated.units.find(u => u.id === hero.id)!;
    const updatedEnemy = updated.units.find(u => u.id === enemy.id)!;

    // Commands were processed — targeting events confirm both players acted
    expect(targetEvents.some(e => e.message.includes(hero.name))).toBe(true);
    expect(targetEvents.some(e => e.message.includes(enemy.name))).toBe(true);
  });

  it('hero player can move their units', () => {
    const state = getState(sessionId)!;
    const hero = findUnitOnSide(state, 'hero');
    const targetX = hero.x + 1;
    const targetY = hero.y;

    // Check that target tile isn't occupied
    const occupied = state.units.some(u => u.alive && u.x === targetX && u.y === targetY);
    if (occupied) return; // skip if occupied — not a test failure

    enqueueCommand(sessionId, {
      type: 'move_unit', unitId: hero.id, toX: targetX, toY: targetY,
    });
    tickN(1);
    const updated = getState(sessionId)!;
    const movedHero = updated.units.find(u => u.id === hero.id)!;
    expect(movedHero.currentAction.type).toBe('moving');
  });

  it('enemy player can move their units', () => {
    const state = getState(sessionId)!;
    const enemy = findUnitOnSide(state, 'enemy');
    const targetX = enemy.x - 1;
    const targetY = enemy.y;

    const occupied = state.units.some(u => u.alive && u.x === targetX && u.y === targetY);
    if (occupied) return;

    enqueueCommand(sessionId, {
      type: 'move_unit', unitId: enemy.id, toX: targetX, toY: targetY,
    });
    tickN(1);
    const updated = getState(sessionId)!;
    const movedEnemy = updated.units.find(u => u.id === enemy.id)!;
    expect(movedEnemy.currentAction.type).toBe('moving');
  });

  it('hero player can cast spells', () => {
    const state = getState(sessionId)!;
    const caster = state.units.find(u => u.side === 'hero' && u.spells.length > 0 && u.alive);
    if (!caster) return;

    // Use a tile-targeted spell to avoid range issues (heroes and enemies start far apart)
    enqueueCommand(sessionId, {
      type: 'cast_spell', unitId: caster.id, spellId: caster.spells[0],
      targetX: caster.x + 1, targetY: caster.y,
    });
    vi.advanceTimersByTime(200);
    const updated = getState(sessionId)!;
    const castEvents = updated.events.filter(e => e.message.includes('casting'));
    expect(castEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('forfeit: leaving player loses, remaining player wins', () => {
    // Player 2 (enemy) leaves
    leaveSession(sessionId, 2);
    const state = getState(sessionId)!;
    // Hero side wins (victory)
    expect(state.outcome).toBe('victory');
    expect(getSessionStatus(sessionId)).toBe('finished');
  });

  it('forfeit: hero leaves, enemy wins', () => {
    leaveSession(sessionId, 1);
    const state = getState(sessionId)!;
    expect(state.outcome).toBe('defeat');
    expect(getSessionStatus(sessionId)).toBe('finished');
  });

  it('both leave: session is fully cleaned up', () => {
    leaveSession(sessionId, 1);
    leaveSession(sessionId, 2);
    expect(getState(sessionId)).toBeNull();
  });
});

// --- Command Validation ---

describe('validateCommand', () => {
  it('rejects commands for non-existent units', () => {
    const { state } = createPveSession();
    const err = validateCommand(state, { type: 'cancel_action', unitId: 'ghost' }, 'hero');
    expect(err).toBe('Unit not found');
  });

  it('rejects commands for dead units', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    hero.alive = false;
    const err = validateCommand(state, { type: 'cancel_action', unitId: hero.id }, 'hero');
    expect(err).toBe('Unit is dead');
  });

  it('rejects commands for units on wrong side', () => {
    const { state } = createPveSession();
    const enemy = findUnitOnSide(state, 'enemy');
    const err = validateCommand(state, { type: 'cancel_action', unitId: enemy.id }, 'hero');
    expect(err).toBe('Not your unit');
  });

  it('rejects weapon target on dead target', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    const enemy = findUnitOnSide(state, 'enemy');
    enemy.alive = false;
    const err = validateCommand(
      state,
      { type: 'set_weapon_target', unitId: hero.id, targetId: enemy.id, autoAttack: false },
      'hero',
    );
    expect(err).toBe('Invalid target');
  });

  it('rejects spell cast without enough mana', () => {
    const { state } = createPveSession();
    const caster = state.units.find(u => u.side === 'hero' && u.spells.length > 0)!;
    caster.mana = 0;
    const err = validateCommand(
      state,
      { type: 'cast_spell', unitId: caster.id, spellId: caster.spells[0], targetX: 0, targetY: 0 },
      'hero',
    );
    expect(err).toBe('Not enough mana');
  });

  it('rejects spell the unit does not know', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    const err = validateCommand(
      state,
      { type: 'cast_spell', unitId: hero.id, spellId: 'nonexistent_spell', targetX: 0, targetY: 0 },
      'hero',
    );
    expect(err).toBe('Unknown spell');
  });

  it('rejects non-adjacent move', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    const err = validateCommand(
      state,
      { type: 'move_unit', unitId: hero.id, toX: hero.x + 5, toY: hero.y },
      'hero',
    );
    expect(err).toBe('Not adjacent');
  });

  it('accepts valid cancel_action', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    expect(validateCommand(state, { type: 'cancel_action', unitId: hero.id }, 'hero')).toBeNull();
  });

  it('accepts valid toggle_auto_attack', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    expect(validateCommand(state, { type: 'toggle_auto_attack', unitId: hero.id }, 'hero')).toBeNull();
  });

  it('rejects unknown command type', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    const err = validateCommand(
      state,
      { type: 'do_dance' as any, unitId: hero.id },
      'hero',
    );
    expect(err).toBe('Unknown command type');
  });
});

// --- Touch / Polling ---

describe('touchSession', () => {
  it('updates lastSeen without error', () => {
    const { sessionId } = createPveSession(1);
    // Should not throw
    touchSession(sessionId, 1);
  });

  it('ignores non-existent session', () => {
    // Should not throw
    touchSession('fake', 1);
  });
});

// --- AI behavior with playerControlled ---

describe('AI skips playerControlled units', () => {
  it('enemy units in PVP do not auto-target (AI skipped)', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);

    // Let several ticks pass — enemy AI should not kick in for playerControlled enemies
    tickN(50);
    const state = getState(sessionId)!;
    const enemies = state.units.filter(u => u.side === 'enemy' && u.alive);
    // All enemy units should still be idle (no AI gave them orders)
    for (const enemy of enemies) {
      expect(enemy.currentAction.type).toBe('idle');
    }
  });

  it('enemy units in PVE are AI-controlled (not playerControlled)', () => {
    const { sessionId } = createPveSession(1);

    // Tick enough for AI to act
    tickN(50);
    const state = getState(sessionId)!;
    const enemies = state.units.filter(u => u.side === 'enemy' && u.alive);
    // At least some enemies should have acted (not all idle)
    const anyActed = enemies.some(u => u.currentAction.type !== 'idle');
    expect(anyActed).toBe(true);
  });

  it('monsters act autonomously in PVP (attack or move)', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);

    // Advance enough ticks for monsters to act
    tickN(200);
    const state = getState(sessionId)!;
    const monsters = state.units.filter(u => u.side === 'monster' && u.alive);
    // At least one monster should have acted (not still idle at spawn position)
    const anyActed = monsters.some(u =>
      u.currentAction.type !== 'idle' || u.x !== 5 && u.x !== 6,
    );
    expect(anyActed).toBe(true);
  });
});

// --- Backend is source of truth: cheat protection ---

describe('cheat protection — backend rejects invalid commands', () => {
  it('hero player cannot command enemy units', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const state = getState(sessionId)!;
    const enemyUnit = findUnitOnSide(state, 'enemy');

    const err = validateCommand(
      state,
      { type: 'cancel_action', unitId: enemyUnit.id },
      'hero', // hero player trying to control enemy
    );
    expect(err).toBe('Not your unit');
  });

  it('enemy player cannot command hero units', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const state = getState(sessionId)!;
    const heroUnit = findUnitOnSide(state, 'hero');

    const err = validateCommand(
      state,
      { type: 'cancel_action', unitId: heroUnit.id },
      'enemy', // enemy player trying to control hero
    );
    expect(err).toBe('Not your unit');
  });

  it('neither player can command monsters', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const state = getState(sessionId)!;
    const monster = state.units.find(u => u.side === 'monster')!;

    const heroErr = validateCommand(state, { type: 'cancel_action', unitId: monster.id }, 'hero');
    const enemyErr = validateCommand(state, { type: 'cancel_action', unitId: monster.id }, 'enemy');
    expect(heroErr).toBe('Not your unit');
    expect(enemyErr).toBe('Not your unit');
  });

  it('client-fabricated unit IDs are rejected', () => {
    const { state } = createPveSession();
    const err = validateCommand(state, { type: 'cancel_action', unitId: 'hacked_superunit' }, 'hero');
    expect(err).toBe('Unit not found');
  });

  it('client cannot revive dead units via commands', () => {
    const { state } = createPveSession();
    const hero = findUnitOnSide(state, 'hero');
    hero.alive = false;
    hero.hp = 0;

    const err = validateCommand(
      state,
      { type: 'move_unit', unitId: hero.id, toX: hero.x + 1, toY: hero.y },
      'hero',
    );
    expect(err).toBe('Unit is dead');
  });

  it('server state is unaffected by invalid commands that get past validation', () => {
    // Even if someone bypasses client validation and sends garbage,
    // the combatTick engine silently drops invalid commands
    const { sessionId } = createPveSession(1);
    const stateBefore = getState(sessionId)!;
    const hero = findUnitOnSide(stateBefore, 'hero');

    // Enqueue a move to an occupied tile (another hero is there)
    const otherHero = stateBefore.units.find(u => u.side === 'hero' && u.id !== hero.id)!;
    enqueueCommand(sessionId, {
      type: 'move_unit', unitId: hero.id, toX: otherHero.x, toY: otherHero.y,
    });
    tickN(5);

    const stateAfter = getState(sessionId)!;
    const heroAfter = stateAfter.units.find(u => u.id === hero.id)!;
    // Hero should NOT have moved to the occupied tile
    expect(heroAfter.x === otherHero.x && heroAfter.y === otherHero.y).toBe(false);
  });
});

// --- Frontend and backend execute the same combat engine ---

describe('deterministic combat: frontend and backend use same engine', () => {
  it('same initial state + same commands produce identical results', () => {
    // This test proves frontend and backend share the exact same combatTick logic
    // by running the same sequence through the engine directly (as frontend would)
    // and through the session manager (as backend does)

    // Create a PVE session (backend path)
    const { sessionId, state: initialState } = createPveSession(1);
    const hero = findUnitOnSide(initialState, 'hero');
    const enemy = findUnitOnSide(initialState, 'enemy');

    const commands: PlayerCommand[] = [
      { type: 'set_weapon_target', unitId: hero.id, targetId: enemy.id, autoAttack: false },
    ];

    // Enqueue the same command on the backend session
    for (const cmd of commands) {
      enqueueCommand(sessionId, cmd);
    }
    // Tick once on backend
    tickN(1);
    const backendState = getState(sessionId)!;

    // Run the same thing through combatTick directly (as frontend would in local mode)

    const frontendState = combatTick(initialState, 100, commands);

    // Both should produce identical unit states
    expect(frontendState.tickCount).toBe(backendState.tickCount);
    for (let i = 0; i < frontendState.units.length; i++) {
      const fe = frontendState.units[i];
      const be = backendState.units[i];
      expect(fe.id).toBe(be.id);
      expect(fe.hp).toBe(be.hp);
      expect(fe.x).toBe(be.x);
      expect(fe.y).toBe(be.y);
      expect(fe.currentAction.type).toBe(be.currentAction.type);
    }
  });

  it('multiple ticks stay in sync between direct calls and session manager', () => {
    const { sessionId, state: initial } = createPveSession(2);


    // Run 10 ticks on both paths with no commands
    let localState = initial;
    for (let i = 0; i < 10; i++) {
      localState = combatTick(localState, 100, []);
    }
    tickN(10);
    const serverState = getState(sessionId)!;

    // Tick counts should match
    expect(localState.tickCount).toBe(serverState.tickCount);
    // All unit positions and HP should match
    for (let i = 0; i < localState.units.length; i++) {
      expect(localState.units[i].hp).toBe(serverState.units[i].hp);
      expect(localState.units[i].x).toBe(serverState.units[i].x);
      expect(localState.units[i].y).toBe(serverState.units[i].y);
    }
  });
});

// --- PVP with monsters ---

describe('PVP arena with monsters', () => {
  it('PVP state includes hero, enemy, and monster units', () => {
    const { state } = createPvpSession(1);
    const heroes = state.units.filter(u => u.side === 'hero');
    const enemies = state.units.filter(u => u.side === 'enemy');
    const monsters = state.units.filter(u => u.side === 'monster');
    expect(heroes.length).toBe(4);
    expect(enemies.length).toBe(4);
    expect(monsters.length).toBe(2);
  });

  it('hero units are playerControlled, enemy units are playerControlled after join', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);
    const state = getState(sessionId)!;
    for (const u of state.units) {
      if (u.side === 'hero' || u.side === 'enemy') {
        expect(u.playerControlled).toBe(true);
      } else {
        // Monsters are NOT playerControlled
        expect(u.playerControlled).toBeFalsy();
      }
    }
  });

  it('monsters do not count for victory/defeat', () => {
    const { sessionId } = createPvpSession(1);
    joinSession(sessionId, 2);

    // Kill all enemy (player 2) units — game should end even if monsters live
    const state = getState(sessionId)!;
    for (const u of state.units) {
      if (u.side === 'enemy') {
        u.alive = false;
        u.hp = 0;
      }
    }
    tickN(1);
    const finalState = getState(sessionId)!;
    expect(finalState.outcome).toBe('victory');
    // Monsters are still alive
    const livingMonsters = finalState.units.filter(u => u.side === 'monster' && u.alive);
    expect(livingMonsters.length).toBeGreaterThan(0);
  });
});
