import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { calculateLevel } from '@game_h/shared';

interface PlayerData {
  userId: string;
  displayName: string | null;
  points: number;
  level: number;
}

export function PlayerStatus() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PlayerData>('/player')
      .then(setPlayer)
      .catch((err) => setError(err.message));
  }, []);

  const handleEarnPoints = async () => {
    try {
      const result = await api.post<{ points: number; level: number }>('/player/points', {
        amount: 10,
      });
      setPlayer((prev) => (prev ? { ...prev, points: result.points, level: result.level } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (error) return <div className="error">Error: {error}</div>;
  if (!player) return <div className="loading">Loading player...</div>;

  const clientLevel = calculateLevel(player.points);

  return (
    <div className="player-status">
      <h2>Player Status</h2>
      <p>ID: {player.userId.slice(0, 8)}...</p>
      <p>Points: {player.points}</p>
      <p>
        Level: {player.level} (client calc: {clientLevel})
      </p>
      <button onClick={handleEarnPoints}>Earn 10 Points</button>
    </div>
  );
}
