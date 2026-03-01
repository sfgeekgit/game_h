import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DialogueWindow } from '../components/DialogueWindow.js';
import type { NpcDialogueData, DialogueFallbacks } from '@game_h/shared';

const mockNpcData: NpcDialogueData = {
  npc_id: 'blacksmith',
  name: 'Gareth',
  dialogue: {
    look: 'A broad-shouldered man hammering at an anvil.',
    name: 'Gareth. The only smith worth his salt in this town.',
    hi: 'Need something forged? I am your man.',
    sword: 'A fine blade takes time and good steel.',
    bye: 'Safe travels.',
  },
};

const mockFallbacks: DialogueFallbacks = {
  generic_fallbacks: ["I don't know about that."],
};

// jsdom doesn't implement scrollTo — stub it so the auto-scroll effect doesn't throw
Element.prototype.scrollTo = () => {};

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../api.js', () => ({
  api: {
    get: mockGet,
    post: vi.fn().mockResolvedValue({}),
  },
}));

describe('DialogueWindow', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ npcData: mockNpcData, fallbacks: mockFallbacks });
  });

  // NOTE: This test asserts the current architecture: dialogue data is fetched
  // once when the window opens, and all subsequent keyword resolution happens
  // client-side with zero additional network requests.
  //
  // This design may change in the future. For example, if an LLM is added to
  // the backend to generate dynamic NPC responses, each keyword submission
  // would become a server round trip. If that happens, this test should be
  // removed or rewritten to match the new architecture rather than forcing
  // the old pattern to remain.
  it('fetches dialogue exactly once on open, then resolves keywords locally', async () => {
    const onClose = vi.fn();
    render(<DialogueWindow npcId="blacksmith" npcName="Gareth the Blacksmith" onClose={onClose} />);

    // Wait for initial load — the NPC "look" description appears automatically
    await waitFor(() => {
      expect(screen.getByText('A broad-shouldered man hammering at an anvil.')).toBeInTheDocument();
    });

    // API should have been called exactly once at this point
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/area/npc/blacksmith/dialogue');

    // Type a keyword and submit
    const input = screen.getByPlaceholderText('Type a keyword...');
    fireEvent.change(input, { target: { value: 'sword' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // NPC response appears
    await waitFor(() => {
      expect(screen.getByText('A fine blade takes time and good steel.')).toBeInTheDocument();
    });

    // Still only one API call — keyword was resolved locally, no round trip
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Type a second keyword to confirm it's not a fluke
    fireEvent.change(input, { target: { value: 'name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(
        screen.getByText('Gareth. The only smith worth his salt in this town.'),
      ).toBeInTheDocument();
    });

    // Still exactly one fetch total across the entire conversation
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
