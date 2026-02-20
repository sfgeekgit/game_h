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
export function resolveKeyword(
  keyword: string,
  npcData: NpcDialogueData,
  genericFallbacks?: DialogueFallbacks,
): string {
  const normalised = keyword.trim().toLowerCase();
  if (!normalised) return DEFAULT_FALLBACK;

  const response = npcData.dialogue[normalised];
  if (response) return response;

  // Use NPC-specific fallbacks first, then generic, then hardcoded default
  const fallbacks =
    npcData.fallbacks ?? genericFallbacks?.generic_fallbacks ?? [DEFAULT_FALLBACK];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
