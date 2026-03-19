// Weapon animation functions, keyed by animation name.
// The DB wep_types.anim column stores the name (e.g. "short_sword").
// Multiple weapons can reference the same animation.
//
// To add a new animation:
//   1. Write the function below — signature: (g, fx, t) => void
//      g = PixiJS Graphics, fx = SpellEffectState (positions, particles, tileSize), t = 0→1 progress
//   2. Add an entry to WEAPON_ANIM_REGISTRY mapping the name to the function
//   3. Set the wep_types.anim column to that name

import type { AnimFn } from './animTypes.js';
import { easeOut, easeIn, normalize } from './animTypes.js';

// --- Animation functions ---

// Wide sweeping arc with motion blur, steel glint, and hot sparks
const swordSlash: AnimFn = (g, { targetPx: tx, targetPy: ty, particles, tileSize }, t) => {
  const r = tileSize * 0.72;
  const startAngle = -Math.PI * 0.55;
  const endAngle = Math.PI * 0.55;
  const sweepT = easeOut(Math.min(t / 0.5, 1));
  const sweepAngle = startAngle + (endAngle - startAngle) * sweepT;

  const shakeX = t > 0.15 && t < 0.4 ? Math.sin(t * 120) * 1.5 * (0.4 - t) : 0;
  const shakeY = t > 0.15 && t < 0.4 ? Math.cos(t * 90) * 1.2 * (0.4 - t) : 0;
  const sx = tx + shakeX;
  const sy = ty + shakeY;

  if (t < 0.65) {
    const bladeAlpha = t < 0.4 ? 0.95 : (0.65 - t) / 0.25 * 0.95;
    for (let i = 0; i < 12; i++) {
      const frac = i / 12;
      const a = startAngle + (sweepAngle - startAngle) * frac;
      const fadeByTrail = 0.3 + 0.7 * frac;
      g.circle(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 4)
        .fill({ color: 0xffeedd, alpha: bladeAlpha * fadeByTrail * 0.5 });
    }
    g.moveTo(sx, sy)
      .lineTo(sx + Math.cos(sweepAngle) * r, sy + Math.sin(sweepAngle) * r)
      .stroke({ color: 0xffffff, width: 3.5, alpha: bladeAlpha });
    g.moveTo(sx, sy)
      .lineTo(sx + Math.cos(sweepAngle) * r * 0.92, sy + Math.sin(sweepAngle) * r * 0.92)
      .stroke({ color: 0xffffcc, width: 1.5, alpha: bladeAlpha });
    const glint = Math.sin(t * 25) * 0.5 + 0.5;
    g.circle(sx + Math.cos(sweepAngle) * r, sy + Math.sin(sweepAngle) * r, 5 * glint)
      .fill({ color: 0xffffff, alpha: bladeAlpha * glint * 0.8 });
  }

  if (t >= 0.2 && t < 0.6) {
    const impT = (t - 0.2) / 0.4;
    g.circle(sx, sy, easeOut(impT) * 22)
      .stroke({ color: 0xffffff, width: 3, alpha: (1 - impT) * 0.9 });
    g.circle(sx, sy, easeOut(impT) * 12)
      .fill({ color: 0xffeecc, alpha: (1 - impT) * 0.4 });
  }

  for (const p of particles) {
    const sparkStart = 0.15 + p.y * 0.1;
    if (t < sparkStart) continue;
    const sparkT = easeOut((t - sparkStart) / (1 - sparkStart));
    const angle = p.x * Math.PI * 2;
    const dist = sparkT * tileSize * 0.8 * (0.4 + p.y * 0.6);
    const sparkAlpha = (1 - sparkT) * 0.95;
    const sparkR = (1 - sparkT) * 3;
    g.circle(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, sparkR)
      .fill({ color: 0xffdd44, alpha: sparkAlpha });
    g.circle(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, sparkR * 2)
      .fill({ color: 0xff8800, alpha: sparkAlpha * 0.3 });
  }
};

// Lightning-fast thrust with gleaming blade, blood-red starburst, and speed lines
const daggerStab: AnimFn = (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty, particles, tileSize }, t) => {
  const { dx, dy, nx, ny } = normalize(cx, cy, tx, ty);
  const px = -ny;
  const py = nx;

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

  if (t < 0.3) {
    const thrustT = easeIn(t / 0.3);
    const tipX = tx - nx * tileSize * 0.5 * (1 - thrustT);
    const tipY = ty - ny * tileSize * 0.5 * (1 - thrustT);
    g.moveTo(tipX - nx * 16, tipY - ny * 16)
      .lineTo(tipX, tipY)
      .stroke({ color: 0xdddddd, width: 2.5, alpha: 0.95 });
    g.circle(tipX, tipY, 4).fill({ color: 0xffffff, alpha: 0.95 });
    g.circle(tipX, tipY, 7).fill({ color: 0xffffff, alpha: 0.3 });
  }

  if (t >= 0.2) {
    const burstT = easeOut((t - 0.2) / 0.8);
    if (t < 0.5) {
      const flashT = (t - 0.2) / 0.3;
      g.circle(tx, ty, (1 - flashT) * 8).fill({ color: 0xffffff, alpha: (1 - flashT) * 0.9 });
    }
    for (const p of particles) {
      const angle = p.x * Math.PI * 2;
      const dist = burstT * tileSize * 0.55 * (0.5 + p.y * 0.5);
      const rayAlpha = (1 - burstT) * 0.9;
      g.moveTo(tx + Math.cos(angle) * dist * 0.3, ty + Math.sin(angle) * dist * 0.3)
        .lineTo(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist)
        .stroke({ color: 0xcc2222, width: 2 * (1 - burstT), alpha: rayAlpha });
      g.circle(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist, 2 * (1 - burstT))
        .fill({ color: 0xff4444, alpha: rayAlpha });
    }
    g.circle(tx, ty, burstT * 16)
      .stroke({ color: 0xff3333, width: 1.5, alpha: (1 - burstT) * 0.6 });
  }
};

// Mystical wooden staff: downward slam with golden energy shockwave and runic sparks
const staffStrike: AnimFn = (g, { targetPx: tx, targetPy: ty, particles, tileSize }, t) => {
  if (t < 0.35) {
    const slamT = easeIn(t / 0.35);
    const topY = ty - tileSize * 0.8 * (1 - slamT);
    g.moveTo(tx - 2, topY).lineTo(tx + 2, topY).lineTo(tx + 1, ty).lineTo(tx - 1, ty)
      .fill({ color: 0x6b4226, alpha: 0.95 });
    g.circle(tx, topY, 6).fill({ color: 0xffcc00, alpha: 0.4 * slamT });
    g.circle(tx, topY, 3).fill({ color: 0xffffff, alpha: 0.7 * slamT });
  }

  if (t >= 0.25) {
    const ringT = easeOut((t - 0.25) / 0.75);
    g.circle(tx, ty, ringT * tileSize * 0.85)
      .stroke({ color: 0xddaa22, width: 3, alpha: (1 - ringT) * 0.9 });
    if (t >= 0.35) {
      const ring2T = easeOut((t - 0.35) / 0.65);
      g.circle(tx, ty, ring2T * tileSize * 0.55)
        .stroke({ color: 0xffdd44, width: 2, alpha: (1 - ring2T) * 0.7 });
    }
    g.circle(tx, ty, ringT * tileSize * 0.5)
      .fill({ color: 0xffee88, alpha: (1 - ringT) * 0.2 });
  }

  if (t >= 0.25 && t < 0.55) {
    const flashT = (t - 0.25) / 0.3;
    g.circle(tx, ty, 10 * (1 - flashT)).fill({ color: 0xffffff, alpha: (1 - flashT) * 0.8 });
  }

  for (const p of particles) {
    const sparkStart = 0.3 + p.y * 0.1;
    if (t < sparkStart) continue;
    const sparkT = (t - sparkStart) / (1 - sparkStart);
    const baseAngle = p.x * Math.PI * 2;
    const spiral = baseAngle + sparkT * Math.PI * 1.5;
    const dist = easeOut(sparkT) * tileSize * 0.6 * (0.3 + p.y * 0.7);
    const rise = sparkT * 25 * p.y;
    const sparkAlpha = (1 - sparkT) * 0.9;
    g.circle(tx + Math.cos(spiral) * dist, ty + Math.sin(spiral) * dist - rise, 2.5 * (1 - sparkT))
      .fill({ color: 0xffcc22, alpha: sparkAlpha });
    g.circle(tx + Math.cos(spiral) * dist, ty + Math.sin(spiral) * dist - rise, 4.5 * (1 - sparkT))
      .fill({ color: 0xddaa00, alpha: sparkAlpha * 0.25 });
  }
};

// Arrow with fletching trail, motion streak, and satisfying thunk impact
const arrowShot: AnimFn = (g, { casterPx: cx, casterPy: cy, targetPx: tx, targetPy: ty, particles, tileSize }, t) => {
  const { dx, dy, len, nx, ny } = normalize(cx, cy, tx, ty);
  const perpX = -ny;
  const perpY = nx;

  const travelFrac = 0.55;
  const travelT = easeOut(Math.min(t / travelFrac, 1));
  const headX = cx + dx * travelT;
  const headY = cy + dy * travelT;

  if (t < 0.7) {
    const arrowAlpha = t < 0.55 ? 0.95 : (0.7 - t) / 0.15 * 0.95;

    if (t < 0.55) {
      const streakLen = Math.min(travelT, 0.3) * len;
      g.moveTo(headX, headY)
        .lineTo(headX - nx * streakLen, headY - ny * streakLen)
        .stroke({ color: 0xddddaa, width: 1, alpha: arrowAlpha * 0.3 });
    }

    for (let i = 1; i <= 4; i++) {
      const trailT = Math.max(0, travelT - i * 0.08);
      const trailX = cx + dx * trailT;
      const trailY = cy + dy * trailT;
      const featherAlpha = arrowAlpha * (0.5 - i * 0.1);
      if (featherAlpha <= 0) continue;
      g.moveTo(trailX + perpX * 3, trailY + perpY * 3)
        .lineTo(trailX - nx * 4, trailY - ny * 4)
        .lineTo(trailX - perpX * 3, trailY - perpY * 3)
        .stroke({ color: 0xaa8855, width: 1, alpha: featherAlpha });
    }

    g.moveTo(headX, headY)
      .lineTo(headX - nx * 14, headY - ny * 14)
      .stroke({ color: 0x8b6914, width: 2.5, alpha: arrowAlpha });

    g.moveTo(headX + nx * 5, headY + ny * 5)
      .lineTo(headX + perpX * 3, headY + perpY * 3)
      .lineTo(headX - perpX * 3, headY - perpY * 3)
      .fill({ color: 0xcccccc, alpha: arrowAlpha });

    const glint = Math.sin(t * 30) * 0.4 + 0.6;
    g.circle(headX + nx * 3, headY + ny * 3, 2)
      .fill({ color: 0xffffff, alpha: arrowAlpha * glint });
  }

  if (t >= 0.45) {
    const impT = easeOut((t - 0.45) / 0.55);

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

    g.circle(tx, ty, impT * 18)
      .stroke({ color: 0xccaa77, width: 2, alpha: (1 - impT) * 0.7 });

    for (const p of particles) {
      const angle = p.x * Math.PI * 2;
      const dist = impT * tileSize * 0.4 * (0.3 + p.y * 0.7);
      const rise = impT * 12 * p.y - impT * impT * 18 * p.y;
      g.circle(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist - rise,
        2 * (1 - impT))
        .fill({ color: p.y > 0.5 ? 0xaa8844 : 0x998866, alpha: (1 - impT) * 0.85 });
    }
  }
};

// Brutal overhead smash: heavy club descends, earth-shattering impact with dust and debris
const clubSmash: AnimFn = (g, { targetPx: tx, targetPy: ty, particles, tileSize }, t) => {
  if (t < 0.3) {
    const smashT = easeIn(t / 0.3);
    const topY = ty - tileSize * (1 - smashT);
    const shadowScale = 0.3 + smashT * 0.7;
    g.ellipse(tx, ty + 2, 8 * shadowScale, 4 * shadowScale)
      .fill({ color: 0x000000, alpha: 0.3 * smashT });
    const wobble = Math.sin(t * 40) * 2 * (1 - smashT);
    g.moveTo(tx - 7 + wobble, topY - 4)
      .lineTo(tx + 7 + wobble, topY - 4)
      .lineTo(tx + 6 + wobble, topY + 6)
      .lineTo(tx - 6 + wobble, topY + 6)
      .fill({ color: 0x5a3e1e, alpha: 0.95 });
    g.circle(tx - 3 + wobble, topY, 1.5).fill({ color: 0x888888, alpha: 0.8 });
    g.circle(tx + 3 + wobble, topY, 1.5).fill({ color: 0x888888, alpha: 0.8 });
  }

  if (t >= 0.22) {
    const impT = easeOut((t - 0.22) / 0.78);

    for (let i = 0; i < 6; i++) {
      const crackAngle = (i / 6) * Math.PI * 2 + 0.3;
      const crackLen = impT * tileSize * 0.7 * (0.5 + (i % 3) * 0.2);
      const crackAlpha = (1 - impT) * 0.7;
      g.moveTo(tx, ty)
        .lineTo(tx + Math.cos(crackAngle) * crackLen, ty + Math.sin(crackAngle) * crackLen)
        .stroke({ color: 0x3a2a10, width: 2 * (1 - impT), alpha: crackAlpha });
    }

    g.circle(tx, ty, impT * tileSize * 0.95)
      .stroke({ color: 0x8b6914, width: 4, alpha: (1 - impT) * 0.8 });
    if (t >= 0.3) {
      const ring2T = easeOut((t - 0.3) / 0.7);
      g.circle(tx, ty, ring2T * tileSize * 0.6)
        .stroke({ color: 0xaa8833, width: 2.5, alpha: (1 - ring2T) * 0.6 });
    }

    g.circle(tx, ty, impT * tileSize * 0.55)
      .fill({ color: 0x997744, alpha: (1 - impT) * 0.2 });

    if (t < 0.45) {
      const flashT = (t - 0.22) / 0.23;
      g.circle(tx, ty, 12 * (1 - flashT)).fill({ color: 0xffeedd, alpha: (1 - flashT) * 0.7 });
    }

    for (const p of particles) {
      const angle = p.x * Math.PI * 2;
      const power = 0.3 + p.y * 0.7;
      const dist = impT * tileSize * 0.85 * power;
      const arcHeight = impT * 30 * power - impT * impT * 45 * power;
      const debX = tx + Math.cos(angle) * dist;
      const debY = ty + Math.sin(angle) * dist - arcHeight;
      const debSize = (1 - impT) * (2 + p.y * 2);
      const debAlpha = (1 - impT) * 0.92;
      if (p.y > 0.4) {
        g.moveTo(debX, debY - debSize)
          .lineTo(debX + debSize, debY)
          .lineTo(debX, debY + debSize * 0.7)
          .lineTo(debX - debSize, debY)
          .fill({ color: 0x666655, alpha: debAlpha });
      } else {
        g.circle(debX, debY, debSize)
          .fill({ color: 0x8b6914, alpha: debAlpha });
      }
      if (impT > 0.1 && impT < 0.7) {
        g.circle(debX - Math.cos(angle) * 4, debY + 2, debSize * 0.6)
          .fill({ color: 0xaa9966, alpha: debAlpha * 0.3 });
      }
    }
  }
};

// --- Registry ---
// Key = animation name stored in DB wep_types.anim column
// Multiple weapons can point to the same animation (e.g. long_bow and skeleton_bow both use arrowShot)

export const WEAPON_ANIM_REGISTRY: Record<string, AnimFn> = {
  short_sword: swordSlash,
  long_sword: swordSlash,
  dagger: daggerStab,
  staff: staffStrike,
  long_bow: arrowShot,
  short_bow: arrowShot,
  skeleton_bow: arrowShot,
  goblin_club: clubSmash,
};
