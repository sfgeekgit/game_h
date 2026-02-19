import { describe, it, expect } from 'vitest';
import { experienceRequired, canLevelUp, calculateLevel } from '../stats.js';

describe('experienceRequired', () => {
  it('returns 100 for level 1', () => {
    expect(experienceRequired(1)).toBe(100);
  });

  it('returns 150 for level 2 (100 * 1.5)', () => {
    expect(experienceRequired(2)).toBe(150);
  });

  it('increases with each level', () => {
    for (let i = 1; i < 10; i++) {
      expect(experienceRequired(i + 1)).toBeGreaterThan(experienceRequired(i));
    }
  });
});

describe('canLevelUp', () => {
  it('returns false when below threshold', () => {
    expect(canLevelUp(1, 50)).toBe(false);
  });

  it('returns true when at threshold', () => {
    expect(canLevelUp(1, 150)).toBe(true);
  });

  it('returns true when above threshold', () => {
    expect(canLevelUp(1, 999)).toBe(true);
  });
});

describe('calculateLevel', () => {
  it('returns 1 for 0 exp', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 for 149 exp (below level 2 threshold)', () => {
    expect(calculateLevel(149)).toBe(1);
  });

  it('returns 2 for 150 exp', () => {
    expect(calculateLevel(150)).toBe(2);
  });

  it('handles large exp values', () => {
    const level = calculateLevel(100000);
    expect(level).toBeGreaterThan(5);
  });
});
