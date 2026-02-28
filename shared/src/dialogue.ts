/**
 * Dialogue keyword matching logic.
 * Shared between frontend and backend so keyword resolution
 * can happen client-side after the YAML data is loaded.
 */

export interface NpcDialogueData {
  npc_id: string;
  name: string;
  dialogue: Record<string, string>;
  fallbacks?: string[];
}

export interface DialogueFallbacks {
  generic_fallbacks: string[];
}

const DEFAULT_FALLBACK = 'I have nothing to say about that.';

/**
 * Look up a keyword in the NPC's dialogue data.
 * Returns the response text, or a random fallback if the keyword is unknown.
 */
/** Keywords that are treated as aliases for another keyword. */
const KEYWORD_ALIASES: Record<string, string> = {
  hello: 'hi',
};

/** Match a single word against dialogue keys. Exact first, then 4-char prefix (shortest key wins). */
function matchWord(word: string, keys: string[]): string | null {
  if (keys.includes(word)) return word;
  if (word.length >= 4) {
    const hits = keys.filter(k => k.startsWith(word.slice(0, 4)));
    if (hits.length) return hits.sort((a, b) => a.length - b.length)[0];
  }
  return null;
}

export function resolveKeyword(
  input: string,
  npcData: NpcDialogueData,
  genericFallbacks?: DialogueFallbacks,
): string {
  const keys = Object.keys(npcData.dialogue);
  const words = input.toLowerCase().trim().split(/\W+/).filter(Boolean);
  if (!words.length) return DEFAULT_FALLBACK;

  for (const word of words) {
    const matched = matchWord(KEYWORD_ALIASES[word] ?? word, keys);
    if (matched) return npcData.dialogue[matched];
  }

  // Use NPC-specific fallbacks first, then generic, then hardcoded default
  const fallbacks =
    npcData.fallbacks ?? genericFallbacks?.generic_fallbacks ?? [DEFAULT_FALLBACK];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
