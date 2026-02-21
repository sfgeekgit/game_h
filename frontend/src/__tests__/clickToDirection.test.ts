import { describe, it, expect } from 'vitest';
import { clickToDirection } from '../components/GameView.js';

describe('clickToDirection', () => {
  const px = 5, py = 5;

  it('returns direction for adjacent tiles', () => {
    expect(clickToDirection(px, py, 6, 5)).toBe('east');
    expect(clickToDirection(px, py, 4, 5)).toBe('west');
    expect(clickToDirection(px, py, 5, 4)).toBe('north');
    expect(clickToDirection(px, py, 5, 6)).toBe('south');
  });

  it('returns direction for tiles 2-3 away on same axis', () => {
    expect(clickToDirection(px, py, 8, 5)).toBe('east');
    expect(clickToDirection(px, py, 3, 5)).toBe('west');
    expect(clickToDirection(px, py, 5, 2)).toBe('north');
    expect(clickToDirection(px, py, 5, 7)).toBe('south');
  });

  it('returns null for tiles more than 3 away', () => {
    expect(clickToDirection(px, py, 9, 5)).toBeNull();
    expect(clickToDirection(px, py, 1, 5)).toBeNull();
    expect(clickToDirection(px, py, 5, 1)).toBeNull();
    expect(clickToDirection(px, py, 5, 9)).toBeNull();
  });

  it('returns null for diagonal clicks', () => {
    expect(clickToDirection(px, py, 6, 6)).toBeNull();
    expect(clickToDirection(px, py, 4, 4)).toBeNull();
    expect(clickToDirection(px, py, 7, 4)).toBeNull();
  });

  it('returns null when clicking own tile', () => {
    expect(clickToDirection(px, py, 5, 5)).toBeNull();
  });
});
