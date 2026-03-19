import type {
  CombatState, CombatEvent, CombatTile, PlayerCommand, UnitDef, UnitSide, UnitAction,
  WeaponDef, SpellDef,
} from './combatTypes.js';
import { createTestHeroes, createTestEnemies, createPvpEnemyParty, createPvpMonsters } from './combatData.js';
import { createArena } from './combatMap.js';

const MOVE_CHARGE_TIME = 3.0; // seconds to move one tile

// --- Helpers ---

function nextRandom(state: CombatState): number {
  if (state.randomIndex >= state.randomPool.length) {
    // extend pool if needed
    state.randomPool.push(Math.random());
  }
  return state.randomPool[state.randomIndex++];
}

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}


function getUnit(state: CombatState, id: string): UnitDef | undefined {
  return state.units.find(u => u.id === id);
}

function tileOccupied(state: CombatState, x: number, y: number): boolean {
  return state.units.some(u => u.alive && u.x === x && u.y === y);
}

function tilePassable(state: CombatState, x: number, y: number): boolean {
  if (x < 0 || x >= state.gridWidth || y < 0 || y >= state.gridHeight) return false;
  return state.tiles[y][x].type !== 'wall';
}

function findTargetsInRange(state: CombatState, unit: UnitDef): UnitDef[] {
  return state.units.filter(u =>
    u.alive && u.side !== unit.side &&
    manhattanDistance(unit.x, unit.y, u.x, u.y) <= unit.weapon.reach
  );
}

function getUnitsInAoE(
  units: UnitDef[], centerX: number, centerY: number, radius: number, side?: UnitSide,
): UnitDef[] {
  return units.filter(u =>
    u.alive &&
    (side === undefined || u.side === side) &&
    manhattanDistance(u.x, u.y, centerX, centerY) <= radius
  );
}

function addEvent(state: CombatState, message: string, extra?: Partial<CombatEvent>) {
  state.events.push({ tick: state.tickCount, message, ...extra });
  // Keep event log bounded
  if (state.events.length > 200) {
    state.events = state.events.slice(-100);
  }
}

function resetToIdle(unit: UnitDef) {
  unit.currentAction = { type: 'idle' };
  unit.chargeProgress = 0;
}

function makeRandomPool(size = 500): number[] {
  const pool: number[] = [];
  for (let i = 0; i < size; i++) pool.push(Math.random());
  return pool;
}

function calcDamage(baseDamage: number, defense: number, roll: number): number {
  // roll is 0..1 — gives variance of ±30%
  const variance = 0.7 + roll * 0.6;
  const raw = Math.round(baseDamage * variance);
  return Math.max(1, raw - defense);
}

// --- Deep clone state ---

function cloneState(state: CombatState): CombatState {
  return {
    ...state,
    units: state.units.map(u => ({ ...u, weapon: { ...u.weapon }, currentAction: { ...u.currentAction } })),
    events: [...state.events],
    // randomPool shared by reference — entries are never mutated, only appended/read forward
  };
}

// --- AI ---

/** Find the nearest valid target for an AI unit.
 *  - 'enemy' side AI targets heroes (classic PVE behavior)
 *  - 'monster' side AI targets the nearest non-monster (attacks both heroes and enemies)
 */
function findAITargets(state: CombatState, aiUnit: UnitDef): UnitDef[] {
  if (aiUnit.side === 'monster') {
    return state.units.filter(u => u.alive && u.side !== 'monster');
  }
  // enemy-side AI targets heroes
  return state.units.filter(u => u.alive && u.side === 'hero');
}

function runAI(state: CombatState) {
  // AI runs for: non-playerControlled enemies AND all monsters
  const aiUnits = state.units.filter(u => u.alive && !u.playerControlled && (u.side === 'enemy' || u.side === 'monster'));

  for (const unit of aiUnits) {
    if (unit.currentAction.type !== 'idle') continue;

    const targets = findAITargets(state, unit);
    if (targets.length === 0) continue;

    // Find nearest target
    let nearest: UnitDef | null = null;
    let nearestDist = Infinity;
    for (const t of targets) {
      const d = manhattanDistance(unit.x, unit.y, t.x, t.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    if (!nearest) continue;

    if (nearestDist <= unit.weapon.reach) {
      unit.currentAction = { type: 'charging_weapon', targetId: nearest.id };
      unit.chargeTarget = unit.weapon.castTime;
      unit.chargeProgress = 0;
    } else {
      // Move toward nearest target
      const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      ];
      let bestDir: { dx: number; dy: number } | null = null;
      let bestDist = Infinity;
      for (const d of dirs) {
        const nx = unit.x + d.dx;
        const ny = unit.y + d.dy;
        if (!tilePassable(state, nx, ny) || tileOccupied(state, nx, ny)) continue;
        const dist = manhattanDistance(nx, ny, nearest.x, nearest.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = d;
        }
      }
      if (bestDir) {
        unit.currentAction = { type: 'moving', toX: unit.x + bestDir.dx, toY: unit.y + bestDir.dy };
        unit.chargeTarget = MOVE_CHARGE_TIME;
        unit.chargeProgress = 0;
      }
    }
  }
}

// --- Step forward: when an enemy dies, adjacent allies may fill the gap ---

function enemyStepForward(state: CombatState, deadUnit: UnitDef) {
  const heroes = state.units.filter(u => u.alive && u.side === 'hero');
  if (heroes.length === 0) return;

  // Find average hero position
  const avgX = heroes.reduce((s, h) => s + h.x, 0) / heroes.length;
  const avgY = heroes.reduce((s, h) => s + h.y, 0) / heroes.length;

  const neighbors = state.units.filter(u =>
    u.alive && u.side === deadUnit.side &&
    manhattanDistance(u.x, u.y, deadUnit.x, deadUnit.y) === 1 &&
    u.currentAction.type === 'idle'
  );

  // Pick the neighbor that would benefit most from moving closer
  let bestNeighbor: UnitDef | null = null;
  let bestImprovement = 0;
  for (const n of neighbors) {
    const currentDist = manhattanDistance(n.x, n.y, avgX, avgY);
    const newDist = manhattanDistance(deadUnit.x, deadUnit.y, avgX, avgY);
    const improvement = currentDist - newDist;
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestNeighbor = n;
    }
  }

  if (bestNeighbor) {
    bestNeighbor.x = deadUnit.x;
    bestNeighbor.y = deadUnit.y;
    resetToIdle(bestNeighbor);
    addEvent(state, `${bestNeighbor.name} steps forward`, { unitId: bestNeighbor.id });
  }
}

// --- Per-tick range check: cancel weapon/spell charges immediately if target moves out of range ---

function checkTargetRanges(state: CombatState) {
  for (const unit of state.units) {
    if (!unit.alive) continue;
    const action = unit.currentAction;

    if (action.type === 'charging_weapon') {
      const target = getUnit(state, action.targetId);
      if (!target || !target.alive) continue; // let resolveActions handle target death
      if (manhattanDistance(unit.x, unit.y, target.x, target.y) > unit.weapon.reach) {
        const wasAuto = unit.autoAttack;
        resetToIdle(unit);
        unit.autoAttack = false;
        addEvent(state,
          `${unit.name}'s attack fizzles — ${target.name} out of range${wasAuto ? ' (auto off)' : ''}`,
          { unitId: unit.id, fizzled: true },
        );
      }
    } else if (action.type === 'charging_spell' && action.targetUnitId) {
      const spell = state.spellCatalog[action.spellId];
      const target = getUnit(state, action.targetUnitId);
      if (!spell || !target || !target.alive) continue; // let resolveActions handle these
      if (manhattanDistance(unit.x, unit.y, target.x, target.y) > spell.reach) {
        resetToIdle(unit);
        addEvent(state,
          `${unit.name}'s ${spell.name} fizzles — ${target.name} moved out of range`,
          { unitId: unit.id, fizzled: true },
        );
      }
    }
  }
}

// --- Process commands ---

function processCommands(state: CombatState, commands: PlayerCommand[]) {
  for (const cmd of commands) {
    const unit = getUnit(state, cmd.unitId);
    if (!unit || !unit.alive) continue;

    switch (cmd.type) {
      case 'set_weapon_target': {
        const target = getUnit(state, cmd.targetId);
        if (!target || !target.alive) break;
        unit.currentAction = { type: 'charging_weapon', targetId: cmd.targetId };
        unit.chargeTarget = unit.weapon.castTime;
        unit.chargeProgress = 0;
        unit.autoAttack = cmd.autoAttack;
        addEvent(state, `${unit.name} targets ${target.name}`, { unitId: unit.id, targetId: target.id });
        break;
      }
      case 'cast_spell': {
        const spell = state.spellCatalog[cmd.spellId];
        if (!spell) break;
        if (unit.mana < spell.manaCost) {
          addEvent(state, `${unit.name} doesn't have enough mana for ${spell.name}`, { unitId: unit.id });
          break;
        }
        // For unit-targeted spells, range-check against the target's current position
        const rangeCheckX = cmd.targetUnitId
          ? (getUnit(state, cmd.targetUnitId)?.x ?? cmd.targetX)
          : cmd.targetX;
        const rangeCheckY = cmd.targetUnitId
          ? (getUnit(state, cmd.targetUnitId)?.y ?? cmd.targetY)
          : cmd.targetY;
        if (manhattanDistance(unit.x, unit.y, rangeCheckX, rangeCheckY) > spell.reach) {
          addEvent(state, `${spell.name} target is out of range`, { unitId: unit.id });
          break;
        }
        unit.currentAction = {
          type: 'charging_spell',
          spellId: cmd.spellId,
          targetX: cmd.targetX,
          targetY: cmd.targetY,
          targetUnitId: cmd.targetUnitId,
        };
        unit.chargeTarget = spell.castTime;
        unit.chargeProgress = 0;
        addEvent(state, `${unit.name} begins casting ${spell.name}`, { unitId: unit.id });
        break;
      }
      case 'move_unit': {
        if (!tilePassable(state, cmd.toX, cmd.toY)) break;
        if (tileOccupied(state, cmd.toX, cmd.toY)) break;
        if (manhattanDistance(unit.x, unit.y, cmd.toX, cmd.toY) !== 1) break;
        unit.currentAction = { type: 'moving', toX: cmd.toX, toY: cmd.toY };
        unit.chargeTarget = MOVE_CHARGE_TIME;
        unit.chargeProgress = 0;
        break;
      }
      case 'cancel_action':
        if (unit.currentAction.type === 'charging_spell') {
          const spell = state.spellCatalog[unit.currentAction.spellId];
          addEvent(state, `${unit.name}'s ${spell?.name ?? 'spell'} cancelled`, { unitId: unit.id, fizzled: true });
        }
        resetToIdle(unit);
        break;
      case 'toggle_auto_attack':
        unit.autoAttack = !unit.autoAttack;
        addEvent(state, `${unit.name} auto-attack ${unit.autoAttack ? 'ON' : 'OFF'}`, { unitId: unit.id });
        break;
    }
  }
}

// --- Resolve completed charges ---

function resolveActions(state: CombatState) {
  for (const unit of state.units) {
    if (!unit.alive || unit.chargeProgress < 1.0) continue;

    const action = unit.currentAction;

    if (action.type === 'charging_weapon') {
      const target = getUnit(state, action.targetId);
      if (!target || !target.alive) {
        // Target died — if auto-attack, find new target
        if (unit.autoAttack) {
          const inRange = findTargetsInRange(state, unit);
          if (inRange.length > 0) {
            unit.currentAction = { type: 'charging_weapon', targetId: inRange[0].id };
            unit.chargeProgress = 0;
            addEvent(state, `${unit.name} retargets ${inRange[0].name}`, { unitId: unit.id });
            continue;
          }
        }
        resetToIdle(unit);
        continue;
      }

      const dist = manhattanDistance(unit.x, unit.y, target.x, target.y);
      if (dist > unit.weapon.reach) {
        addEvent(state, `${unit.name}'s target is out of range`, { unitId: unit.id });
        resetToIdle(unit);
        continue;
      }

      const roll = nextRandom(state);
      const dmg = calcDamage(unit.weapon.damage, target.defense, roll);
      target.hp -= dmg;
      addEvent(state, `${unit.name} hits ${target.name} for ${dmg} damage`, {
        unitId: unit.id, targetId: target.id, damage: dmg, source: 'weapon',
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        resetToIdle(target);
        addEvent(state, `${target.name} is defeated!`, { unitId: target.id });
        enemyStepForward(state, target);
      }

      // Auto-repeat or go idle
      if (unit.autoAttack && target.alive) {
        unit.chargeProgress = 0;
      } else if (unit.autoAttack && !target.alive) {
        const inRange = findTargetsInRange(state, unit);
        if (inRange.length > 0) {
          unit.currentAction = { type: 'charging_weapon', targetId: inRange[0].id };
          unit.chargeProgress = 0;
        } else {
          resetToIdle(unit);
        }
      } else {
        resetToIdle(unit);
      }
    } else if (action.type === 'charging_spell') {
      const spell = state.spellCatalog[action.spellId];
      if (!spell) {
        resetToIdle(unit);
        continue;
      }

      // Deduct mana
      unit.mana -= spell.manaCost;

      if (spell.aoeRadius > 0) {
        // AoE spell — damage hits everyone (friendly fire); healing only hits allies
        const aoeFilter = spell.damage < 0 ? unit.side : undefined;
        const targets = getUnitsInAoE(state.units, action.targetX, action.targetY, spell.aoeRadius, aoeFilter);
        if (targets.length === 0) {
          addEvent(state, `${unit.name}'s ${spell.name} hits nothing`, { unitId: unit.id, fizzled: true });
        } else {
          addEvent(state, `${unit.name} casts ${spell.name}!`, { unitId: unit.id });
          for (const t of targets) {
            const roll = nextRandom(state);
            const dmg = calcDamage(spell.damage, t.defense, roll);
            t.hp -= dmg;
            addEvent(state, `  ${spell.name} hits ${t.name} for ${dmg} damage`, {
              unitId: unit.id, targetId: t.id, damage: dmg,
            });
            if (t.hp <= 0) {
              t.hp = 0;
              t.alive = false;
              resetToIdle(t);
              addEvent(state, `  ${t.name} is defeated!`, { unitId: t.id });
              if (t.side === 'enemy') enemyStepForward(state, t);
            }
          }
        }
      } else {
        // Single target — find by unit ID (unit-targeted spells) or by tile position
        let target: UnitDef | undefined;
        let fizzleMsg = `${unit.name}'s ${spell.name} fizzles — no target`;
        if (action.targetUnitId) {
          const tracked = state.units.find(u => u.alive && u.id === action.targetUnitId);
          if (tracked && manhattanDistance(unit.x, unit.y, tracked.x, tracked.y) > spell.reach) {
            fizzleMsg = `${unit.name}'s ${spell.name} fizzles — target moved out of range`;
          } else {
            target = tracked;
          }
        } else if (spell.damage < 0) {
          target = state.units.find(u => u.alive && u.side === unit.side && u.x === action.targetX && u.y === action.targetY);
        } else {
          target = state.units.find(u => u.alive && u.side !== unit.side && u.x === action.targetX && u.y === action.targetY);
        }

        if (target) {
          if (spell.damage < 0) {
            // Healing
            const healAmt = Math.min(-spell.damage, target.maxHp - target.hp);
            target.hp += healAmt;
            addEvent(state, `${unit.name} heals ${target.name} for ${healAmt} HP`, {
              unitId: unit.id, targetId: target.id,
            });
          } else {
            const roll = nextRandom(state);
            const dmg = calcDamage(spell.damage, target.defense, roll);
            target.hp -= dmg;
            addEvent(state, `${unit.name} casts ${spell.name} on ${target.name} for ${dmg} damage`, {
              unitId: unit.id, targetId: target.id, damage: dmg,
            });
            if (target.hp <= 0) {
              target.hp = 0;
              target.alive = false;
              resetToIdle(target);
              addEvent(state, `${target.name} is defeated!`, { unitId: target.id });
              if (target.side === 'enemy') enemyStepForward(state, target);
            }
          }
        } else {
          addEvent(state, fizzleMsg, { unitId: unit.id, fizzled: true });
        }
      }

      resetToIdle(unit);
    } else if (action.type === 'moving') {
      if (tilePassable(state, action.toX, action.toY) && !tileOccupied(state, action.toX, action.toY)) {
        unit.x = action.toX;
        unit.y = action.toY;
      }
      resetToIdle(unit);
    }
  }
}

// --- Main tick ---

export function combatTick(state: CombatState, dtMs: number, commands: PlayerCommand[]): CombatState {
  if (state.outcome !== 'ongoing') return state;

  const newState = cloneState(state);

  // Process player commands
  processCommands(newState, commands);

  // Run enemy AI for idle enemies
  runAI(newState);

  // Cancel any weapon/spell charges whose target stepped out of range this tick
  checkTargetRanges(newState);

  // Advance charge bars
  const dtSec = dtMs / 1000;
  for (const unit of newState.units) {
    if (!unit.alive || unit.currentAction.type === 'idle') continue;
    unit.chargeProgress += dtSec / unit.chargeTarget;
    if (unit.chargeProgress > 1.0) unit.chargeProgress = 1.0;
  }

  // Resolve completed actions
  resolveActions(newState);

  // Check outcome (monsters don't count — they're environmental hazards)
  const heroesAlive = newState.units.some(u => u.alive && u.side === 'hero');
  const enemiesAlive = newState.units.some(u => u.alive && u.side === 'enemy');
  if (!heroesAlive) {
    newState.outcome = 'defeat';
    addEvent(newState, 'Your party has been defeated...');
  } else if (!enemiesAlive) {
    newState.outcome = 'victory';
    addEvent(newState, 'Victory! All enemies defeated!');
  }

  newState.tickCount++;
  newState.elapsedMs += dtMs;

  return newState;
}

// --- Factory ---

export function createCombatState(
  weapons: Record<string, WeaponDef>,
  spells: Record<string, SpellDef>,
): CombatState {
  const arena = createArena();
  const heroes = createTestHeroes(weapons);
  const enemies = createTestEnemies(weapons);

  return {
    gridWidth: arena.width,
    gridHeight: arena.height,
    tiles: arena.tiles,
    units: [...heroes, ...enemies],
    events: [{ tick: 0, message: 'Combat begins!' }],
    tickCount: 0,
    elapsedMs: 0,
    outcome: 'ongoing',
    randomPool: makeRandomPool(),
    randomIndex: 0,
    spellCatalog: spells,
  };
}

/** PVP arena: hero party (left) vs enemy party (right) with NPC monsters in the middle */
export function createPvpCombatState(
  weapons: Record<string, WeaponDef>,
  spells: Record<string, SpellDef>,
): CombatState {
  const arena = createArena();
  const heroes = createTestHeroes(weapons);
  const enemyParty = createPvpEnemyParty(weapons);
  const monsters = createPvpMonsters(weapons);

  return {
    gridWidth: arena.width,
    gridHeight: arena.height,
    tiles: arena.tiles,
    units: [...heroes, ...enemyParty, ...monsters],
    events: [{ tick: 0, message: 'PVP Arena — Fight!' }],
    tickCount: 0,
    elapsedMs: 0,
    outcome: 'ongoing',
    randomPool: makeRandomPool(),
    randomIndex: 0,
    spellCatalog: spells,
  };
}
