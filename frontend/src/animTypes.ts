import type { Graphics } from 'pixi.js';

// Params passed to every animation function
export interface SpellEffectState {
  casterPx: number;
  casterPy: number;
  targetPx: number;
  targetPy: number;
  aoeRadius: number;
  particles: Array<{ x: number; y: number }>;
  tileSize: number;
}

export type AnimFn = (g: Graphics, fx: SpellEffectState, t: number) => void;

// Animation helper functions — used by spell and weapon animation source files
export const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
export const easeIn = (x: number) => x * x;

export function normalize(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dx, dy, len, nx: dx / len, ny: dy / len };
}
