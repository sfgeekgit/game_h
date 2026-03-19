// Combat catalog — loads weapons and spells from the DB, caches in memory, serves to frontend.
// Called once at server startup via loadCombatCatalog(). Frontend fetches via GET /combat/catalog.
//
// ── Adding a new spell ──
//   1. INSERT a row into `spell_types` with a unique 9-digit `id`, a `key` (string slug), and stats.
//      Columns: id, key, name, damage, mana_cost, cast_time, reach, aoe_radius, aoe_shape, target_type,
//               anim (animation name), anim_ms (duration), anim_particles (particle count).
//   2. Set `anim` to the name of an animation function defined in frontend/src/spellAnimations.ts.
//      The animation name does NOT need to match the spell key — multiple spells can share one animation.
//      If you need a new visual effect, add the function to spellAnimations.ts and reference it here.
//   3. Assign the spell key to units in shared/src/combat/combatData.ts by adding
//      the key string to a unit's `spells` array.
//   4. Restart the backend — the catalog is cached in memory at startup and NEVER re-read
//      from the DB while running. Changing a row in the DB has NO effect until the server restarts.
//      In dev, saving a .ts file triggers tsx watch restart which reloads the catalog.
//      A DB-only change (no code file touched) requires a manual restart.
//
// ── Adding a new weapon ──
//   Same pattern using the `wep_types` table.
//   Columns: id, key, name, damage, cast_time, reach, anim, anim_ms, anim_particles.
//   Animation functions live in frontend/src/weaponAnimations.ts.
//   Assign via the `weapon` field in shared/src/combat/combatData.ts (e.g. weapons.my_sword).
//
// ── Key files ──
//   DB tables:          wep_types, spell_types
//   This file:          backend/src/combat/catalog.ts — loads from DB, caches, exposes getWeapons()/getSpells()
//   API endpoint:       backend/src/api/combat.ts — GET /combat/catalog returns { weapons, spells }
//   Spell animations:   frontend/src/spellAnimations.ts — animation functions for spells
//   Weapon animations:  frontend/src/weaponAnimations.ts — animation functions for weapons
//   Unit setup:         shared/src/combat/combatData.ts — assigns weapons/spells to units by key
//   Combat engine:      shared/src/combat/combatEngine.ts — uses spellCatalog from CombatState
//   Frontend render:    frontend/src/components/CombatViewPixi.tsx — renders animations

import { query } from '../db/query.js';
import type { WeaponDef, SpellDef } from '@game_h/shared';

interface WepRow {
  id: number;
  key: string;
  name: string;
  damage: number;
  cast_time: number;
  reach: number;
  anim: string;
  anim_ms: number;
  anim_particles: number;
}

interface SpellRow {
  id: number;
  key: string;
  name: string;
  damage: number;
  mana_cost: number;
  cast_time: number;
  reach: number;
  aoe_radius: number;
  aoe_shape: string | null;
  target_type: string;
  anim: string;
  anim_ms: number;
  anim_particles: number;
}

let weaponCache: Record<string, WeaponDef> | null = null;
let spellCache: Record<string, SpellDef> | null = null;

export async function loadWeapons(): Promise<Record<string, WeaponDef>> {
  const rows = await query<WepRow[]>('SELECT id, `key`, name, damage, cast_time, reach, anim, anim_ms, anim_particles FROM wep_types');
  const map: Record<string, WeaponDef> = {};
  for (const r of rows) {
    map[r.key] = {
      id: r.key,
      name: r.name,
      damage: r.damage,
      castTime: Number(r.cast_time),
      reach: r.reach,
      anim: { type: r.anim, ms: r.anim_ms, particles: r.anim_particles },
    };
  }
  weaponCache = map;
  return map;
}

export async function loadSpells(): Promise<Record<string, SpellDef>> {
  const rows = await query<SpellRow[]>(
    'SELECT id, `key`, name, damage, mana_cost, cast_time, reach, aoe_radius, aoe_shape, target_type, anim, anim_ms, anim_particles FROM spell_types',
  );
  const map: Record<string, SpellDef> = {};
  for (const r of rows) {
    map[r.key] = {
      id: r.key,
      name: r.name,
      damage: r.damage,
      manaCost: r.mana_cost,
      castTime: Number(r.cast_time),
      reach: r.reach,
      aoeRadius: r.aoe_radius,
      targetType: (r.target_type as 'tile' | 'unit') || 'tile',
      anim: { type: r.anim, ms: r.anim_ms, particles: r.anim_particles },
    };
  }
  spellCache = map;
  return map;
}

export function getWeapons(): Record<string, WeaponDef> {
  if (!weaponCache) throw new Error('Weapons not loaded — call loadWeapons() at startup');
  return weaponCache;
}

export function getSpells(): Record<string, SpellDef> {
  if (!spellCache) throw new Error('Spells not loaded — call loadSpells() at startup');
  return spellCache;
}

/** Call once at server startup */
export async function loadCombatCatalog(): Promise<void> {
  await Promise.all([loadWeapons(), loadSpells()]);
  console.log(`Combat catalog loaded: ${Object.keys(weaponCache!).length} weapons, ${Object.keys(spellCache!).length} spells`);
}
