import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Application, Container, Graphics, Text, Rectangle } from 'pixi.js';
import {
  combatTick, createCombatState, manhattanDistance, SPELLS,
} from '@game_h/shared';
import type {
  CombatState, PlayerCommand, UnitDef, UnitSide, SpellDef, UnitAction,
} from '@game_h/shared';
import { SPELL_ANIM_REGISTRY, type SpellEffectState } from '../spellAnimations.js';
import { WEAPON_ANIM_REGISTRY } from '../weaponAnimations.js';
import { combatApi } from '../combatApi.js';

// Merged registry for single-lookup in the hot render path
const ANIM_REGISTRY: Record<string, typeof SPELL_ANIM_REGISTRY[string]> = {
  ...SPELL_ANIM_REGISTRY,
  ...WEAPON_ANIM_REGISTRY,
};

// --- Pure helpers (outside component) ---

function chargeColor(actionType: UnitAction['type']): number {
  if (actionType === 'charging_spell') return 0x9333ea;
  if (actionType === 'moving') return 0x2ecc71;
  return 0xf39c12;
}

function unitBodyColor(unit: UnitDef, isSelected: boolean, mySide: UnitSide): number {
  if (!unit.alive) return 0x555555;
  if (unit.side === mySide) return isSelected ? 0xe74c3c : 0x2980b9;
  if (unit.side === 'monster') return 0x8b4513; // brown for monsters
  return 0xc0392b;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// --- Pixi drawing helpers ---

interface UnitPixiObjects {
  container: Container;
  body: Graphics;
  ring: Graphics;
  label: Text;
  hpText: Text;
}

function drawTiles(g: Graphics, state: CombatState, ts: number): void {
  for (let y = 0; y < state.gridHeight; y++) {
    for (let x = 0; x < state.gridWidth; x++) {
      const tile = state.tiles[y][x];
      g.rect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
      g.fill({ color: tile.type === 'wall' ? 0x3a3a3a : 0x5c4a32 });
    }
  }
}

function updateHighlights(
  g: Graphics,
  state: CombatState,
  spell: SpellDef | null,
  heroId: string | null,
  ts: number,
): void {
  g.clear();
  const hero = heroId ? state.units.find(u => u.id === heroId && u.alive) : null;

  if (spell && hero) {
    // Spell range: per-tile purple fill
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        if (manhattanDistance(hero.x, hero.y, x, y) <= spell.range) {
          g.rect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
          g.fill({ color: 0x9333ea, alpha: 0.3 });
        }
      }
    }
  } else if (hero) {
    // Weapon range: faint orange highlight per tile within manhattan distance
    const r = hero.weapon.range;
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        if (manhattanDistance(hero.x, hero.y, x, y) <= r) {
          g.rect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
          g.fill({ color: 0xf39c12, alpha: 0.15 });
        }
      }
    }
  }
}

// Draws targeting lines and movement arrows between units
function updateOverlays(g: Graphics, state: CombatState, ts: number): void {
  g.clear();
  for (const unit of state.units) {
    if (!unit.alive) continue;
    const cx = unit.x * ts + ts / 2;
    const cy = unit.y * ts + ts / 2;
    const action = unit.currentAction;
    if (action.type === 'charging_weapon') {
      const target = state.units.find(u => u.id === action.targetId);
      if (target?.alive) {
        const tx = target.x * ts + ts / 2;
        const ty = target.y * ts + ts / 2;
        g.moveTo(cx, cy).lineTo(tx, ty).stroke({ color: 0xf39c12, width: 1.5, alpha: 0.75 });
        g.moveTo(cx, cy).lineTo(cx + (tx - cx) * unit.chargeProgress, cy + (ty - cy) * unit.chargeProgress).stroke({ color: 0xf39c12, width: 4, alpha: 0.85 });
      }
    } else if (action.type === 'moving') {
      const tx = action.toX * ts + ts / 2;
      const ty = action.toY * ts + ts / 2;
      g.moveTo(cx, cy);
      g.lineTo(cx + (tx - cx) / 2, cy + (ty - cy) / 2);
      g.stroke({ color: 0x2ecc71, width: 2, alpha: 0.7 });
    } else if (action.type === 'charging_spell') {
      const targetUnit = action.targetUnitId ? state.units.find(u => u.id === action.targetUnitId) : null;
      const tileX = targetUnit ? targetUnit.x : action.targetX;
      const tileY = targetUnit ? targetUnit.y : action.targetY;
      const tx = tileX * ts + ts / 2;
      const ty = tileY * ts + ts / 2;
      g.moveTo(cx, cy).lineTo(tx, ty).stroke({ color: 0x9333ea, width: 1.5, alpha: 0.75 });
      g.moveTo(cx, cy).lineTo(cx + (tx - cx) * unit.chargeProgress, cy + (ty - cy) * unit.chargeProgress).stroke({ color: 0x9333ea, width: 4, alpha: 0.85 });
      const spell = SPELLS[action.spellId];
      if (spell && spell.aoeRadius > 0) {
        // Draw only outer perimeter edges — edge is outer if its neighbor is outside the blast radius
        const aoeStroke = { color: 0x9333ea, width: 2.5, alpha: 0.9 };
        const inRange = (nx: number, ny: number) =>
          nx >= 0 && nx < state.gridWidth && ny >= 0 && ny < state.gridHeight &&
          manhattanDistance(tileX, tileY, nx, ny) <= spell.aoeRadius;
        for (let gy = 0; gy < state.gridHeight; gy++) {
          for (let gx = 0; gx < state.gridWidth; gx++) {
            if (manhattanDistance(tileX, tileY, gx, gy) > spell.aoeRadius) continue;
            if (!inRange(gx, gy - 1)) { g.moveTo(gx * ts, gy * ts).lineTo((gx + 1) * ts, gy * ts).stroke(aoeStroke); }
            if (!inRange(gx, gy + 1)) { g.moveTo(gx * ts, (gy + 1) * ts).lineTo((gx + 1) * ts, (gy + 1) * ts).stroke(aoeStroke); }
            if (!inRange(gx - 1, gy)) { g.moveTo(gx * ts, gy * ts).lineTo(gx * ts, (gy + 1) * ts).stroke(aoeStroke); }
            if (!inRange(gx + 1, gy)) { g.moveTo((gx + 1) * ts, gy * ts).lineTo((gx + 1) * ts, (gy + 1) * ts).stroke(aoeStroke); }
          }
        }
      }
    }
  }
}

function createUnitPixiObjects(unit: UnitDef, parent: Container, ts: number): UnitPixiObjects {
  const container = new Container();
  container.x = unit.x * ts;
  container.y = unit.y * ts;
  container.hitArea = new Rectangle(0, 0, ts, ts);
  parent.addChild(container);

  const body = new Graphics();
  container.addChild(body);

  const ring = new Graphics();
  container.addChild(ring);

  const label = new Text({
    text: unit.name.split(' ')[0],
    style: { fontSize: 9, fill: '#ffffff', fontFamily: 'Courier New', fontWeight: 'bold' },
  });
  label.anchor.set(0.5, 0.5);
  label.x = ts / 2;
  label.y = ts / 2 - 4;
  container.addChild(label);

  const hpText = new Text({
    text: `${unit.hp}/${unit.maxHp}`,
    style: { fontSize: 8, fill: '#ffffff', fontFamily: 'Courier New' },
  });
  hpText.anchor.set(0.5, 0.5);
  hpText.x = ts / 2;
  hpText.y = ts / 2 + 6;
  container.addChild(hpText);

  return { container, body, ring, label, hpText };
}

function updateUnitPixiObjects(objs: UnitPixiObjects, unit: UnitDef, isSelected: boolean, mySide: UnitSide, ts: number): void {
  objs.container.x = unit.x * ts;
  objs.container.y = unit.y * ts;
  objs.container.alpha = unit.alive ? 1 : 0.4;
  objs.container.cursor = unit.alive ? 'pointer' : 'default';

  const cx = ts / 2;
  const cy = ts / 2;
  const bodyR = Math.round(ts * 0.35);

  objs.body.clear();
  const color = unitBodyColor(unit, isSelected, mySide);
  if (unit.side === mySide) {
    objs.body.circle(cx, cy, bodyR).fill({ color });
    if (isSelected) objs.body.circle(cx, cy, bodyR).stroke({ color: 0xf1c40f, width: 2 });
  } else {
    objs.body.rect(cx - bodyR, cy - bodyR, bodyR * 2, bodyR * 2).fill({ color });
    if (isSelected) objs.body.rect(cx - bodyR, cy - bodyR, bodyR * 2, bodyR * 2).stroke({ color: 0xf1c40f, width: 2 });
  }

  objs.ring.clear();
  const ringR = Math.round(ts * 0.42);
  if (unit.alive && unit.currentAction.type !== 'idle') {
    objs.ring.arc(cx, cy, ringR, 0, Math.PI * 2).stroke({ color: 0x000000, alpha: 0.35, width: 4 });
    if (unit.chargeProgress > 0) {
      const end = -Math.PI / 2 + unit.chargeProgress * Math.PI * 2;
      objs.ring.arc(cx, cy, ringR, -Math.PI / 2, end).stroke({
        color: chargeColor(unit.currentAction.type), width: 4, cap: 'round',
      });
    }
  }

  objs.label.text = unit.name.split(' ')[0];
  objs.hpText.text = unit.alive ? `${unit.hp}/${unit.maxHp}` : '';
}

// --- Spell Effect Animations ---

interface ActiveEffect extends SpellEffectState {
  animType: string;
  startMs: number;
  durationMs: number;
}

function makeParticles(count: number): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random() }));
}

function drawEffects(g: Graphics, effects: ActiveEffect[]): ActiveEffect[] {
  g.clear();
  const nowMs = performance.now();
  const surviving: ActiveEffect[] = [];
  for (const fx of effects) {
    const t = (nowMs - fx.startMs) / fx.durationMs;
    if (t >= 1) continue;
    surviving.push(fx);
    ANIM_REGISTRY[fx.animType]?.(g, fx, t);
  }
  return surviving;
}

// --- Component ---

interface CombatViewPixiProps {
  onExit: () => void;
  mode?: 'local' | 'networked';
  sessionId?: string;
  side?: UnitSide;
  initialState?: CombatState;
}

const MAX_COMBAT_TILE_SIZE = 60;
const COMBAT_APP_PADDING = 32;

export function CombatViewPixi({ onExit, mode = 'local', sessionId, side, initialState }: CombatViewPixiProps) {
  const isNetworked = mode === 'networked' && !!sessionId;
  const mySide: UnitSide = side ?? 'hero';
  const [combatState, setCombatState] = useState<CombatState>(() => initialState ?? createCombatState());
  const tileSizeRef = useRef(
    Math.min(MAX_COMBAT_TILE_SIZE, Math.floor((window.innerWidth - COMBAT_APP_PADDING) / (initialState?.gridWidth ?? 9)))
  );
  const defaultHero = isNetworked
    ? (initialState?.units.find(u => u.side === mySide)?.id ?? null)
    : 'hero1';
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(defaultHero);
  const [pendingSpell, setPendingSpell] = useState<SpellDef | null>(null);
  const [paused, setPaused] = useState(!isNetworked);

  const commandQueueRef = useRef<PlayerCommand[]>([]);
  const lastFrameRef = useRef<number>(0);
  const combatStateRef = useRef(combatState);
  const sessionIdRef = useRef(sessionId);
  const mySideRef = useRef(mySide);
  const renderDirtyRef = useRef(true);

  // Pixi object refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const highlightLayerRef = useRef<Graphics | null>(null);
  const overlayLayerRef = useRef<Graphics | null>(null);
  const effectsLayerRef = useRef<Graphics | null>(null);
  const unitObjectsRef = useRef<Map<string, UnitPixiObjects>>(new Map());

  // Effect animation state
  const activeEffectsRef = useRef<ActiveEffect[]>([]);
  const prevUnitActionsRef = useRef<Map<string, UnitAction>>(new Map());

  // Refs kept in sync for use inside Pixi callbacks (no stale closures)
  const pendingSpellRef = useRef(pendingSpell);
  const selectedHeroIdRef = useRef(selectedHeroId);

  const enqueue = useCallback((cmd: PlayerCommand) => {
    if (isNetworked) {
      if (sessionIdRef.current) {
        combatApi.sendCommand(sessionIdRef.current, cmd).catch(console.error);
      }
    } else {
      commandQueueRef.current.push(cmd);
    }
  }, [isNetworked]);

  const renderToPixi = useCallback((state: CombatState) => {
    if (!pixiAppRef.current) return;
    const ts = tileSizeRef.current;
    updateHighlights(highlightLayerRef.current!, state, pendingSpellRef.current, selectedHeroIdRef.current, ts);
    updateOverlays(overlayLayerRef.current!, state, ts);
    for (const unit of state.units) {
      const objs = unitObjectsRef.current.get(unit.id);
      if (objs) updateUnitPixiObjects(objs, unit, unit.id === selectedHeroIdRef.current, mySideRef.current, ts);
    }
    if (effectsLayerRef.current) {
      activeEffectsRef.current = drawEffects(effectsLayerRef.current, activeEffectsRef.current);
    }
  }, []);

  // Tile click — reads current values from refs, no stale closure issues
  const handleTileClick = useCallback((x: number, y: number) => {
    const state = combatStateRef.current;
    const heroId = selectedHeroIdRef.current;
    const spell = pendingSpellRef.current;
    if (!heroId || state.outcome !== 'ongoing') return;
    const hero = state.units.find(u => u.id === heroId && u.alive);
    if (!hero) return;
    const mySideNow = mySideRef.current;
    const enemyOnTile = state.units.find(u => u.side !== mySideNow && u.alive && u.x === x && u.y === y);
    const friendlyOnTile = state.units.find(u => u.side === mySideNow && u.alive && u.x === x && u.y === y);
    if (spell) {
      const dist = manhattanDistance(hero.x, hero.y, x, y);
      if (dist <= spell.range) {
        if (spell.targetType === 'unit') {
          // Unit-targeted spell: lock onto whoever is on this tile
          const unitOnTile = state.units.find(u => u.alive && u.x === x && u.y === y);
          if (unitOnTile) {
            enqueue({ type: 'cast_spell', unitId: hero.id, spellId: spell.id, targetX: x, targetY: y, targetUnitId: unitOnTile.id });
          }
          // If no unit on tile, cancel targeting without casting
        } else {
          enqueue({ type: 'cast_spell', unitId: hero.id, spellId: spell.id, targetX: x, targetY: y });
        }
      }
      setPendingSpell(null);
      pendingSpellRef.current = null;
      return;
    }
    if (enemyOnTile) {
      enqueue({ type: 'set_weapon_target', unitId: hero.id, targetId: enemyOnTile.id, autoAttack: hero.autoAttack });
      return;
    }
    if (friendlyOnTile && friendlyOnTile.id !== hero.id) {
      setSelectedHeroId(friendlyOnTile.id);
      selectedHeroIdRef.current = friendlyOnTile.id;
      return;
    }
    if (manhattanDistance(hero.x, hero.y, x, y) === 1) {
      enqueue({ type: 'move_unit', unitId: hero.id, toX: x, toY: y });
    }
  }, [enqueue]);

  // Initialize Pixi once
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const state = combatStateRef.current;
    const ts = tileSizeRef.current;
    const width = state.gridWidth * ts;
    const height = state.gridHeight * ts;
    const app = new Application();
    let destroyed = false;

    app.init({ width, height, background: 0x1a1208, antialias: true }).then(() => {
      if (destroyed) { app.destroy(); return; }
      canvasContainerRef.current!.appendChild(app.canvas);
      pixiAppRef.current = app;

      // Static tile layer — drawn once
      const tileLayer = new Graphics();
      app.stage.addChild(tileLayer);
      drawTiles(tileLayer, state, ts);

      // Spell range highlight layer
      const highlightLayer = new Graphics();
      app.stage.addChild(highlightLayer);
      highlightLayerRef.current = highlightLayer;

      // Unit layer
      const unitLayer = new Container();
      app.stage.addChild(unitLayer);

      for (const unit of state.units) {
        const objs = createUnitPixiObjects(unit, unitLayer, ts);
        unitObjectsRef.current.set(unit.id, objs);
        objs.container.eventMode = 'static';
        const unitId = unit.id;
        objs.container.on('pointerdown', (e) => {
          e.stopPropagation();
          const cur = combatStateRef.current.units.find(u => u.id === unitId);
          if (!cur) return;
          if (cur.side === mySideRef.current && cur.alive && !pendingSpellRef.current) {
            setSelectedHeroId(cur.id);
            selectedHeroIdRef.current = cur.id;
            renderToPixi(combatStateRef.current);
          } else {
            handleTileClick(cur.x, cur.y);
          }
        });
      }

      // Overlay layer: targeting lines + move arrows, drawn above units
      const overlayLayer = new Graphics();
      app.stage.addChild(overlayLayer);
      overlayLayerRef.current = overlayLayer;

      // Effects layer: spell animations above everything
      const effectsLayer = new Graphics();
      app.stage.addChild(effectsLayer);
      effectsLayerRef.current = effectsLayer;

      // Seed prev actions for spell-fire detection
      for (const unit of state.units) {
        prevUnitActionsRef.current.set(unit.id, unit.currentAction);
      }

      // Stage click for empty tiles
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, width, height);
      app.stage.on('pointerdown', (e) => {
        handleTileClick(
          Math.floor(e.global.x / ts),
          Math.floor(e.global.y / ts),
        );
      });

      renderToPixi(state);
    });

    return () => {
      destroyed = true;
      pixiAppRef.current?.destroy();
      pixiAppRef.current = null;
      highlightLayerRef.current = null;
      overlayLayerRef.current = null;
      effectsLayerRef.current = null;
      unitObjectsRef.current.clear();
      activeEffectsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render highlights when pending spell changes
  useEffect(() => {
    pendingSpellRef.current = pendingSpell;
    renderToPixi(combatStateRef.current);
  }, [pendingSpell, renderToPixi]);

  // Re-render selection ring when selected hero changes
  useEffect(() => {
    selectedHeroIdRef.current = selectedHeroId;
    renderToPixi(combatStateRef.current);
  }, [selectedHeroId, renderToPixi]);

  // Detect spell fires from state transition and spawn visual effects
  const detectSpellFires = useCallback((newState: CombatState) => {
    const thisTick = newState.tickCount - 1;
    const ts = tileSizeRef.current;
    for (const unit of newState.units) {
      const prevAction = prevUnitActionsRef.current.get(unit.id);
      if (prevAction?.type === 'charging_spell' && unit.currentAction.type === 'idle') {
        const fizzled = newState.events.some(e => e.tick === thisTick && e.unitId === unit.id && e.fizzled);
        const spell = SPELLS[prevAction.spellId];
        if (!fizzled && spell) {
          const casterPx = unit.x * ts + ts / 2;
          const casterPy = unit.y * ts + ts / 2;
          const targetUnit = prevAction.targetUnitId
            ? newState.units.find(u => u.id === prevAction.targetUnitId) : null;
          const targetPx = (targetUnit?.x ?? prevAction.targetX) * ts + ts / 2;
          const targetPy = (targetUnit?.y ?? prevAction.targetY) * ts + ts / 2;
          activeEffectsRef.current.push({
            animType: spell.animType,
            casterPx, casterPy, targetPx, targetPy,
            aoeRadius: spell.aoeRadius,
            tileSize: ts,
            startMs: performance.now(),
            durationMs: spell.animDurationMs,
            particles: makeParticles(spell.particleCount),
          });
        }
      }
      prevUnitActionsRef.current.set(unit.id, unit.currentAction);
    }

    // Detect weapon hits from events (event-based, since auto-attack stays in charging_weapon)
    for (const evt of newState.events) {
      if (evt.tick !== thisTick || evt.source !== 'weapon') continue;
      if (!evt.unitId || !evt.targetId || !evt.damage) continue;
      const attacker = newState.units.find(u => u.id === evt.unitId);
      const target = newState.units.find(u => u.id === evt.targetId);
      if (!attacker || !target) continue;
      const { animType, animDurationMs, particleCount } = attacker.weapon;
      activeEffectsRef.current.push({
        animType,
        casterPx: attacker.x * ts + ts / 2,
        casterPy: attacker.y * ts + ts / 2,
        targetPx: target.x * ts + ts / 2,
        targetPy: target.y * ts + ts / 2,
        aoeRadius: 0,
        tileSize: ts,
        startMs: performance.now(),
        durationMs: animDurationMs,
        particles: makeParticles(particleCount),
      });
    }
  }, []);

  // Game loop — local mode runs combatTick locally, networked mode uses server state
  useEffect(() => {
    if (combatState.outcome !== 'ongoing' || paused) return;
    let animId: number;

    if (isNetworked) {
      // Networked: render only when state changed or effects are playing
      const renderLoop = (_timestamp: number) => {
        if (renderDirtyRef.current || activeEffectsRef.current.length > 0) {
          renderToPixi(combatStateRef.current);
          renderDirtyRef.current = false;
        }
        animId = requestAnimationFrame(renderLoop);
      };
      animId = requestAnimationFrame(renderLoop);

      // Poll server state, skip update if tick hasn't advanced
      let pollInFlight = false;
      const pollId = setInterval(() => {
        if (!sessionIdRef.current || pollInFlight) return;
        pollInFlight = true;
        combatApi.getState(sessionIdRef.current).then(result => {
          if (result.state.tickCount === combatStateRef.current.tickCount) return;
          detectSpellFires(result.state);
          combatStateRef.current = result.state;
          renderDirtyRef.current = true;
          setCombatState(result.state);
        }).catch(console.error).finally(() => { pollInFlight = false; });
      }, 500);

      return () => {
        cancelAnimationFrame(animId);
        clearInterval(pollId);
      };
    } else {
      // Local: full local tick loop
      const loop = (timestamp: number) => {
        const dt = lastFrameRef.current ? Math.min(timestamp - lastFrameRef.current, 100) : 16;
        lastFrameRef.current = timestamp;
        const commands = commandQueueRef.current.splice(0);
        const newState = combatTick(combatStateRef.current, dt, commands);
        detectSpellFires(newState);
        combatStateRef.current = newState;
        setCombatState(newState);
        renderToPixi(newState);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(animId);
        lastFrameRef.current = 0;
      };
    }
  }, [combatState.outcome, paused, renderToPixi, isNetworked, detectSpellFires]);

  // Keyboard movement for selected hero
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = combatStateRef.current;
      const heroId = selectedHeroIdRef.current;
      if (!heroId || state.outcome !== 'ongoing') return;
      const hero = state.units.find(u => u.id === heroId && u.alive);
      if (!hero) return;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') dy = -1;
      else if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') dy = 1;
      else if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') dx = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;
      else return;
      e.preventDefault();
      enqueue({ type: 'move_unit', unitId: hero.id, toX: hero.x + dx, toY: hero.y + dy });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enqueue]);

  // Auto-scroll combat log
  const logContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [combatState.events.length]);

  const heroes = useMemo(() => combatState.units.filter(u => u.side === mySide), [combatState.units, mySide]);
  const enemies = useMemo(() => combatState.units.filter(u => u.side !== mySide), [combatState.units, mySide]);
  const visibleEvents = useMemo(() => combatState.events.slice(-30), [combatState.events]);
  const selectedHero = useMemo(() => heroes.find(h => h.id === selectedHeroId) ?? null, [heroes, selectedHeroId]);

  const handleSpellClick = useCallback((spell: SpellDef) => {
    if (!selectedHero?.alive) return;
    if (selectedHero.mana < spell.manaCost) return;
    setPendingSpell(spell);
  }, [selectedHero]);


  const resetToState = useCallback((state: CombatState, heroId: string | null) => {
    combatStateRef.current = state;
    setCombatState(state);
    setSelectedHeroId(heroId);
    selectedHeroIdRef.current = heroId;
    setPendingSpell(null);
    pendingSpellRef.current = null;
    lastFrameRef.current = 0;
    activeEffectsRef.current = [];
    renderDirtyRef.current = true;
    prevUnitActionsRef.current.clear();
    for (const unit of state.units) {
      prevUnitActionsRef.current.set(unit.id, unit.currentAction);
    }
    renderToPixi(state);
  }, [renderToPixi]);

  const handleRestart = useCallback(() => {
    if (isNetworked) {
      if (sessionIdRef.current) {
        combatApi.leave(sessionIdRef.current).catch(console.error);
      }
      combatApi.create('pve').then(result => {
        sessionIdRef.current = result.sessionId;
        resetToState(result.state, result.state.units.find(u => u.side === result.side)?.id ?? null);
      }).catch(console.error);
      return;
    }
    resetToState(createCombatState(), 'hero1');
  }, [resetToState, isNetworked]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>⚔ Combat (Pixi)</span>
        <span style={styles.timer}>{formatTime(combatState.elapsedMs)}</span>
        {combatState.outcome === 'ongoing' && (
          <button style={styles.exitBtn} onClick={() => setPaused(p => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button style={styles.exitBtn} onClick={onExit}>Quit</button>
      </div>

      {combatState.outcome !== 'ongoing' && (() => {
        // Outcome is from hero perspective; flip for enemy player
        const iWon = mySide === 'hero'
          ? combatState.outcome === 'victory'
          : combatState.outcome === 'defeat';
        return (
          <div style={{
            ...styles.outcomeBanner,
            backgroundColor: iWon ? '#27ae60' : '#c0392b',
          }}>
            {iWon ? 'VICTORY!' : 'DEFEAT'}
            <button style={styles.restartBtn} onClick={handleRestart}>Fight Again</button>
          </div>
        );
      })()}


      {!isNetworked && paused && combatState.outcome === 'ongoing' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 }}>
          <button onClick={() => setPaused(false)} style={{ padding: '20px 60px', fontSize: '2rem', fontWeight: 'bold', backgroundColor: '#c0392b', color: '#fff', border: '3px solid #e74c3c', borderRadius: '8px', cursor: 'pointer', letterSpacing: '2px' }}>
            {combatState.elapsedMs === 0 ? 'BEGIN' : 'RESUME'}
          </button>
        </div>
      )}

      <div style={styles.mainArea}>
        {/* Left column: Pixi canvas + spell bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div
            ref={canvasContainerRef}
            style={{ border: '2px solid #0f3460', borderRadius: 4, lineHeight: 0 }}
          />

          {selectedHero && selectedHero.spells.length > 0 && (
            <div style={{ ...styles.section, width: combatState.gridWidth * tileSizeRef.current - 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={styles.sectionTitle}>{selectedHero.name.split(' ')[0]}'s Spells</span>
                <span style={{ fontSize: '10px', color: '#888' }}>Mana: {selectedHero.mana}/{selectedHero.maxMana}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedHero.spells.map(spellId => {
                  const spell = SPELLS[spellId];
                  if (!spell) return null;
                  const canCast = selectedHero.alive && selectedHero.mana >= spell.manaCost;
                  const isActive = pendingSpell?.id === spellId;
                  return (
                    <button
                      key={spellId}
                      onClick={() => handleSpellClick(spell)}
                      disabled={!canCast}
                      style={{
                        ...styles.spellBtn,
                        backgroundColor: isActive ? '#9333ea' : canCast ? '#6b21a8' : '#333',
                        opacity: canCast ? 1 : 0.5,
                        border: isActive ? '2px solid #f1c40f' : '2px solid transparent',
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>{spell.name}</span>
                      <span style={{ fontSize: '10px', color: '#ccc' }}>
                        {spell.damage < 0 ? `Heal ${-spell.damage}` : `${spell.damage} dmg`}
                        {spell.aoeRadius > 0 ? ` AoE:${spell.aoeRadius}` : ''}
                        {' · '}{spell.castTime}s · {spell.manaCost}mp
                        {' · r'}{spell.range === 999 ? '∞' : spell.range}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: party, enemies, log */}
        <div style={styles.rightPanel}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Party</div>
            {heroes.map(hero => (
              <HeroCard
                key={hero.id}
                hero={hero}
                isSelected={hero.id === selectedHeroId}
                onSelect={() => { setSelectedHeroId(hero.id); setPendingSpell(null); }}
                onToggleAuto={() => enqueue({ type: 'toggle_auto_attack', unitId: hero.id })}
                onCancel={() => enqueue({ type: 'cancel_action', unitId: hero.id })}
              />
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Enemies</div>
            {enemies.map(enemy => (
              <EnemyCard
                key={enemy.id}
                enemy={enemy}
                onClick={() => {
                  if (selectedHero?.alive && enemy.alive) {
                    if (pendingSpell) {
                      handleTileClick(enemy.x, enemy.y);
                    } else {
                      enqueue({ type: 'set_weapon_target', unitId: selectedHero.id, targetId: enemy.id, autoAttack: selectedHero.autoAttack });
                    }
                  }
                }}
              />
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Combat Log</div>
            <div ref={logContainerRef} style={styles.log}>
              {visibleEvents.map((evt, i) => (
                <div key={i} style={styles.logEntry}>{evt.message}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.helpBar}>
        Click hero to select · Click enemy to attack · Click spell then target tile · Click empty adjacent tile to move
      </div>
    </div>
  );
}

// --- Sub-components ---

function chargeColorCSS(actionType: UnitAction['type']): string {
  if (actionType === 'charging_spell') return '#9333ea';
  if (actionType === 'moving') return '#2ecc71';
  return '#f39c12';
}

function HeroCard({ hero, isSelected, onSelect, onToggleAuto, onCancel }: {
  hero: UnitDef;
  isSelected: boolean;
  onSelect: () => void;
  onToggleAuto: () => void;
  onCancel: () => void;
}) {
  const actionLabel = hero.currentAction.type === 'idle'
    ? 'Idle'
    : hero.currentAction.type === 'charging_weapon'
      ? 'Attacking'
      : hero.currentAction.type === 'charging_spell'
        ? `Casting ${SPELLS[hero.currentAction.spellId]?.name ?? '?'}`
        : 'Moving';

  return (
    <div onClick={onSelect} style={{ ...styles.unitCard, borderColor: isSelected ? '#f1c40f' : 'transparent', opacity: hero.alive ? 1 : 0.4 }}>
      <div style={styles.unitCardHeader}>
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{hero.name}</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>{hero.weapon.name}</span>
      </div>
      <div style={styles.barOuter}>
        <div style={{ ...styles.barInner, width: `${(hero.hp / hero.maxHp) * 100}%`, backgroundColor: '#27ae60' }} />
        <span style={styles.barLabel}>HP {hero.hp}/{hero.maxHp}</span>
      </div>
      {hero.maxMana > 0 && (
        <div style={styles.barOuter}>
          <div style={{ ...styles.barInner, width: `${(hero.mana / hero.maxMana) * 100}%`, backgroundColor: '#2980b9' }} />
          <span style={styles.barLabel}>MP {hero.mana}/{hero.maxMana}</span>
        </div>
      )}
      {hero.currentAction.type !== 'moving' && (
        <div style={styles.barOuter}>
          <div style={{ ...styles.barInner, width: `${hero.chargeProgress * 100}%`, backgroundColor: chargeColorCSS(hero.currentAction.type) }} />
          <span style={styles.barLabel}>{actionLabel} {hero.currentAction.type !== 'idle' ? `${Math.round(hero.chargeProgress * 100)}%` : ''}</span>
        </div>
      )}
      {hero.alive && (
        <div style={styles.unitControls}>
          <label style={{ fontSize: '10px', cursor: 'pointer', color: '#aaa' }}>
            <input type="checkbox" checked={hero.autoAttack} onChange={(e) => { e.stopPropagation(); onToggleAuto(); }} style={{ marginRight: 3 }} />
            Repeat
          </label>
          <button onClick={(e) => { e.stopPropagation(); onCancel(); }} style={styles.smallBtn}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function EnemyCard({ enemy, onClick }: { enemy: UnitDef; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ ...styles.unitCard, opacity: enemy.alive ? 1 : 0.3, cursor: enemy.alive ? 'pointer' : 'default' }}>
      <div style={styles.unitCardHeader}>
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{enemy.name}</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>({enemy.x},{enemy.y})</span>
      </div>
      <div style={styles.barOuter}>
        <div style={{ ...styles.barInner, width: `${(enemy.hp / enemy.maxHp) * 100}%`, backgroundColor: '#c0392b' }} />
        <span style={styles.barLabel}>HP {enemy.hp}/{enemy.maxHp}</span>
      </div>
      {enemy.alive && enemy.currentAction.type !== 'moving' && (
        <div style={styles.barOuter}>
          <div style={{ ...styles.barInner, width: `${enemy.chargeProgress * 100}%`, backgroundColor: chargeColorCSS(enemy.currentAction.type) }} />
          <span style={styles.barLabel}>{enemy.currentAction.type !== 'idle' ? `${Math.round(enemy.chargeProgress * 100)}%` : ''}</span>
        </div>
      )}
    </div>
  );
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a2e', color: '#eee', minHeight: '100vh', fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column', position: 'relative' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', backgroundColor: '#16213e', borderBottom: '2px solid #0f3460' },
  title: { fontSize: '18px', fontWeight: 'bold', color: '#e94560', flex: 1 },
  timer: { fontSize: '14px', color: '#aaa' },
  exitBtn: { padding: '4px 12px', backgroundColor: '#333', color: '#eee', border: '1px solid #555', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' },
  outcomeBanner: { textAlign: 'center', padding: '16px', fontSize: '24px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 },
  restartBtn: { padding: '8px 16px', backgroundColor: '#fff', color: '#333', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' },

  mainArea: { display: 'flex', flex: 1, padding: 12, gap: 12, overflow: 'auto' },
  rightPanel: { flex: 1, minWidth: 220, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' },
  section: { backgroundColor: '#16213e', borderRadius: 4, padding: 8, border: '1px solid #0f3460' },
  sectionTitle: { fontSize: '12px', fontWeight: 'bold', color: '#e94560', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  unitCard: { backgroundColor: '#1a1a2e', borderRadius: 4, padding: 6, marginBottom: 4, border: '2px solid transparent', cursor: 'pointer' },
  unitCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  barOuter: { position: 'relative', height: 14, backgroundColor: '#333', borderRadius: 2, marginBottom: 2, overflow: 'hidden' },
  barInner: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 2 },
  barLabel: { position: 'absolute', top: 0, left: 4, right: 4, lineHeight: '14px', fontSize: '9px', color: '#fff', textShadow: '1px 1px 1px rgba(0,0,0,0.8)', zIndex: 1 },
  unitControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  smallBtn: { padding: '1px 6px', fontSize: '10px', backgroundColor: '#555', color: '#ddd', border: '1px solid #777', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' },
  spellBtn: { display: 'flex', flexDirection: 'column', width: 'auto', padding: '6px 8px', marginBottom: 3, borderRadius: 4, cursor: 'pointer', color: '#fff', textAlign: 'left', fontFamily: 'inherit' },
  log: { maxHeight: 150, overflowY: 'auto', fontSize: '10px', color: '#bbb' },
  logEntry: { padding: '1px 0', borderBottom: '1px solid #222' },
  helpBar: { padding: '6px 16px', fontSize: '11px', color: '#666', backgroundColor: '#111', textAlign: 'center' },
};
