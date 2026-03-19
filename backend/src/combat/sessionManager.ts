import { combatTick, createCombatState, createPvpCombatState } from '@game_h/shared';
import type { CombatState, PlayerCommand, UnitSide } from '@game_h/shared';
import { getWeapons, getSpells } from './catalog.js';

const TICK_INTERVAL_MS = 100;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface PlayerInfo {
  side: UnitSide;
  lastSeen: number;
}

interface CombatSession {
  id: string;
  state: CombatState;
  players: Map<number, PlayerInfo>;
  commandQueue: PlayerCommand[];
  tickHandle: ReturnType<typeof setInterval> | null;
  status: 'waiting' | 'active' | 'finished';
  createdAt: number;
}

const sessions = new Map<string, CombatSession>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Public API ---

export function createSession(
  userId: number,
  mode: 'pve' | 'pvp',
): { sessionId: string; side: UnitSide; state: CombatState } {
  const id = generateId();
  const weapons = getWeapons();
  const spells = getSpells();
  const state = mode === 'pvp' ? createPvpCombatState(weapons, spells) : createCombatState(weapons, spells);

  const session: CombatSession = {
    id,
    state,
    players: new Map([[userId, { side: 'hero' as UnitSide, lastSeen: Date.now() }]]),
    commandQueue: [],
    tickHandle: null,
    status: mode === 'pve' ? 'active' : 'waiting',
    createdAt: Date.now(),
  };

  sessions.set(id, session);
  ensureCleanupRunning();

  if (session.status === 'active') {
    startLoop(session);
  }

  return { sessionId: id, side: 'hero', state };
}

export function joinSession(
  sessionId: string,
  userId: number,
): { side: UnitSide; state: CombatState } | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'waiting') return null;

  // Second player joins as enemy side
  session.players.set(userId, { side: 'enemy', lastSeen: Date.now() });

  // Mark enemy units as player-controlled (disable AI)
  for (const unit of session.state.units) {
    if (unit.side === 'enemy') {
      unit.playerControlled = true;
    }
  }

  session.status = 'active';
  startLoop(session);

  return { side: 'enemy', state: session.state };
}

/** Find a waiting PVP session that the given user hasn't created */
export function findWaitingPvpSession(userId: number): string | null {
  for (const [id, session] of sessions) {
    if (session.status === 'waiting' && !session.players.has(userId)) {
      return id;
    }
  }
  return null;
}

export function getState(sessionId: string): CombatState | null {
  return sessions.get(sessionId)?.state ?? null;
}

export function getPlayerSide(sessionId: string, userId: number): UnitSide | null {
  return sessions.get(sessionId)?.players.get(userId)?.side ?? null;
}

export function getSessionStatus(sessionId: string): CombatSession['status'] | null {
  return sessions.get(sessionId)?.status ?? null;
}

export function enqueueCommand(sessionId: string, command: PlayerCommand): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'active') return false;
  session.commandQueue.push(command);
  return true;
}

export function leaveSession(sessionId: string, userId: number): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.players.delete(userId);

  if (session.players.size === 0) {
    stopLoop(session);
    sessions.delete(sessionId);
  } else if (session.status === 'active') {
    // Other player wins by forfeit
    const remainingSide = session.players.values().next().value!.side;
    session.state.outcome = remainingSide === 'hero' ? 'victory' : 'defeat';
    stopLoop(session);
    session.status = 'finished';
  }
}

export function touchSession(sessionId: string, userId: number): void {
  const player = sessions.get(sessionId)?.players.get(userId);
  if (player) player.lastSeen = Date.now();
}

// --- Command Validation ---

export function validateCommand(
  state: CombatState,
  command: PlayerCommand,
  playerSide: UnitSide,
): string | null {
  const unit = state.units.find(u => u.id === command.unitId);
  if (!unit) return 'Unit not found';
  if (!unit.alive) return 'Unit is dead';
  if (unit.side !== playerSide) return 'Not your unit';

  switch (command.type) {
    case 'set_weapon_target': {
      const target = state.units.find(u => u.id === command.targetId);
      if (!target || !target.alive) return 'Invalid target';
      return null;
    }
    case 'cast_spell': {
      const spell = state.spellCatalog[command.spellId];
      if (!spell) return 'Unknown spell';
      if (!unit.spells.includes(command.spellId)) return 'Unit does not know this spell';
      if (unit.mana < spell.manaCost) return 'Not enough mana';
      return null;
    }
    case 'move_unit': {
      const dx = Math.abs(command.toX - unit.x);
      const dy = Math.abs(command.toY - unit.y);
      if (dx + dy !== 1) return 'Not adjacent';
      return null;
    }
    case 'cancel_action':
    case 'toggle_auto_attack':
      return null;
    default:
      return 'Unknown command type';
  }
}

// --- Tick Loop ---

function startLoop(session: CombatSession): void {
  if (session.tickHandle) return;

  session.tickHandle = setInterval(() => {
    if (session.state.outcome !== 'ongoing') {
      stopLoop(session);
      session.status = 'finished';
      return;
    }

    const commands = session.commandQueue.length > 0 ? session.commandQueue.splice(0) : [];
    session.state = combatTick(session.state, TICK_INTERVAL_MS, commands);
  }, TICK_INTERVAL_MS);
}

function stopLoop(session: CombatSession): void {
  if (session.tickHandle) {
    clearInterval(session.tickHandle);
    session.tickHandle = null;
  }
}

// --- Cleanup ---

let cleanupHandle: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning(): void {
  if (!cleanupHandle) {
    cleanupHandle = setInterval(cleanupSessions, 60_000);
  }
}

function cleanupSessions(): void {
  if (sessions.size === 0) {
    if (cleanupHandle) { clearInterval(cleanupHandle); cleanupHandle = null; }
    return;
  }
  const now = Date.now();
  for (const [id, session] of sessions) {
    // Use most recent player activity for timeout, fall back to createdAt
    let lastActivity = session.createdAt;
    for (const player of session.players.values()) {
      if (player.lastSeen > lastActivity) lastActivity = player.lastSeen;
    }
    const expired = now - lastActivity > SESSION_TIMEOUT_MS;
    if (expired || (session.status === 'finished' && now - lastActivity > 60_000)) {
      stopLoop(session);
      sessions.delete(id);
    }
  }
}
