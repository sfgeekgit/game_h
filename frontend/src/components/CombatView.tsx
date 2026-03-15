import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  combatTick, createCombatState, manhattanDistance,
  SPELLS,
} from '@game_h/shared';
import type {
  CombatState, PlayerCommand, UnitDef, SpellDef,
} from '@game_h/shared';

interface CombatViewProps {
  onExit: () => void;
}

const TILE_SIZE = 52;
const TILE_COLORS: Record<string, string> = {
  floor: '#5c4a32',
  wall: '#3a3a3a',
};

const UNIT_COLORS = {
  hero: '#2980b9',
  heroSelected: '#e74c3c',
  enemy: '#c0392b',
  dead: '#555',
};

export function CombatView({ onExit }: CombatViewProps) {
  const [combatState, setCombatState] = useState<CombatState>(() => createCombatState());
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>('hero1');
  const [pendingSpell, setPendingSpell] = useState<SpellDef | null>(null);
  const [paused, setPaused] = useState(false);
  const commandQueueRef = useRef<PlayerCommand[]>([]);
  const lastFrameRef = useRef<number>(0);

  // Game loop
  useEffect(() => {
    if (combatState.outcome !== 'ongoing' || paused) return;
    let animId: number;
    const loop = (timestamp: number) => {
      const dt = lastFrameRef.current ? Math.min(timestamp - lastFrameRef.current, 100) : 16;
      lastFrameRef.current = timestamp;
      const commands = commandQueueRef.current.splice(0);
      setCombatState(prev => combatTick(prev, dt, commands));
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      lastFrameRef.current = 0; // reset so dt doesn't spike on unpause
    };
  }, [combatState.outcome, paused]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log within its own container only
  useEffect(() => {
    const el = logContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [combatState.events.length]);

  const enqueue = useCallback((cmd: PlayerCommand) => {
    commandQueueRef.current.push(cmd);
  }, []);

  const heroes = useMemo(() => combatState.units.filter(u => u.side === 'hero'), [combatState.units]);
  const enemies = useMemo(() => combatState.units.filter(u => u.side === 'enemy'), [combatState.units]);
  const selectedHero = heroes.find(h => h.id === selectedHeroId) ?? null;

  // Click on tile
  const handleTileClick = useCallback((x: number, y: number) => {
    if (!selectedHero || !selectedHero.alive || combatState.outcome !== 'ongoing') return;

    // Check if clicking on an enemy unit
    const enemyOnTile = combatState.units.find(u => u.alive && u.side === 'enemy' && u.x === x && u.y === y);
    const friendlyOnTile = combatState.units.find(u => u.alive && u.side === 'hero' && u.x === x && u.y === y);

    if (pendingSpell) {
      const dist = manhattanDistance(selectedHero.x, selectedHero.y, x, y);
      if (dist <= pendingSpell.range) {
        enqueue({
          type: 'cast_spell',
          unitId: selectedHero.id,
          spellId: pendingSpell.id,
          targetX: x,
          targetY: y,
        });
      }
      setPendingSpell(null);
      return;
    }

    if (enemyOnTile) {
      // Weapon attack
      enqueue({
        type: 'set_weapon_target',
        unitId: selectedHero.id,
        targetId: enemyOnTile.id,
        autoAttack: selectedHero.autoAttack,
      });
      return;
    }

    if (friendlyOnTile && friendlyOnTile.id !== selectedHero.id) {
      // Select that hero
      setSelectedHeroId(friendlyOnTile.id);
      return;
    }

    // Move to empty tile
    if (manhattanDistance(selectedHero.x, selectedHero.y, x, y) === 1) {
      enqueue({ type: 'move_unit', unitId: selectedHero.id, toX: x, toY: y });
    }
  }, [selectedHero, pendingSpell, combatState, enqueue]);

  // Spell click
  const handleSpellClick = useCallback((spell: SpellDef) => {
    if (!selectedHero || !selectedHero.alive) return;
    if (selectedHero.mana < spell.manaCost) return;
    setPendingSpell(spell);
  }, [selectedHero]);

  // Cancel
  const handleCancel = useCallback(() => {
    if (pendingSpell) {
      setPendingSpell(null);
      return;
    }
    if (selectedHero) {
      enqueue({ type: 'cancel_action', unitId: selectedHero.id });
    }
  }, [selectedHero, pendingSpell, enqueue]);

  // Reset combat
  const handleRestart = useCallback(() => {
    setCombatState(createCombatState());
    setSelectedHeroId('hero1');
    setPendingSpell(null);
    lastFrameRef.current = 0;
  }, []);

  // Compute highlighted tiles for spell range/aoe
  const highlightedTiles = useMemo(() => {
    const set = new Set<string>();
    if (!pendingSpell || !selectedHero) return set;
    for (let y = 0; y < combatState.gridHeight; y++) {
      for (let x = 0; x < combatState.gridWidth; x++) {
        const dist = manhattanDistance(selectedHero.x, selectedHero.y, x, y);
        if (dist <= pendingSpell.range) {
          set.add(`${x},${y}`);
        }
      }
    }
    return set;
  }, [pendingSpell, selectedHero, combatState.gridWidth, combatState.gridHeight]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Combat Prototype</span>
        <span style={styles.timer}>{formatTime(combatState.elapsedMs)}</span>
        {combatState.outcome === 'ongoing' && (
          <button style={styles.exitBtn} onClick={() => setPaused(p => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button style={styles.exitBtn} onClick={onExit}>Quit</button>
      </div>

      {/* Outcome banner */}
      {combatState.outcome !== 'ongoing' && (
        <div style={{
          ...styles.outcomeBanner,
          backgroundColor: combatState.outcome === 'victory' ? '#27ae60' : '#c0392b',
        }}>
          {combatState.outcome === 'victory' ? 'VICTORY!' : 'DEFEAT'}
          <button style={styles.restartBtn} onClick={handleRestart}>Fight Again</button>
        </div>
      )}

      {/* Pending spell indicator */}
      {pendingSpell && (
        <div style={styles.pendingBanner}>
          Targeting: <strong>{pendingSpell.name}</strong>
          {pendingSpell.aoeRadius > 0 && ` (AoE radius ${pendingSpell.aoeRadius})`}
          {' — click a tile to cast'}
          <button style={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        </div>
      )}

      <div style={styles.mainArea}>
        {/* Left column: grid + spell bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        {/* Grid */}
        <div style={{
          ...styles.grid,
          width: combatState.gridWidth * TILE_SIZE,
          height: combatState.gridHeight * TILE_SIZE,
        }}>
          {combatState.tiles.map((row, y) =>
            row.map((tile, x) => {
              const highlighted = highlightedTiles.has(`${x},${y}`);
              return (
                <div
                  key={`${x},${y}`}
                  onClick={() => handleTileClick(x, y)}
                  style={{
                    position: 'absolute',
                    left: x * TILE_SIZE,
                    top: y * TILE_SIZE,
                    width: TILE_SIZE - 1,
                    height: TILE_SIZE - 1,
                    backgroundColor: highlighted
                      ? 'rgba(147, 51, 234, 0.3)'
                      : TILE_COLORS[tile.type] || '#5c4a32',
                    border: highlighted ? '1px solid #9333ea' : '1px solid #4a3928',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                />
              );
            })
          )}

          {/* Units */}
          {combatState.units.map(unit => {
            const isSelected = unit.id === selectedHeroId;
            const bgColor = !unit.alive
              ? UNIT_COLORS.dead
              : unit.side === 'hero'
                ? isSelected ? UNIT_COLORS.heroSelected : UNIT_COLORS.hero
                : UNIT_COLORS.enemy;

            const ringColor = unit.currentAction.type === 'charging_spell'
              ? '#a855f7'
              : unit.currentAction.type === 'moving'
                ? '#2ecc71'
                : '#f39c12';
            const showRing = unit.alive && unit.currentAction.type !== 'idle';

            // SVG ring constants — viewBox is 48x48
            const cx = 24, cy = 24, r = 20;
            const circumference = 2 * Math.PI * r;
            const offset = circumference * (1 - unit.chargeProgress);

            return (
              <div
                key={unit.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (unit.side === 'hero' && unit.alive && !pendingSpell) {
                    setSelectedHeroId(unit.id);
                  } else {
                    handleTileClick(unit.x, unit.y);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: unit.x * TILE_SIZE + 2,
                  top: unit.y * TILE_SIZE + 2,
                  width: TILE_SIZE - 4,
                  height: TILE_SIZE - 4,
                  cursor: 'pointer',
                  opacity: unit.alive ? 1 : 0.4,
                  transition: 'left 0.15s, top 0.15s',
                  zIndex: 10,
                }}
                title={`${unit.name} HP:${unit.hp}/${unit.maxHp}`}
              >
                {/* Colored unit body */}
                <div style={{
                  position: 'absolute',
                  left: 6, top: 6,
                  width: TILE_SIZE - 16,
                  height: TILE_SIZE - 16,
                  backgroundColor: bgColor,
                  borderRadius: unit.side === 'hero' ? '50%' : '4px',
                  border: isSelected ? '2px solid #f1c40f' : '2px solid rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: '#fff',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ lineHeight: 1 }}>{unit.name.split(' ')[0]}</span>
                  {unit.alive && (
                    <span style={{ fontSize: '8px', lineHeight: 1, marginTop: 1 }}>
                      {unit.hp}/{unit.maxHp}
                    </span>
                  )}
                </div>

                {/* SVG charge ring */}
                <svg
                  viewBox="0 0 48 48"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  {/* Track */}
                  {showRing && (
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill="none"
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth="4"
                    />
                  )}
                  {/* Progress */}
                  {showRing && (
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  )}
                </svg>
              </div>
            );
          })}
        </div>

        {/* Spell bar — below the map */}
        {selectedHero && selectedHero.spells.length > 0 && (
          <div style={{ ...styles.section, width: combatState.gridWidth * TILE_SIZE - 2 }}>
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
                      width: 'auto',
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
        </div>{/* end left column */}

        {/* Right panel */}
        <div style={styles.rightPanel}>
          {/* Hero list with charge bars */}
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

          {/* Enemy list */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Enemies</div>
            {enemies.map(enemy => (
              <EnemyCard
                key={enemy.id}
                enemy={enemy}
                onClick={() => {
                  if (selectedHero && selectedHero.alive && enemy.alive) {
                    if (pendingSpell) {
                      handleTileClick(enemy.x, enemy.y);
                    } else {
                      enqueue({
                        type: 'set_weapon_target',
                        unitId: selectedHero.id,
                        targetId: enemy.id,
                        autoAttack: selectedHero.autoAttack,
                      });
                    }
                  }
                }}
              />
            ))}
          </div>

          {/* Combat log */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Combat Log</div>
            <div ref={logContainerRef} style={styles.log}>
              {combatState.events.slice(-30).map((evt, i) => (
                <div key={i} style={styles.logEntry}>
                  {evt.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.helpBar}>
        Click hero to select · Click enemy to attack · Click spell then target tile
        · Click empty adjacent tile to move · Right panel: auto-attack toggle, cancel
      </div>
    </div>
  );
}

// --- Sub-components ---

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
    <div
      onClick={onSelect}
      style={{
        ...styles.unitCard,
        borderColor: isSelected ? '#f1c40f' : 'transparent',
        opacity: hero.alive ? 1 : 0.4,
      }}
    >
      <div style={styles.unitCardHeader}>
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{hero.name}</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>{hero.weapon.name}</span>
      </div>
      {/* HP bar */}
      <div style={styles.barOuter}>
        <div style={{ ...styles.barInner, width: `${(hero.hp / hero.maxHp) * 100}%`, backgroundColor: '#27ae60' }} />
        <span style={styles.barLabel}>HP {hero.hp}/{hero.maxHp}</span>
      </div>
      {/* Mana bar */}
      {hero.maxMana > 0 && (
        <div style={styles.barOuter}>
          <div style={{ ...styles.barInner, width: `${(hero.mana / hero.maxMana) * 100}%`, backgroundColor: '#2980b9' }} />
          <span style={styles.barLabel}>MP {hero.mana}/{hero.maxMana}</span>
        </div>
      )}
      {/* Charge bar */}
      <div style={styles.barOuter}>
        <div style={{
          ...styles.barInner,
          width: `${hero.chargeProgress * 100}%`,
          backgroundColor: hero.currentAction.type === 'charging_spell' ? '#9333ea' : '#e67e22',
        }} />
        <span style={styles.barLabel}>{actionLabel} {hero.currentAction.type !== 'idle' ? `${Math.round(hero.chargeProgress * 100)}%` : ''}</span>
      </div>
      {/* Controls */}
      {hero.alive && (
        <div style={styles.unitControls}>
          <label style={{ fontSize: '10px', cursor: 'pointer', color: '#aaa' }}>
            <input
              type="checkbox"
              checked={hero.autoAttack}
              onChange={(e) => { e.stopPropagation(); onToggleAuto(); }}
              style={{ marginRight: 3 }}
            />
            Auto
          </label>
          <button onClick={(e) => { e.stopPropagation(); onCancel(); }} style={styles.smallBtn}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function EnemyCard({ enemy, onClick }: { enemy: UnitDef; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.unitCard,
        opacity: enemy.alive ? 1 : 0.3,
        cursor: enemy.alive ? 'pointer' : 'default',
      }}
    >
      <div style={styles.unitCardHeader}>
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{enemy.name}</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>({enemy.x},{enemy.y})</span>
      </div>
      <div style={styles.barOuter}>
        <div style={{ ...styles.barInner, width: `${(enemy.hp / enemy.maxHp) * 100}%`, backgroundColor: '#c0392b' }} />
        <span style={styles.barLabel}>HP {enemy.hp}/{enemy.maxHp}</span>
      </div>
      {enemy.alive && (
        <div style={styles.barOuter}>
          <div style={{
            ...styles.barInner,
            width: `${enemy.chargeProgress * 100}%`,
            backgroundColor: '#e67e22',
          }} />
          <span style={styles.barLabel}>
            {enemy.currentAction.type === 'idle' ? '' : `${Math.round(enemy.chargeProgress * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a2e',
    color: '#eee',
    minHeight: '100vh',
    fontFamily: "'Courier New', monospace",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    backgroundColor: '#16213e',
    borderBottom: '2px solid #0f3460',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e94560',
    flex: 1,
  },
  timer: {
    fontSize: '14px',
    color: '#aaa',
  },
  exitBtn: {
    padding: '4px 12px',
    backgroundColor: '#333',
    color: '#eee',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  outcomeBanner: {
    textAlign: 'center',
    padding: '16px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  restartBtn: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    color: '#333',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'inherit',
  },
  pendingBanner: {
    padding: '8px 16px',
    backgroundColor: '#4a1d8a',
    color: '#fff',
    textAlign: 'center',
    fontSize: '13px',
  },
  cancelBtn: {
    marginLeft: 8,
    padding: '2px 8px',
    backgroundColor: '#777',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  mainArea: {
    display: 'flex',
    flex: 1,
    padding: 12,
    gap: 12,
    overflow: 'auto',
  },
  grid: {
    position: 'relative',
    flexShrink: 0,
    borderRadius: 4,
    border: '2px solid #0f3460',
  },
  rightPanel: {
    flex: 1,
    minWidth: 220,
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflow: 'auto',
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 4,
    padding: 8,
    border: '1px solid #0f3460',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: '10px',
    color: '#888',
    marginBottom: 4,
  },
  unitCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
    border: '2px solid transparent',
    cursor: 'pointer',
  },
  unitCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  barOuter: {
    position: 'relative',
    height: 14,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 2,
    overflow: 'hidden',
  },
  barInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  barLabel: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    lineHeight: '14px',
    fontSize: '9px',
    color: '#fff',
    textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
    zIndex: 1,
  },
  unitControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  smallBtn: {
    padding: '1px 6px',
    fontSize: '10px',
    backgroundColor: '#555',
    color: '#ddd',
    border: '1px solid #777',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  spellBtn: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: '6px 8px',
    marginBottom: 3,
    borderRadius: 4,
    cursor: 'pointer',
    color: '#fff',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  log: {
    maxHeight: 150,
    overflowY: 'auto',
    fontSize: '10px',
    color: '#bbb',
  },
  logEntry: {
    padding: '1px 0',
    borderBottom: '1px solid #222',
  },
  helpBar: {
    padding: '6px 16px',
    fontSize: '11px',
    color: '#666',
    backgroundColor: '#111',
    textAlign: 'center',
  },
};
