import { api } from './api.js';
import type { CombatState, PlayerCommand, UnitSide, WeaponDef, SpellDef } from '@game_h/shared';

export interface CombatSessionResult {
  sessionId: string;
  side: UnitSide;
  state: CombatState;
}

interface StateResult {
  state: CombatState;
  side: UnitSide;
  status: 'waiting' | 'active' | 'finished';
}

export const combatApi = {
  create: (mode: 'pve' | 'pvp') =>
    api.post<CombatSessionResult>('/combat/create', { mode }),

  join: (sessionId: string) =>
    api.post<CombatSessionResult>('/combat/join', { sessionId }),

  getState: (sessionId: string) =>
    api.get<StateResult>(`/combat/state?sessionId=${encodeURIComponent(sessionId)}`),

  sendCommand: (sessionId: string, command: PlayerCommand) =>
    api.post<{ ok: boolean }>('/combat/command', { sessionId, command }),

  leave: (sessionId: string) =>
    api.post<{ ok: boolean }>('/combat/leave', { sessionId }),

  findPvp: () =>
    api.get<CombatSessionResult>('/combat/find-pvp'),

  catalog: () =>
    api.get<{ weapons: Record<string, WeaponDef>; spells: Record<string, SpellDef> }>('/combat/catalog'),
};
