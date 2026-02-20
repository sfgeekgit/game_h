import { useState, useEffect, useRef } from 'react';
import { resolveKeyword } from '@game_h/shared';
import type { NpcDialogueData, DialogueFallbacks } from '@game_h/shared';
import { api } from '../api.js';

interface DialogueWindowProps {
  npcId: string;
  npcName: string;
  onClose: () => void;
}

interface DialogueEntry {
  speaker: 'player' | 'npc';
  text: string;
}

export function DialogueWindow({ npcId, npcName, onClose }: DialogueWindowProps) {
  const [npcData, setNpcData] = useState<NpcDialogueData | null>(null);
  const [fallbacks, setFallbacks] = useState<DialogueFallbacks | undefined>();
  const [entries, setEntries] = useState<DialogueEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Load dialogue data on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get<{ npcData: NpcDialogueData; fallbacks: DialogueFallbacks }>(
          `/area/npc/${npcId}/dialogue`,
        );
        if (cancelled) return;
        setNpcData(res.npcData);
        setFallbacks(res.fallbacks);
        // Show initial greeting — the NPC's "look" description
        const look = res.npcData.dialogue.look;
        if (look) {
          setEntries([{ speaker: 'npc', text: look }]);
        }
      } catch {
        if (!cancelled) setError('Failed to load dialogue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [npcId]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [entries]);

  // Focus input when loaded
  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  const handleSubmit = () => {
    const keyword = input.trim();
    if (!keyword || !npcData) return;
    setInput('');

    // Check for bye
    if (keyword.toLowerCase() === 'bye') {
      const bye = npcData.dialogue.bye;
      if (bye) {
        setEntries((prev) => [
          ...prev,
          { speaker: 'player', text: keyword },
          { speaker: 'npc', text: bye },
        ]);
        // Close after a short delay so player can read the farewell
        setTimeout(onClose, 1200);
      } else {
        onClose();
      }
      return;
    }

    const response = resolveKeyword(keyword, npcData, fallbacks);
    setEntries((prev) => [
      ...prev,
      { speaker: 'player', text: keyword },
      { speaker: 'npc', text: response },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Stop game controls from firing while typing
    e.stopPropagation();
  };

  return (
    <div
      className="dialogue-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="dialogue-window"
        style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #c8a96e',
          borderRadius: 8,
          width: '90%',
          maxWidth: 420,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          color: '#e0d6c2',
          fontFamily: 'monospace',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #c8a96e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#c8a96e' }}>
            {npcName}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #c8a96e',
              color: '#c8a96e',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.9em',
            }}
          >
            Close
          </button>
        </div>

        {/* Dialogue log */}
        <div
          ref={logRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            minHeight: 120,
            maxHeight: '50vh',
          }}
        >
          {loading && <div style={{ color: '#888' }}>Loading...</div>}
          {error && <div style={{ color: '#e63946' }}>{error}</div>}
          {entries.map((entry, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              {entry.speaker === 'player' ? (
                <span style={{ color: '#88c0d0' }}>&gt; {entry.text}</span>
              ) : (
                <span style={{ color: '#e0d6c2' }}>{entry.text}</span>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        {!loading && !error && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid #c8a96e',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a keyword..."
              style={{
                flex: 1,
                backgroundColor: '#0f0f23',
                border: '1px solid #c8a96e',
                color: '#e0d6c2',
                padding: '6px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: '1em',
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                backgroundColor: '#c8a96e',
                color: '#1a1a2e',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            >
              Ask
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
