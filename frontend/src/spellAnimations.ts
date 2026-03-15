import type { Graphics } from 'pixi.js';

// Tile size in pixels — shared between grid rendering and spell effects
export const TILE_SIZE = 52;

// Params passed to every animation function
export interface SpellEffectState {
  casterPx: number;
  casterPy: number;
  targetPx: number;
  targetPy: number;
  aoeRadius: number;
  particles: Array<{ x: number; y: number }>;
}

export type SpellAnimFn = (g: Graphics, fx: SpellEffectState, t: number) => void;

// Registry keyed by SpellDef.animType — add new animation types here
export const SPELL_ANIM_REGISTRY: Record<string, SpellAnimFn> = {

  // Traveling arcane bolt with trail, impact ring (e.g. Magic Missile)
  arcane_bolt: (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty }, t) => {
    const travelFrac = 0.62;
    const travelT = Math.min(t / travelFrac, 1);
    const px = cx + (tx - cx) * travelT;
    const py = cy + (ty - cy) * travelT;
    for (let i = 1; i <= 3; i++) {
      const tT = Math.max(0, travelT - i * 0.1);
      g.circle(cx + (tx - cx) * tT, cy + (ty - cy) * tT, 5 - i)
        .fill({ color: 0xaa44ff, alpha: 0.45 - i * 0.08 });
    }
    if (t < 0.78) {
      g.circle(px, py, 7).fill({ color: 0xdd88ff, alpha: 0.95 });
      g.circle(px, py, 4).fill({ color: 0xffffff, alpha: 0.85 });
    }
    if (t >= 0.52) {
      const impT = (t - 0.52) / 0.48;
      g.circle(tx, ty, impT * 26).stroke({ color: 0xaa44ff, width: 2.5, alpha: (1 - impT) * 0.9 });
      g.circle(tx, ty, impT * 13).fill({ color: 0xffffff, alpha: (1 - impT) * 0.6 });
    }
  },

  // Traveling fireball with trail, then AoE explosion with embers (e.g. Fireball)
  fire_projectile: (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty, aoeRadius, particles }, t) => {
    const splitT = 0.42;
    if (t < splitT) {
      const travelT = t / splitT;
      const px = cx + (tx - cx) * travelT;
      const py = cy + (ty - cy) * travelT;
      for (let i = 1; i <= 5; i++) {
        const tT = Math.max(0, travelT - i * 0.09);
        g.circle(cx + (tx - cx) * tT, cy + (ty - cy) * tT, 8 - i)
          .fill({ color: i < 3 ? 0xff6600 : 0xff2200, alpha: 0.7 - i * 0.08 });
      }
      const pulse = 1 + Math.sin(t * 42) * 0.13;
      g.circle(px, py, 11 * pulse).fill({ color: 0xffaa00, alpha: 0.95 });
      g.circle(px, py, 6 * pulse).fill({ color: 0xffffff, alpha: 0.7 });
    } else {
      const expT = (t - splitT) / (1 - splitT);
      const maxR = (aoeRadius + 0.65) * TILE_SIZE;
      g.circle(tx, ty, expT * maxR * 1.18).fill({ color: 0xff4400, alpha: (1 - expT) * 0.28 });
      g.circle(tx, ty, expT * maxR).stroke({ color: 0xff6600, width: 3, alpha: (1 - expT) * 0.92 });
      const innerAlpha = Math.max(0, (0.38 - expT) / 0.38) * 0.88;
      g.circle(tx, ty, expT * maxR * 0.55).fill({ color: 0xffee00, alpha: innerAlpha });
      for (const p of particles) {
        const angle = p.x * Math.PI * 2;
        const dist = expT * maxR * (0.45 + p.y * 0.75);
        g.circle(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist, 3.5 * (1 - expT))
          .fill({ color: 0xff8800, alpha: (1 - expT) * 0.9 });
      }
    }
  },

  // Expanding concentric flame waves from caster + flying embers (e.g. Burning Hands)
  fire_burst: (g, { casterPx: cx, casterPy: cy, aoeRadius, particles }, t) => {
    const maxR = (aoeRadius + 1.0) * TILE_SIZE;
    for (let i = 0; i < 5; i++) {
      const wT = Math.max(0, Math.min((t - i * 0.07) / 0.65, 1));
      if (wT <= 0) continue;
      g.circle(cx, cy, wT * maxR).fill({ color: i % 2 === 0 ? 0xff3300 : 0xff8800, alpha: (1 - wT) * 0.5 });
    }
    g.circle(cx, cy, t * maxR).stroke({ color: 0xffaa00, width: 2, alpha: (1 - t) * 0.75 });
    for (const p of particles) {
      const angle = p.x * Math.PI * 2;
      const dist = t * maxR * (0.35 + p.y * 0.75);
      g.circle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 3 * (1 - t))
        .fill({ color: 0xff6600, alpha: (1 - t) * 0.88 });
    }
  },

  // Expanding green rings + plus symbol + rising sparkles (e.g. Heal)
  heal_pulse: (g, { targetPx: tx, targetPy: ty, particles }, t) => {
    const baseR = TILE_SIZE * 0.55;
    const alpha1 = t < 0.5 ? t * 2 : (1 - t) * 2;
    g.circle(tx, ty, t * baseR * 2.1).stroke({ color: 0x44ff88, width: 2.5, alpha: alpha1 * 0.9 });
    if (t > 0.22) {
      const r2T = (t - 0.22) / 0.78;
      g.circle(tx, ty, r2T * baseR * 1.6).stroke({ color: 0x00dd66, width: 1.5, alpha: (1 - r2T) * 0.72 });
    }
    const crossAlpha = t < 0.65 ? Math.min(t / 0.18, 1) : Math.max(0, (1 - t) / 0.35);
    if (crossAlpha > 0) {
      const cs = 11;
      g.moveTo(tx - cs, ty).lineTo(tx + cs, ty).stroke({ color: 0x88ffbb, width: 2.5, alpha: crossAlpha });
      g.moveTo(tx, ty - cs).lineTo(tx, ty + cs).stroke({ color: 0x88ffbb, width: 2.5, alpha: crossAlpha });
    }
    for (const p of particles) {
      g.circle(tx + (p.x - 0.5) * TILE_SIZE, ty - t * 48 + p.y * 22, 2.5)
        .fill({ color: 0x88ffcc, alpha: (1 - t) * 0.9 });
    }
  },

  // Pulsing frost area overlay + falling ice shard particles (e.g. Ice Storm)
  frost_storm: (g, { targetPx: tx, targetPy: ty, aoeRadius, particles }, t) => {
    const maxR = (aoeRadius + 0.65) * TILE_SIZE;
    const pulse = 0.22 + 0.13 * Math.sin(t * Math.PI * 7);
    g.circle(tx, ty, maxR).fill({ color: 0x88ddff, alpha: pulse * (1 - t * 0.65) });
    g.circle(tx, ty, maxR).stroke({ color: 0xaaeeff, width: 2, alpha: (1 - t) * 0.82 });
    for (const p of particles) {
      const angle = p.x * Math.PI * 2;
      const r = p.y * maxR * 0.92;
      const sx = tx + Math.cos(angle) * r;
      const sy = ty + Math.sin(angle) * r + (t * 35) % TILE_SIZE - TILE_SIZE / 2;
      const blink = Math.sin(t * 9 + p.x * 5.5) * 0.5 + 0.5;
      const shardAlpha = blink * (1 - t * 0.72);
      g.circle(sx, sy, 2.5).fill({ color: 0xffffff, alpha: shardAlpha });
      g.moveTo(sx - 4, sy).lineTo(sx + 4, sy).stroke({ color: 0xaaddff, width: 1, alpha: shardAlpha * 0.7 });
      g.moveTo(sx, sy - 4).lineTo(sx, sy + 4).stroke({ color: 0xaaddff, width: 1, alpha: shardAlpha * 0.7 });
    }
  },
};
