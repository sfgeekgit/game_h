import { describe, it, expect } from 'vitest';
import { resolveKeyword } from '../dialogue.js';
import type { NpcDialogueData, DialogueFallbacks } from '../dialogue.js';

const testNpc: NpcDialogueData = {
  npc_id: 'test_npc',
  name: 'Test NPC',
  dialogue: {
    name: 'My name is Test.',
    hi: 'I am a test NPC.',
    look: 'A placeholder character.',
    sword: 'A fine blade indeed.',
  },
};

const npcWithFallbacks: NpcDialogueData = {
  ...testNpc,
  fallbacks: ['Custom fallback 1.', 'Custom fallback 2.'],
};

const genericFallbacks: DialogueFallbacks = {
  generic_fallbacks: ['Generic response 1.', 'Generic response 2.'],
};

describe('resolveKeyword', () => {
  it('returns matching dialogue for exact keyword', () => {
    expect(resolveKeyword('name', testNpc)).toBe('My name is Test.');
  });

  it('is case-insensitive', () => {
    expect(resolveKeyword('NAME', testNpc)).toBe('My name is Test.');
    expect(resolveKeyword('Sword', testNpc)).toBe('A fine blade indeed.');
  });

  it('trims whitespace', () => {
    expect(resolveKeyword('  hi  ', testNpc)).toBe('I am a test NPC.');
  });

  it('resolves "hello" as an alias for "hi"', () => {
    expect(resolveKeyword('hello', testNpc)).toBe('I am a test NPC.');
  });

  it('resolves "HELLO" (case-insensitive alias) for "hi"', () => {
    expect(resolveKeyword('HELLO', testNpc)).toBe('I am a test NPC.');
  });

  it('returns NPC-specific fallback for unknown keyword', () => {
    const result = resolveKeyword('banana', npcWithFallbacks);
    expect(['Custom fallback 1.', 'Custom fallback 2.']).toContain(result);
  });

  it('returns generic fallback when NPC has no custom fallbacks', () => {
    const result = resolveKeyword('banana', testNpc, genericFallbacks);
    expect(['Generic response 1.', 'Generic response 2.']).toContain(result);
  });

  it('prefers NPC fallbacks over generic fallbacks', () => {
    const result = resolveKeyword('banana', npcWithFallbacks, genericFallbacks);
    expect(['Custom fallback 1.', 'Custom fallback 2.']).toContain(result);
  });

  it('returns hardcoded default when no fallbacks available', () => {
    const result = resolveKeyword('banana', testNpc);
    expect(result).toBe('I have nothing to say about that.');
  });

  it('returns fallback for empty input', () => {
    const result = resolveKeyword('', testNpc);
    expect(result).toBe('I have nothing to say about that.');
  });

  it('returns fallback for whitespace-only input', () => {
    const result = resolveKeyword('   ', testNpc);
    expect(result).toBe('I have nothing to say about that.');
  });

  it('matches a keyword found anywhere in a sentence', () => {
    expect(resolveKeyword('tell me about the sword', testNpc)).toBe('A fine blade indeed.');
  });

  it('matches a misspelled keyword when first 4 chars are correct', () => {
    expect(resolveKeyword('sworad', testNpc)).toBe('A fine blade indeed.');
  });

  it('matches a misspelled keyword inside a sentence', () => {
    expect(resolveKeyword('what about the sworad', testNpc)).toBe('A fine blade indeed.');
  });

  it('does not fuzzy-match words shorter than 4 characters', () => {
    expect(resolveKeyword('nam', testNpc)).toBe('I have nothing to say about that.');
  });
});
