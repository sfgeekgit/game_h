import { useState, useEffect, useCallback, useRef } from 'react';
import { applyMove, townSquare } from '@game_h/shared';
import type { AreaState, Direction, Entity, MapDef, MoveResult } from '@game_h/shared';
import { api } from '../api.js';
import { DPad } from './DPad.js';

interface GameViewProps {
  mode: 'frontend' | 'backend';
  onExit: () => void;
}

// Viewport dimensions in tiles (odd numbers keep player near center)
const VIEWPORT_W = 11;
const VIEWPORT_H = 9;
const TILE_SIZE = 44; // px — comfortable tap target on mobile

const TILE_COLORS: Record<string, string> = {
  grass: '#4a7c3f',
  path: '#c8a96e',
  water: '#2a6fa8',
  wall: '#6b6b6b',
  exit: '#f5c518',
};

const FACING_OFFSET: Record<Direction, { top: number; left: number; w: number; h: number }> = {
  north: { top: 0, left: 4, w: TILE_SIZE - 8, h: 6 },
  south: { top: TILE_SIZE - 6, left: 4, w: TILE_SIZE - 8, h: 6 },
  east: { top: 4, left: TILE_SIZE - 6, w: 6, h: TILE_SIZE - 8 },
  west: { top: 4, left: 0, w: 6, h: TILE_SIZE - 8 },
};

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

  // Build a local area state for frontend mode from the map def
  const buildFrontendState = useCallback((map: MapDef): AreaState => ({
    mapId: map.id,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    entities: [],
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
        if (!cancelled) setMessage('Failed to load area.');
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
          setMessage('Move failed.');
        } finally {
          movingRef.current = false;
        }
      }
    },
    [areaState, player, exited, mode, onExit],
  );

  // Keyboard input
  useEffect(() => {
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
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        void handleMove(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove]);

  // Tile click — move if adjacent
  const handleTileClick = useCallback(
    (mapCol: number, mapRow: number) => {
      if (!player) return;
      const dx = mapCol - player.x;
      const dy = mapRow - player.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return; // only adjacent
      const dir: Direction =
        dx === 1 ? 'east' : dx === -1 ? 'west' : dy === -1 ? 'north' : 'south';
      void handleMove(dir);
    },
    [player, handleMove],
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

  if (loading) return <div className="game-loading">Loading area...</div>;
  if (!areaState || !player) return <div className="game-loading">Error loading area.</div>;

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
  const allVisiblePlayers = localPlayer
    ? [localPlayer, ...visibleEntities]
    : visibleEntities;

  const viewportPx = TILE_SIZE * VIEWPORT_W;
  const viewportPyH = TILE_SIZE * VIEWPORT_H;

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
            gridTemplateColumns: `repeat(${VIEWPORT_W}, ${TILE_SIZE}px)`,
            gridTemplateRows: `repeat(${VIEWPORT_H}, ${TILE_SIZE}px)`,
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
                width: TILE_SIZE,
                height: TILE_SIZE,
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
        {allVisiblePlayers.map((entity) => {
          const viewX = (entity.x - camX) * TILE_SIZE;
          const viewY = (entity.y - camY) * TILE_SIZE;
          const isMe = entity.id === player.id || (mode === 'frontend' && entity.id === 'local');
          const facing = entity.facing ?? 'south';
          const fo = FACING_OFFSET[facing];
          return (
            <div
              key={entity.id}
              className="game-entity game-player"
              style={{
                position: 'absolute',
                left: viewX,
                top: viewY,
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundColor: isMe ? '#e63946' : '#457b9d',
                borderRadius: 4,
                boxSizing: 'border-box',
                zIndex: 10,
              }}
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
            </div>
          );
        })}
      </div>

      {/* D-pad for mobile */}
      <DPad onMove={(dir) => void handleMove(dir)} disabled={exited} />

      <div className="game-hint">
        WASD / arrows or tap adjacent tile to move · Exit tile glows yellow
      </div>
    </div>
  );
}
