import { describe, it, expect } from 'vitest';
import { applyMove, isTilePassable } from '../movement.js';
import type { AreaState, Entity } from '../mapTypes.js';

function makeState(tiles: string[][]): AreaState {
  return {
    mapId: 'test',
    width: tiles[0].length,
    height: tiles.length,
    tiles: tiles.map((row) => row.map((t) => ({ type: t as 'grass' | 'wall' | 'water' | 'path' | 'exit' }))),
    entities: [],
  };
}

function makePlayer(x: number, y: number): Entity {
  return { id: 'p1', type: 'player', x, y, facing: 'south' };
}

const simpleMap = makeState([
  ['grass', 'grass', 'grass'],
  ['grass', 'wall',  'grass'],
  ['grass', 'grass', 'exit'],
]);

describe('isTilePassable', () => {
  it('grass is passable', () => expect(isTilePassable({ type: 'grass' })).toBe(true));
  it('path is passable', () => expect(isTilePassable({ type: 'path' })).toBe(true));
  it('exit is passable', () => expect(isTilePassable({ type: 'exit' })).toBe(true));
  it('wall is impassable', () => expect(isTilePassable({ type: 'wall' })).toBe(false));
  it('water is impassable', () => expect(isTilePassable({ type: 'water' })).toBe(false));
});

describe('applyMove — success cases', () => {
  it('moves north', () => {
    const result = applyMove(simpleMap, makePlayer(0, 1), 'north');
    expect(result.success).toBe(true);
    expect(result.newX).toBe(0);
    expect(result.newY).toBe(0);
    expect(result.newFacing).toBe('north');
  });

  it('moves south', () => {
    const result = applyMove(simpleMap, makePlayer(0, 0), 'south');
    expect(result.success).toBe(true);
    expect(result.newY).toBe(1);
    expect(result.newFacing).toBe('south');
  });

  it('moves east', () => {
    const result = applyMove(simpleMap, makePlayer(0, 0), 'east');
    expect(result.success).toBe(true);
    expect(result.newX).toBe(1);
  });

  it('moves west', () => {
    const result = applyMove(simpleMap, makePlayer(1, 0), 'west');
    expect(result.success).toBe(true);
    expect(result.newX).toBe(0);
  });

  it('detects exit tile', () => {
    const result = applyMove(simpleMap, makePlayer(2, 1), 'south');
    expect(result.success).toBe(true);
    expect(result.exitedArea).toBe(true);
  });
});

describe('applyMove — blocked cases', () => {
  it('blocked by wall updates facing but keeps position', () => {
    const result = applyMove(simpleMap, makePlayer(0, 0), 'east'); // (1,0) is passable
    expect(result.success).toBe(true); // actually passable, pick a blocked case
    const blocked = applyMove(simpleMap, makePlayer(0, 0), 'south'); // (0,1) wall at (1,1)
    // (0,1) is grass — let's move to (0,0) trying to go to wall at (1,1)
    const blockResult = applyMove(simpleMap, makePlayer(0, 1), 'east'); // (1,1) is wall
    expect(blockResult.success).toBe(false);
    expect(blockResult.reason).toBe('impassable');
    expect(blockResult.newX).toBe(0); // didn't move
    expect(blockResult.newY).toBe(1);
    expect(blockResult.newFacing).toBe('east'); // facing updated
    expect(blockResult.exitedArea).toBe(false);
    void blocked; // suppress unused warning
    void result;
  });

  it('blocked at north boundary', () => {
    const result = applyMove(simpleMap, makePlayer(0, 0), 'north');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('out_of_bounds');
    expect(result.newY).toBe(0);
    expect(result.newFacing).toBe('north');
  });

  it('blocked at south boundary', () => {
    const result = applyMove(simpleMap, makePlayer(0, 2), 'south');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('out_of_bounds');
  });

  it('blocked at west boundary', () => {
    const result = applyMove(simpleMap, makePlayer(0, 0), 'west');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('out_of_bounds');
  });

  it('blocked at east boundary', () => {
    const result = applyMove(simpleMap, makePlayer(2, 0), 'east');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('out_of_bounds');
  });
});
