import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GameView } from '../components/GameView.js';
import type { MapDef } from '@game_h/shared';

// A tiny 7x7 all-grass map with spawn in the center
function makeMiniMap(): MapDef {
  const grass = { type: 'grass' as const };
  const row = () => Array(7).fill(grass);
  return {
    id: 'test-map',
    name: 'Test',
    width: 7,
    height: 7,
    spawnX: 3,
    spawnY: 3,
    tiles: Array.from({ length: 7 }, row),
  };
}

vi.mock('../api.js', () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path === '/area/map') return Promise.resolve(makeMiniMap());
      return Promise.reject(new Error('Not found'));
    }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

describe('GameView — click to move', () => {
  const onExit = vi.fn();

  it('moves player one step when clicking up to 3 tiles away on same axis', async () => {
    render(<GameView mode="frontend" onExit={onExit} />);

    // Wait for map to load — player spawns at (3,3)
    await waitFor(() => {
      expect(screen.getByText(/\(3, 3\)/)).toBeInTheDocument();
    });

    // Find all tiles in the grid. The viewport is 11x9 but the map is 7x7,
    // so we look for grass tiles. We need to click one that is east of the player.
    const tiles = document.querySelectorAll('.game-tile');
    expect(tiles.length).toBeGreaterThan(0);

    // The viewport camera clamps to map bounds. With a 7x7 map and 11x9 viewport,
    // camX=0 camY=0. Player is at map (3,3), so in the grid the player tile is
    // at col=3, row=3. A tile 3 east is col=6, row=3 → index = row * 11 + col.
    const tileIndex = 3 * 11 + 6;
    fireEvent.click(tiles[tileIndex]);

    // Player should have moved 1 step east: (3,3) → (4,3)
    await waitFor(() => {
      expect(screen.getByText(/\(4, 3\)/)).toBeInTheDocument();
    });
  });

  it('does not move on diagonal clicks', async () => {
    render(<GameView mode="frontend" onExit={onExit} />);

    await waitFor(() => {
      expect(screen.getByText(/\(3, 3\)/)).toBeInTheDocument();
    });

    // Click a diagonal tile: col=5, row=5 (2 east, 2 south from player at 3,3)
    const tiles = document.querySelectorAll('.game-tile');
    const diagIndex = 5 * 11 + 5;
    fireEvent.click(tiles[diagIndex]);

    // Player should not have moved
    expect(screen.getByText(/\(3, 3\)/)).toBeInTheDocument();
  });

  it('does not move when clicking more than 3 tiles away', async () => {
    render(<GameView mode="frontend" onExit={onExit} />);

    await waitFor(() => {
      expect(screen.getByText(/\(3, 3\)/)).toBeInTheDocument();
    });

    // Click 4 tiles south: col=3, row=7 → index = 7 * 11 + 3
    // This is out of the 7x7 map but still a rendered viewport tile
    const tiles = document.querySelectorAll('.game-tile');
    const farIndex = 7 * 11 + 3;
    fireEvent.click(tiles[farIndex]);

    // Player should not have moved
    expect(screen.getByText(/\(3, 3\)/)).toBeInTheDocument();
  });
});
