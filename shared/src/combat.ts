import type { CombatResult } from './types.js';

/**
 * Calculate damage from an attack.
 * @param randomSeed - optional fixed value 0..1 for deterministic testing
 */
export function calculateDamage(
  attackPower: number,
  defense: number,
  randomSeed?: number,
): CombatResult {
  const roll = randomSeed ?? Math.random();
  const isCritical = roll > 0.9;
  const baseDamage = Math.max(1, attackPower - defense);
  const damage = isCritical ? baseDamage * 2 : baseDamage;

  return { damage, isCritical, remainingHp: 0 };
}

/**
 * Apply damage to a target and return updated HP.
 */
export function resolveCombat(
  attackPower: number,
  defense: number,
  targetHp: number,
  randomSeed?: number,
): CombatResult {
  const result = calculateDamage(attackPower, defense, randomSeed);
  result.remainingHp = Math.max(0, targetHp - result.damage);
  return result;
}
