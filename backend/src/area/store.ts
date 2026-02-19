/**
 * In-memory area store — the ONE place that holds live area state.
 *
 * All reads and writes to in-memory map state must go through this module.
 * No other code accesses the areaStore map directly.
 *
 * Each area instance gets its own mutex. The critical section inside
 * withAreaLock must be synchronous only — no await, no I/O.
 */
import { Mutex, withTimeout } from 'async-mutex';
import type { MutexInterface } from 'async-mutex';
import type { AreaState, Entity } from '@game_h/shared';

interface AreaEntry {
  state: AreaState;
  mutex: MutexInterface;
}

// Private — never export or access directly from outside this module.
const areaStore = new Map<number, AreaEntry>();

const LOCK_TIMEOUT_MS = 5000;

export function isAreaLoaded(areaId: number): boolean {
  return areaStore.has(areaId);
}

/** Load an area into memory. No-op if already loaded. */
export function loadArea(areaId: number, initialState: AreaState): void {
  if (areaStore.has(areaId)) return;
  areaStore.set(areaId, {
    state: structuredClone(initialState),
    mutex: withTimeout(new Mutex(), LOCK_TIMEOUT_MS),
  });
}

/** Read current area state (no lock needed — synchronous snapshot). */
export function readAreaState(areaId: number): AreaState | null {
  const entry = areaStore.get(areaId);
  if (!entry) return null;
  // Shallow clone entities array so caller can't mutate store internals.
  return { ...entry.state, entities: [...entry.state.entities] };
}

/**
 * Acquire the area mutex and run fn synchronously against live state.
 *
 * Rules for fn:
 *   - Synchronous only — NO await, NO I/O, NO slow operations.
 *   - Mutate entry.state directly; those mutations persist.
 *   - If fn throws, the lock is released and the error propagates.
 *
 * --- DO ALL ASYNC WORK BEFORE CALLING withAreaLock ---
 * Validate moves, fetch from DB, compute new state outside this call.
 * Once the lock is held, apply the pre-computed change and release immediately.
 * --- DB WRITES AND OTHER ASYNC WORK GO AFTER withAreaLock RETURNS ---
 */
export async function withAreaLock<T>(
  areaId: number,
  fn: (state: AreaState) => T,
): Promise<T> {
  const entry = areaStore.get(areaId);
  if (!entry) throw new Error(`Area ${areaId} not loaded in memory`);

  // --- DO ALL ASYNC WORK BEFORE THIS LINE ---
  const release = await entry.mutex.acquire();
  try {
    // CRITICAL SECTION — synchronous only.
    // Read current map state, apply pre-computed update, write back.
    // DO NOT add async operations here. If you think you need to, redesign.
    return fn(entry.state);
  } finally {
    release(); // always release, even on error
  }
  // --- DB WRITES AND OTHER ASYNC WORK GO AFTER THIS LINE ---
}

/** Find a player entity in the area state (no lock — read-only use). */
export function findPlayerEntity(areaId: number, userId: string): Entity | null {
  const state = readAreaState(areaId);
  if (!state) return null;
  return state.entities.find((e) => e.id === userId && e.type === 'player') ?? null;
}
