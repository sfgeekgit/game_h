import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { applyMove, directionDelta } from '@game_h/shared';
import type { AreaState, Direction, Entity, MapDef, MoveResult } from '@game_h/shared';
import { api } from '../api.js';
import { DPad } from './DPad.js';
import { DialogueWindow } from './DialogueWindow.js';

interface GameViewProps {
  mode: 'frontend' | 'backend';
  onExit: () => void;
}

// Viewport dimensions in tiles (odd numbers keep player near center)
const VIEWPORT_W = 11;
const VIEWPORT_H = 9;
const MAX_TILE_SIZE = 44; // px — ideal tap target on mobile
const APP_PADDING = 32; // 1rem padding on each side

const TILE_COLORS: Record<string, string> = {
  grass: '#4a7c3f',
  path: '#c8a96e',
  water: '#2a6fa8',
  wall: '#6b6b6b',
  exit: '#f5c518',
};

function getFacingOffset(tileSize: number): Record<Direction, { top: number; left: number; w: number; h: number }> {
  return {
    north: { top: 0, left: 4, w: tileSize - 8, h: 6 },
    south: { top: tileSize - 6, left: 4, w: tileSize - 8, h: 6 },
    east: { top: 4, left: tileSize - 6, w: 6, h: tileSize - 8 },
    west: { top: 4, left: 0, w: 6, h: tileSize - 8 },
  };
}

function useTileSize(): number {
  const calc = () => Math.min(MAX_TILE_SIZE, Math.floor((window.innerWidth - APP_PADDING) / VIEWPORT_W));
  const [tileSize, setTileSize] = useState(calc);
  useEffect(() => {
    const onResize = () => setTileSize(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return tileSize;
}

const MAX_CLICK_DISTANCE = 3;

/** Given player position and a clicked tile, return the move direction or null. */
export function clickToDirection(
  playerX: number, playerY: number, clickX: number, clickY: number,
): Direction | null {
  const dx = clickX - playerX;
  const dy = clickY - playerY;
  const dist = Math.abs(dx) + Math.abs(dy);
  if (dist === 0 || dist > MAX_CLICK_DISTANCE || (dx !== 0 && dy !== 0)) return null;
  return dx > 0 ? 'east' : dx < 0 ? 'west' : dy < 0 ? 'north' : 'south';
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getCameraOrigin(
  playerX: number,
  playerY: number,
  mapW: number,
  mapH: number,
): { camX: number; camY: number } {
  const camX = clamp(playerX - Math.floor(VIEWPORT_W / 2), 0, Math.max(0, mapW - VIEWPORT_W));
  const camY = clamp(playerY - Math.floor(VIEWPORT_H / 2), 0, Math.max(0, mapH - VIEWPORT_H));
  return { camX, camY };
}

// Build a flat array of tiles visible in the current viewport
function getVisibleTiles(
  state: AreaState,
  camX: number,
  camY: number,
): { type: string; col: number; row: number }[] {
  const tiles: { type: string; col: number; row: number }[] = [];
  for (let row = 0; row < VIEWPORT_H; row++) {
    for (let col = 0; col < VIEWPORT_W; col++) {
      const mapRow = camY + row;
      const mapCol = camX + col;
      const tile = state.tiles[mapRow]?.[mapCol];
      tiles.push({ type: tile?.type ?? 'wall', col, row });
    }
  }
  return tiles;
}

export function GameView({ mode, onExit }: GameViewProps) {
  const [areaState, setAreaState] = useState<AreaState | null>(null);
  const [player, setPlayer] = useState<Entity | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exited, setExited] = useState(false);
  const movingRef = useRef(false); // prevent move spam in backend mode
  const [dialogueNpc, setDialogueNpc] = useState<Entity | null>(null);

  // Build a local area state for frontend mode from the map def
  const buildFrontendState = useCallback((map: MapDef): AreaState => ({
    mapId: map.id,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    entities: (map.npcs ?? []).map((npc) => ({
      id: npc.id,
      type: 'npc' as const,
      x: npc.x,
      y: npc.y,
      facing: npc.facing,
      name: npc.name,
      dialogueFile: npc.dialogueFile,
    })),
  }), []);

  // Initialize
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (mode === 'frontend') {
          // Load map from backend; run movement locally
          const map = await api.get<MapDef>('/area/map');
          if (cancelled) return;
          const state = buildFrontendState(map);
          const p: Entity = {
            id: 'local',
            type: 'player',
            x: map.spawnX,
            y: map.spawnY,
            facing: 'south',
          };
          setAreaState(state);
          setPlayer(p);
        } else {
          // Join the backend area
          const res = await api.post<{ areaId: number; state: AreaState; player: Entity }>('/area/join');
          if (cancelled) return;
          setAreaId(res.areaId);
          setAreaState(res.state);
          setPlayer(res.player);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load area.';
          setMessage(errorMsg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => { cancelled = true; };
  }, [mode, buildFrontendState]);

  const handleMove = useCallback(
    async (direction: Direction) => {
      if (!areaState || !player || exited) return;

      if (mode === 'frontend') {
        // Client-side movement
        const result = applyMove(areaState, player, direction);
        setPlayer((p) =>
          p ? { ...p, x: result.newX, y: result.newY, facing: result.newFacing } : p,
        );
        if (result.exitedArea) {
          // Report position to backend and exit
          setExited(true);
          setMessage('You found the exit!');
          api
            .post('/area/exit', { x: result.newX, y: result.newY, areaDefId: 1 })
            .catch(console.error);
          setTimeout(onExit, 1500);
        }
      } else {
        // Backend movement
        if (movingRef.current) return;
        movingRef.current = true;
        try {
          const res = await api.post<{
            moveResult: MoveResult;
            state: AreaState;
            player: Entity | null;
          }>('/area/move', { direction });
          setAreaState(res.state);
          if (res.player) setPlayer(res.player);
          if (res.moveResult.exitedArea) {
            setExited(true);
            setMessage('You found the exit!');
            setTimeout(onExit, 1500);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Move failed.';
          setMessage(errorMsg);
        } finally {
          movingRef.current = false;
        }
      }
    },
    [areaState, player, exited, mode, onExit],
  );

  // Interact with NPC the player is facing
  const handleAction = useCallback(() => {
    if (!player || !areaState || dialogueNpc) return;
    const { dx, dy } = directionDelta(player.facing);
    const npc = areaState.entities.find(
      (en) => en.type === 'npc' && en.x === player.x + dx && en.y === player.y + dy,
    );
    if (npc) setDialogueNpc(npc);
  }, [player, areaState, dialogueNpc]);

  // Keyboard input
  useEffect(() => {
    if (dialogueNpc) return; // disable movement while dialogue is open
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'north',
      ArrowDown: 'south',
      ArrowLeft: 'west',
      ArrowRight: 'east',
      w: 'north',
      s: 'south',
      a: 'west',
      d: 'east',
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        handleAction();
        return;
      }
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        void handleMove(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove, handleAction, dialogueNpc]);

  // Tile click — move if adjacent, or interact with NPC
  const handleTileClick = useCallback(
    (mapCol: number, mapRow: number) => {
      if (!player || !areaState || dialogueNpc) return;
      const dir = clickToDirection(player.x, player.y, mapCol, mapRow);
      if (!dir) return;

      // Check if there's an adjacent NPC in that direction
      const { dx: ndx, dy: ndy } = directionDelta(dir);
      const npc = areaState.entities.find(
        (e) => e.type === 'npc' && e.x === player.x + ndx && e.y === player.y + ndy,
      );
      if (npc) {
        setPlayer((p) => p ? { ...p, facing: dir } : p);
        setDialogueNpc(npc);
        return;
      }
      void handleMove(dir);
    },
    [player, areaState, handleMove, dialogueNpc],
  );

  // Poll area state in backend mode every 3s to see other players
  useEffect(() => {
    if (mode !== 'backend' || !areaId || exited) return;
    const id = setInterval(async () => {
      try {
        const res = await api.get<{ state: AreaState; player: Entity | null }>('/area/state');
        setAreaState(res.state);
        if (res.player) setPlayer(res.player);
      } catch {
        // ignore poll failures silently
      }
    }, 3000);
    return () => clearInterval(id);
  }, [mode, areaId, exited]);

  const tileSize = useTileSize();
  const facingOffset = useMemo(() => getFacingOffset(tileSize), [tileSize]);

  if (loading) return <div className="game-loading">Loading area...</div>;
  if (!areaState || !player) return <div className="game-loading">{message || 'Error loading area.'}</div>;

  const { camX, camY } = getCameraOrigin(player.x, player.y, areaState.width, areaState.height);
  const visibleTiles = getVisibleTiles(areaState, camX, camY);

  // Entities visible in viewport
  const visibleEntities = areaState.entities.filter(
    (e) =>
      e.x >= camX && e.x < camX + VIEWPORT_W && e.y >= camY && e.y < camY + VIEWPORT_H,
  );
  // Local player in frontend mode isn't in entities array; add it
  const localPlayer: Entity | null =
    mode === 'frontend' ? player : null;
  const allVisibleEntities = localPlayer
    ? [localPlayer, ...visibleEntities]
    : visibleEntities;

  const viewportPx = tileSize * VIEWPORT_W;
  const viewportPyH = tileSize * VIEWPORT_H;

  return (
    <div className="game-view">
      <div className="game-hud">
        <span className="game-mode-badge">{mode === 'frontend' ? 'Single-player' : 'Multiplayer'}</span>
        <span className="game-coords">
          ({player.x}, {player.y}) facing {player.facing}
        </span>
        <button className="game-quit-btn" onClick={onExit}>
          Quit
        </button>
      </div>

      {message && <div className="game-message">{message}</div>}

      {/* Viewport */}
      <div
        className="game-viewport"
        style={{ width: viewportPx, height: viewportPyH, position: 'relative' }}
      >
        {/* Tile grid */}
        <div
          className="game-tile-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${VIEWPORT_W}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${VIEWPORT_H}, ${tileSize}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {visibleTiles.map(({ type, col, row }) => (
            <div
              key={`${col}-${row}`}
              className={`game-tile game-tile-${type}`}
              style={{
                width: tileSize,
                height: tileSize,
                backgroundColor: TILE_COLORS[type] ?? '#333',
                cursor: 'pointer',
                boxSizing: 'border-box',
                border: type === 'exit' ? '2px solid #fff700' : undefined,
              }}
              onClick={() => handleTileClick(camX + col, camY + row)}
            />
          ))}
        </div>

        {/* Entity layer — absolutely positioned over the grid */}
        {allVisibleEntities.map((entity) => {
          const viewX = (entity.x - camX) * tileSize;
          const viewY = (entity.y - camY) * tileSize;
          const isMe = entity.id === player.id || (mode === 'frontend' && entity.id === 'local');
          const isNpc = entity.type === 'npc';
          const facing = entity.facing ?? 'south';
          const fo = facingOffset[facing];

          // Color: red = me, blue = other player, green = NPC
          const bgColor = isNpc ? '#2d6a4f' : isMe ? '#e63946' : '#457b9d';

          return (
            <div
              key={entity.id}
              className={`game-entity ${isNpc ? 'game-npc' : 'game-player'}`}
              style={{
                position: 'absolute',
                left: viewX,
                top: viewY,
                width: tileSize,
                height: tileSize,
                backgroundColor: bgColor,
                borderRadius: isNpc ? 8 : 4,
                boxSizing: 'border-box',
                zIndex: 10,
                cursor: isNpc ? 'pointer' : undefined,
              }}
              onClick={isNpc ? (e) => {
                e.stopPropagation();
                handleTileClick(entity.x, entity.y);
              } : undefined}
            >
              {/* Facing indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: fo.top,
                  left: fo.left,
                  width: fo.w,
                  height: fo.h,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: 2,
                }}
              />
              {/* NPC name label */}
              {isNpc && entity.name && (
                <div
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    fontSize: 10,
                    color: '#c8a96e',
                    fontWeight: 'bold',
                    textShadow: '0 0 3px #000, 0 0 3px #000',
                    pointerEvents: 'none',
                  }}
                >
                  {entity.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* D-pad for mobile */}
      <DPad onMove={(dir) => void handleMove(dir)} onAction={handleAction} disabled={exited || !!dialogueNpc} />

      <div className="game-hint">
        WASD / arrows to move · Space / click NPC to talk · Exit tile glows yellow
      </div>

      {/* Dialogue window */}
      {dialogueNpc && (
        <DialogueWindow
          npcId={dialogueNpc.dialogueFile ?? dialogueNpc.id}
          npcName={dialogueNpc.name ?? 'Unknown'}
          onClose={() => setDialogueNpc(null)}
        />
      )}
    </div>
  );
}
