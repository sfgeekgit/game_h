/**
 * Structural validation for all NPC dialogue YAML files.
 *
 * These tests enforce the NPC dialogue spec:
 *   - Every NPC must have a "hi" keyword (players greet with "hi" or "hello")
 *   - Every NPC must have a "name" keyword
 *   - Every NPC must have the required top-level fields (npc_id, name, dialogue)
 *
 * Tests auto-discover all *.yaml files under text_content/npcs/ so they
 * run automatically when new NPCs are added — no manual registration needed.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NPC_DIR = join(__dirname, '../../../text_content/npcs');

interface NpcYaml {
  npc_id?: unknown;
  name?: unknown;
  dialogue?: Record<string, unknown>;
  fallbacks?: unknown;
}

// Load all NPC files once at module level so describe.each can use them
const npcFiles = await readdir(NPC_DIR).then((files) => files.filter((f) => f.endsWith('.yaml')));

const npcEntries = await Promise.all(
  npcFiles.map(async (filename) => {
    const content = await readFile(join(NPC_DIR, filename), 'utf-8');
    const data = yaml.load(content) as NpcYaml;
    return { filename, data };
  }),
);

describe.each(npcEntries)('NPC file "$filename"', ({ filename, data }) => {
  it('has required top-level fields: npc_id, name, dialogue', () => {
    expect(data, `${filename} failed to parse`).toBeTruthy();
    expect(typeof data.npc_id, `${filename} missing npc_id`).toBe('string');
    expect(typeof data.name, `${filename} missing name`).toBe('string');
    expect(typeof data.dialogue, `${filename} missing dialogue`).toBe('object');
    expect(data.dialogue, `${filename} dialogue must not be null`).not.toBeNull();
  });

  it('has required "name" keyword in dialogue (player can ask for NPC\'s name)', () => {
    expect(
      data.dialogue?.['name'],
      `${filename}: dialogue must include a "name" keyword`,
    ).toBeTruthy();
  });

  it('has required "hi" keyword in dialogue (player greets with "hi" or "hello")', () => {
    expect(
      data.dialogue?.['hi'],
      `${filename}: dialogue must include a "hi" keyword — remove "who" if present`,
    ).toBeTruthy();
  });

  it('has required "look" keyword in dialogue (player can examine the NPC)', () => {
    expect(
      data.dialogue?.['look'],
      `${filename}: dialogue must include a "look" keyword describing the NPC's appearance`,
    ).toBeTruthy();
  });

  it('"hi", "name", and "look" keyword responses are non-empty strings', () => {
    expect(typeof data.dialogue?.['hi']).toBe('string');
    expect((data.dialogue?.['hi'] as string).trim().length).toBeGreaterThan(0);
    expect(typeof data.dialogue?.['name']).toBe('string');
    expect((data.dialogue?.['name'] as string).trim().length).toBeGreaterThan(0);
    expect(typeof data.dialogue?.['look']).toBe('string');
    expect((data.dialogue?.['look'] as string).trim().length).toBeGreaterThan(0);
  });

  it('fallbacks, if present, is a non-empty array of strings', () => {
    if (data.fallbacks === undefined) return; // optional field
    expect(Array.isArray(data.fallbacks), `${filename} fallbacks must be an array`).toBe(true);
    const fb = data.fallbacks as unknown[];
    expect(fb.length, `${filename} fallbacks array must not be empty`).toBeGreaterThan(0);
    for (const item of fb) {
      expect(typeof item, `${filename} each fallback must be a string`).toBe('string');
    }
  });
});
