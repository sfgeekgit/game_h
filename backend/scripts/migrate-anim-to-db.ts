/**
 * One-time migration: reads animation function code from the TypeScript source files
 * and stores it in the anim JSON column of wep_types and spell_types.
 */
import { query } from '../src/db/query.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');

function extractAnimFunctions(filePath: string): Record<string, string> {
  const src = readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};

  const lines = src.split('\n');
  let currentKey: string | null = null;
  let braceDepth = 0;
  let fnLines: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (!capturing) {
      // Look for pattern like:   animName: (g, ...
      const match = line.match(/^\s+(\w+):\s*\(g,/);
      if (match) {
        currentKey = match[1];
        fnLines = [];
        capturing = true;
        braceDepth = 0;
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        fnLines.push(line.trimStart());
      }
    } else {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      fnLines.push(line.trimStart());
      if (braceDepth <= 0) {
        let code = fnLines.join('\n');
        // Remove trailing comma
        code = code.replace(/,\s*$/, '');
        result[currentKey!] = code;
        capturing = false;
        currentKey = null;
      }
    }
  }

  return result;
}

async function main() {
  const spellAnims = extractAnimFunctions(resolve(ROOT, 'frontend/src/spellAnimations.ts'));
  const weaponAnims = extractAnimFunctions(resolve(ROOT, 'frontend/src/weaponAnimations.ts'));

  console.log('Spell anims found:', Object.keys(spellAnims));
  console.log('Weapon anims found:', Object.keys(weaponAnims));

  const allAnims: Record<string, string> = { ...spellAnims, ...weaponAnims };

  // Update wep_types
  const weapons = await query<Array<{ id: number; key: string; anim: string }>>('SELECT id, `key`, anim FROM wep_types');
  for (const w of weapons) {
    const animObj = JSON.parse(w.anim || '{}');
    const code = allAnims[animObj.type];
    if (code) {
      animObj.code = code;
      await query('UPDATE wep_types SET anim = ? WHERE id = ?', [JSON.stringify(animObj), w.id]);
      console.log(`  Updated weapon ${w.key} (${code.length} chars)`);
    } else {
      console.log(`  WARNING: No anim code for weapon ${w.key} (type: ${animObj.type})`);
    }
  }

  // Update spell_types
  const spells = await query<Array<{ id: number; key: string; anim: string }>>('SELECT id, `key`, anim FROM spell_types');
  for (const s of spells) {
    const animObj = JSON.parse(s.anim || '{}');
    const code = allAnims[animObj.type];
    if (code) {
      animObj.code = code;
      await query('UPDATE spell_types SET anim = ? WHERE id = ?', [JSON.stringify(animObj), s.id]);
      console.log(`  Updated spell ${s.key} (${code.length} chars)`);
    } else {
      console.log(`  WARNING: No anim code for spell ${s.key} (type: ${animObj.type})`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
