/**
 * Experience required to reach a given level.
 * Level 1 = 100, scaling by 1.5x per level.
 */
export function experienceRequired(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function canLevelUp(currentLevel: number, currentExp: number): boolean {
  return currentExp >= experienceRequired(currentLevel + 1);
}

/**
 * Determine the level for a given total experience.
 */
export function calculateLevel(totalExp: number): number {
  let level = 1;
  while (totalExp >= experienceRequired(level + 1)) {
    level++;
  }
  return level;
}
