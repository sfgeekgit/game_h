import { useState, useEffect } from 'react';
import { GameView } from './components/GameView.js';
import { api } from './api.js';

interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  isRegistered?: boolean;
}

type Screen = 'welcome' | 'frontend-game' | 'backend-game';

function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthStatus>('/auth/status')
      .then(setAuth)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  if (screen === 'frontend-game') {
    return <GameView mode="frontend" onExit={() => setScreen('welcome')} />;
  }

  if (screen === 'backend-game') {
    return <GameView mode="backend" onExit={() => setScreen('welcome')} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Town Square</h1>
        {auth?.authenticated && (
          <p className="auth-status">
            {auth.isRegistered ? 'Registered player' : 'Anonymous player'}
          </p>
        )}
      </header>

      <main className="welcome-screen">
        <p className="welcome-intro">
          A small town square waits to be explored. Find the glowing exit tile to complete your
          visit.
        </p>

        <div className="play-buttons">
          <button className="play-btn play-btn-frontend" onClick={() => setScreen('frontend-game')}>
            <span className="play-btn-title">Enter Town</span>
          </button>
        </div>

        <p className="controls-hint">
          WASD / arrow keys · tap adjacent tile · or use the d-pad on mobile
        </p>
      </main>
    </div>
  );
}

export default App;
