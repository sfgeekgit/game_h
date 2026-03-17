import { TILE_SIZE } from './spellAnimations.js';
import type { SpellAnimFn } from './spellAnimations.js';

// Ease-out: fast start, gentle landing
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
// Ease-in: slow start, accelerating
const easeIn = (x: number) => x * x;

// Returns the unit vector and length from (cx,cy) to (tx,ty)
function normalize(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dx, dy, len, nx: dx / len, ny: dy / len };
}

// Registry keyed by WeaponDef.animType — add new weapon animation types here
export const WEAPON_ANIM_REGISTRY: Record<string, SpellAnimFn> = {

  // ── SWORD SLASH ──────────────────────────────────────────────────────
  // Wide sweeping arc with motion blur, steel glint, and hot sparks
  sword_slash: (g, { targetPx: tx, targetPy: ty, particles }, t) => {
    const r = TILE_SIZE * 0.72;
    const startAngle = -Math.PI * 0.55;
    const endAngle = Math.PI * 0.55;
    const sweepT = easeOut(Math.min(t / 0.5, 1));
    const sweepAngle = startAngle + (endAngle - startAngle) * sweepT;

    // Screen-shake effect: slight offset during early impact
    const shakeX = t > 0.15 && t < 0.4 ? Math.sin(t * 120) * 1.5 * (0.4 - t) : 0;
    const shakeY = t > 0.15 && t < 0.4 ? Math.cos(t * 90) * 1.2 * (0.4 - t) : 0;
    const sx = tx + shakeX;
    const sy = ty + shakeY;

    // Motion-blur arc trail — thick fading sweep
    if (t < 0.65) {
      const bladeAlpha = t < 0.4 ? 0.95 : (0.65 - t) / 0.25 * 0.95;
      // Outer glow arc
      for (let i = 0; i < 12; i++) {
        const frac = i / 12;
        const a = startAngle + (sweepAngle - startAngle) * frac;
        const fadeByTrail = 0.3 + 0.7 * frac; // brighter at leading edge
        g.circle(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 4)
          .fill({ color: 0xffeedd, alpha: bladeAlpha * fadeByTrail * 0.5 });
      }
      // Sharp blade line
      g.moveTo(sx, sy)
        .lineTo(sx + Math.cos(sweepAngle) * r, sy + Math.sin(sweepAngle) * r)
        .stroke({ color: 0xffffff, width: 3.5, alpha: bladeAlpha });
      // Inner bright edge
      g.moveTo(sx, sy)
        .lineTo(sx + Math.cos(sweepAngle) * r * 0.92, sy + Math.sin(sweepAngle) * r * 0.92)
        .stroke({ color: 0xffffcc, width: 1.5, alpha: bladeAlpha });
      // Steel glint at tip
      const glint = Math.sin(t * 25) * 0.5 + 0.5;
      g.circle(sx + Math.cos(sweepAngle) * r, sy + Math.sin(sweepAngle) * r, 5 * glint)
        .fill({ color: 0xffffff, alpha: bladeAlpha * glint * 0.8 });
    }

    // Impact flash — bright white burst at moment of hit
    if (t >= 0.2 && t < 0.6) {
      const impT = (t - 0.2) / 0.4;
      g.circle(sx, sy, easeOut(impT) * 22)
        .stroke({ color: 0xffffff, width: 3, alpha: (1 - impT) * 0.9 });
      g.circle(sx, sy, easeOut(impT) * 12)
        .fill({ color: 0xffeecc, alpha: (1 - impT) * 0.4 });
    }

    // Hot sparks flying outward
    for (const p of particles) {
      const sparkStart = 0.15 + p.y * 0.1;
      if (t < sparkStart) continue;
      const sparkT = easeOut((t - sparkStart) / (1 - sparkStart));
      const angle = p.x * Math.PI * 2;
      const dist = sparkT * TILE_SIZE * 0.8 * (0.4 + p.y * 0.6);
      const sparkAlpha = (1 - sparkT) * 0.95;
      const sparkR = (1 - sparkT) * 3;
      // Bright core
      g.circle(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, sparkR)
        .fill({ color: 0xffdd44, alpha: sparkAlpha });
      // Warm outer glow
      g.circle(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, sparkR * 2)
        .fill({ color: 0xff8800, alpha: sparkAlpha * 0.3 });
    }
  },

  // ── DAGGER STAB ──────────────────────────────────────────────────────
  // Lightning-fast thrust with gleaming blade, blood-red starburst, and speed lines
  dagger_stab: (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty, particles }, t) => {
    const { nx, ny } = normalize(cx, cy, tx, ty);
    // Perpendicular for speed lines
    const px = -ny;
    const py = nx;

    // Speed lines — parallel streaks showing velocity
    if (t < 0.35) {
      const speedAlpha = (0.35 - t) / 0.35 * 0.6;
      for (let i = -2; i <= 2; i++) {
        const ox = px * i * 6;
        const oy = py * i * 6;
        const lineStart = 0.6 + t * 0.3;
        const sx = cx + dx * lineStart + ox;
        const sy = cy + dy * lineStart + oy;
        g.moveTo(sx, sy).lineTo(sx - nx * 18, sy - ny * 18)
          .stroke({ color: 0xcccccc, width: 1, alpha: speedAlpha * (1 - Math.abs(i) * 0.25) });
      }
    }

    // Blade thrust — fast acceleration into target
    if (t < 0.3) {
      const thrustT = easeIn(t / 0.3);
      const tipX = tx - nx * TILE_SIZE * 0.5 * (1 - thrustT);
      const tipY = ty - ny * TILE_SIZE * 0.5 * (1 - thrustT);
      // Blade body
      g.moveTo(tipX - nx * 16, tipY - ny * 16)
        .lineTo(tipX, tipY)
        .stroke({ color: 0xdddddd, width: 2.5, alpha: 0.95 });
      // Gleaming tip
      g.circle(tipX, tipY, 4).fill({ color: 0xffffff, alpha: 0.95 });
      g.circle(tipX, tipY, 7).fill({ color: 0xffffff, alpha: 0.3 });
    }

    // Impact — crimson starburst + white flash
    if (t >= 0.2) {
      const burstT = easeOut((t - 0.2) / 0.8);
      // Central white flash
      if (t < 0.5) {
        const flashT = (t - 0.2) / 0.3;
        g.circle(tx, ty, (1 - flashT) * 8).fill({ color: 0xffffff, alpha: (1 - flashT) * 0.9 });
      }
      // Crimson starburst rays
      for (const p of particles) {
        const angle = p.x * Math.PI * 2;
        const dist = burstT * TILE_SIZE * 0.55 * (0.5 + p.y * 0.5);
        const rayAlpha = (1 - burstT) * 0.9;
        // Red slash mark
        g.moveTo(tx + Math.cos(angle) * dist * 0.3, ty + Math.sin(angle) * dist * 0.3)
          .lineTo(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist)
          .stroke({ color: 0xcc2222, width: 2 * (1 - burstT), alpha: rayAlpha });
        // Bright tip
        g.circle(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist, 2 * (1 - burstT))
          .fill({ color: 0xff4444, alpha: rayAlpha });
      }
      // Expanding ring
      g.circle(tx, ty, burstT * 16)
        .stroke({ color: 0xff3333, width: 1.5, alpha: (1 - burstT) * 0.6 });
    }
  },

  // ── STAFF STRIKE ─────────────────────────────────────────────────────
  // Mystical wooden staff: downward slam with golden energy shockwave and runic sparks
  staff_strike: (g, { targetPx: tx, targetPy: ty, particles }, t) => {
    // Staff slam — accelerating downward
    if (t < 0.35) {
      const slamT = easeIn(t / 0.35);
      const topY = ty - TILE_SIZE * 0.8 * (1 - slamT);
      // Staff body (thick wooden rod)
      g.moveTo(tx - 2, topY).lineTo(tx + 2, topY).lineTo(tx + 1, ty).lineTo(tx - 1, ty)
        .fill({ color: 0x6b4226, alpha: 0.95 });
      // Enchanted glow around staff head
      g.circle(tx, topY, 6).fill({ color: 0xffcc00, alpha: 0.4 * slamT });
      g.circle(tx, topY, 3).fill({ color: 0xffffff, alpha: 0.7 * slamT });
    }

    // Golden energy shockwave — double ring expanding outward
    if (t >= 0.25) {
      const ringT = easeOut((t - 0.25) / 0.75);
      // Outer ring
      g.circle(tx, ty, ringT * TILE_SIZE * 0.85)
        .stroke({ color: 0xddaa22, width: 3, alpha: (1 - ringT) * 0.9 });
      // Inner ring (delayed)
      if (t >= 0.35) {
        const ring2T = easeOut((t - 0.35) / 0.65);
        g.circle(tx, ty, ring2T * TILE_SIZE * 0.55)
          .stroke({ color: 0xffdd44, width: 2, alpha: (1 - ring2T) * 0.7 });
      }
      // Ground glow
      g.circle(tx, ty, ringT * TILE_SIZE * 0.5)
        .fill({ color: 0xffee88, alpha: (1 - ringT) * 0.2 });
    }

    // Impact flash at ground
    if (t >= 0.25 && t < 0.55) {
      const flashT = (t - 0.25) / 0.3;
      g.circle(tx, ty, 10 * (1 - flashT)).fill({ color: 0xffffff, alpha: (1 - flashT) * 0.8 });
    }

    // Runic sparks — rising golden particles with slight spiral
    for (const p of particles) {
      const sparkStart = 0.3 + p.y * 0.1;
      if (t < sparkStart) continue;
      const sparkT = (t - sparkStart) / (1 - sparkStart);
      const baseAngle = p.x * Math.PI * 2;
      const spiral = baseAngle + sparkT * Math.PI * 1.5; // spiral outward
      const dist = easeOut(sparkT) * TILE_SIZE * 0.6 * (0.3 + p.y * 0.7);
      const rise = sparkT * 25 * p.y; // float upward
      const sparkAlpha = (1 - sparkT) * 0.9;
      g.circle(tx + Math.cos(spiral) * dist, ty + Math.sin(spiral) * dist - rise, 2.5 * (1 - sparkT))
        .fill({ color: 0xffcc22, alpha: sparkAlpha });
      g.circle(tx + Math.cos(spiral) * dist, ty + Math.sin(spiral) * dist - rise, 4.5 * (1 - sparkT))
        .fill({ color: 0xddaa00, alpha: sparkAlpha * 0.25 });
    }
  },

  // ── ARROW SHOT ───────────────────────────────────────────────────────
  // Arrow with fletching trail, motion streak, and satisfying thunk impact
  arrow_shot: (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty, particles }, t) => {
    const { dx, dy, len, nx, ny } = normalize(cx, cy, tx, ty);
    const perpX = -ny;
    const perpY = nx;

    const travelFrac = 0.55;
    const travelT = easeOut(Math.min(t / travelFrac, 1));
    const headX = cx + dx * travelT;
    const headY = cy + dy * travelT;

    // Arrow in flight
    if (t < 0.7) {
      const arrowAlpha = t < 0.55 ? 0.95 : (0.7 - t) / 0.15 * 0.95;

      // Motion streak behind arrow
      if (t < 0.55) {
        const streakLen = Math.min(travelT, 0.3) * len;
        g.moveTo(headX, headY)
          .lineTo(headX - nx * streakLen, headY - ny * streakLen)
          .stroke({ color: 0xddddaa, width: 1, alpha: arrowAlpha * 0.3 });
      }

      // Fletching trail — fading feather marks
      for (let i = 1; i <= 4; i++) {
        const trailT = Math.max(0, travelT - i * 0.08);
        const trailX = cx + dx * trailT;
        const trailY = cy + dy * trailT;
        const featherAlpha = arrowAlpha * (0.5 - i * 0.1);
        if (featherAlpha <= 0) continue;
        // Tiny V-shape fletching
        g.moveTo(trailX + perpX * 3, trailY + perpY * 3)
          .lineTo(trailX - nx * 4, trailY - ny * 4)
          .lineTo(trailX - perpX * 3, trailY - perpY * 3)
          .stroke({ color: 0xaa8855, width: 1, alpha: featherAlpha });
      }

      // Arrow shaft
      g.moveTo(headX, headY)
        .lineTo(headX - nx * 14, headY - ny * 14)
        .stroke({ color: 0x8b6914, width: 2.5, alpha: arrowAlpha });

      // Arrowhead — triangular
      g.moveTo(headX + nx * 5, headY + ny * 5)
        .lineTo(headX + perpX * 3, headY + perpY * 3)
        .lineTo(headX - perpX * 3, headY - perpY * 3)
        .fill({ color: 0xcccccc, alpha: arrowAlpha });

      // Glint on arrowhead
      const glint = Math.sin(t * 30) * 0.4 + 0.6;
      g.circle(headX + nx * 3, headY + ny * 3, 2)
        .fill({ color: 0xffffff, alpha: arrowAlpha * glint });
    }

    // Impact — thunk + splinter + dust
    if (t >= 0.45) {
      const impT = easeOut((t - 0.45) / 0.55);

      // Embedded arrow at target (stays visible)
      if (t < 0.9) {
        const stickAlpha = t < 0.75 ? 0.9 : (0.9 - t) / 0.15 * 0.9;
        g.moveTo(tx, ty)
          .lineTo(tx - nx * 12, ty - ny * 12)
          .stroke({ color: 0x8b6914, width: 2, alpha: stickAlpha });
        g.moveTo(tx + nx * 3, ty + ny * 3)
          .lineTo(tx + perpX * 2.5, ty + perpY * 2.5)
          .lineTo(tx - perpX * 2.5, ty - perpY * 2.5)
          .fill({ color: 0xaaaaaa, alpha: stickAlpha });
      }

      // Impact dust ring
      g.circle(tx, ty, impT * 18)
        .stroke({ color: 0xccaa77, width: 2, alpha: (1 - impT) * 0.7 });

      // Wood splinters + dust particles
      for (const p of particles) {
        const angle = p.x * Math.PI * 2;
        const dist = impT * TILE_SIZE * 0.4 * (0.3 + p.y * 0.7);
        const rise = impT * 12 * p.y - impT * impT * 18 * p.y; // arc up then down
        g.circle(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist - rise,
          2 * (1 - impT))
          .fill({ color: p.y > 0.5 ? 0xaa8844 : 0x998866, alpha: (1 - impT) * 0.85 });
      }
    }
  },

  // ── CLUB SMASH ───────────────────────────────────────────────────────
  // Brutal overhead smash: heavy club descends, earth-shattering impact with dust and debris
  club_smash: (g, { targetPx: tx, targetPy: ty, particles }, t) => {
    // Heavy club descending — with wind-up wobble
    if (t < 0.3) {
      const smashT = easeIn(t / 0.3);
      const topY = ty - TILE_SIZE * (1 - smashT);
      // Club shadow growing on ground as it descends
      const shadowScale = 0.3 + smashT * 0.7;
      g.ellipse(tx, ty + 2, 8 * shadowScale, 4 * shadowScale)
        .fill({ color: 0x000000, alpha: 0.3 * smashT });
      // Club head — chunky rectangle
      const wobble = Math.sin(t * 40) * 2 * (1 - smashT);
      g.moveTo(tx - 7 + wobble, topY - 4)
        .lineTo(tx + 7 + wobble, topY - 4)
        .lineTo(tx + 6 + wobble, topY + 6)
        .lineTo(tx - 6 + wobble, topY + 6)
        .fill({ color: 0x5a3e1e, alpha: 0.95 });
      // Club studs/nails
      g.circle(tx - 3 + wobble, topY, 1.5).fill({ color: 0x888888, alpha: 0.8 });
      g.circle(tx + 3 + wobble, topY, 1.5).fill({ color: 0x888888, alpha: 0.8 });
    }

    // IMPACT — screen-shaking heavy blow
    if (t >= 0.22) {
      const impT = easeOut((t - 0.22) / 0.78);

      // Ground crack lines radiating outward
      for (let i = 0; i < 6; i++) {
        const crackAngle = (i / 6) * Math.PI * 2 + 0.3;
        const crackLen = impT * TILE_SIZE * 0.7 * (0.5 + (i % 3) * 0.2);
        const crackAlpha = (1 - impT) * 0.7;
        g.moveTo(tx, ty)
          .lineTo(tx + Math.cos(crackAngle) * crackLen, ty + Math.sin(crackAngle) * crackLen)
          .stroke({ color: 0x3a2a10, width: 2 * (1 - impT), alpha: crackAlpha });
      }

      // Heavy shockwave — double ring
      g.circle(tx, ty, impT * TILE_SIZE * 0.95)
        .stroke({ color: 0x8b6914, width: 4, alpha: (1 - impT) * 0.8 });
      if (t >= 0.3) {
        const ring2T = easeOut((t - 0.3) / 0.7);
        g.circle(tx, ty, ring2T * TILE_SIZE * 0.6)
          .stroke({ color: 0xaa8833, width: 2.5, alpha: (1 - ring2T) * 0.6 });
      }

      // Dust cloud — expanding semi-transparent fill
      g.circle(tx, ty, impT * TILE_SIZE * 0.55)
        .fill({ color: 0x997744, alpha: (1 - impT) * 0.2 });

      // Central impact flash
      if (t < 0.45) {
        const flashT = (t - 0.22) / 0.23;
        g.circle(tx, ty, 12 * (1 - flashT)).fill({ color: 0xffeedd, alpha: (1 - flashT) * 0.7 });
      }

      // Flying debris — rocks and dirt chunks with gravity arc
      for (const p of particles) {
        const angle = p.x * Math.PI * 2;
        const power = 0.3 + p.y * 0.7;
        const dist = impT * TILE_SIZE * 0.85 * power;
        // Parabolic arc: up fast, then gravity pulls down
        const arcHeight = impT * 30 * power - impT * impT * 45 * power;
        const debX = tx + Math.cos(angle) * dist;
        const debY = ty + Math.sin(angle) * dist - arcHeight;
        const debSize = (1 - impT) * (2 + p.y * 2);
        const debAlpha = (1 - impT) * 0.92;
        // Rock chunk (slightly angular — draw as small diamond)
        if (p.y > 0.4) {
          g.moveTo(debX, debY - debSize)
            .lineTo(debX + debSize, debY)
            .lineTo(debX, debY + debSize * 0.7)
            .lineTo(debX - debSize, debY)
            .fill({ color: 0x666655, alpha: debAlpha });
        } else {
          // Dirt particle
          g.circle(debX, debY, debSize)
            .fill({ color: 0x8b6914, alpha: debAlpha });
        }
        // Dust trail behind debris
        if (impT > 0.1 && impT < 0.7) {
          g.circle(debX - Math.cos(angle) * 4, debY + 2, debSize * 0.6)
            .fill({ color: 0xaa9966, alpha: debAlpha * 0.3 });
        }
      }
    }
  },
};
