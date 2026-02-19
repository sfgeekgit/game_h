import { describe, it, expect } from 'vitest';
import { calculateDamage, resolveCombat } from '../combat.js';

describe('calculateDamage', () => {
  it('calculates base damage (attack minus defense)', () => {
    const result = calculateDamage(10, 3, 0.5);
    expect(result.damage).toBe(7);
    expect(result.isCritical).toBe(false);
  });

  it('enforces minimum damage of 1', () => {
    const result = calculateDamage(1, 100, 0.5);
    expect(result.damage).toBe(1);
  });

  it('doubles damage on critical hit (roll > 0.9)', () => {
    const result = calculateDamage(10, 3, 0.95);
    expect(result.damage).toBe(14);
    expect(result.isCritical).toBe(true);
  });

  it('handles zero defense', () => {
    const result = calculateDamage(10, 0, 0.5);
    expect(result.damage).toBe(10);
  });

  it('treats exactly 0.9 as non-critical', () => {
    const result = calculateDamage(10, 0, 0.9);
    expect(result.isCritical).toBe(false);
  });

  it('treats 0.91 as critical', () => {
    const result = calculateDamage(10, 0, 0.91);
    expect(result.isCritical).toBe(true);
  });
});

describe('resolveCombat', () => {
  it('subtracts damage from target HP', () => {
    const result = resolveCombat(10, 3, 20, 0.5);
    expect(result.damage).toBe(7);
    expect(result.remainingHp).toBe(13);
  });

  it('clamps HP at zero', () => {
    const result = resolveCombat(100, 0, 10, 0.5);
    expect(result.remainingHp).toBe(0);
  });

  it('handles critical hit in combat', () => {
    const result = resolveCombat(10, 0, 100, 0.95);
    expect(result.damage).toBe(20);
    expect(result.remainingHp).toBe(80);
    expect(result.isCritical).toBe(true);
  });
});
