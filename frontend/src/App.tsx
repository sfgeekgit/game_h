import { useState, useEffect } from 'react';
import { GameView } from './components/GameView.js';
import { CombatView } from './components/CombatView.js';
import { api } from './api.js';

interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  isRegistered?: boolean;
}

type Screen = 'welcome' | 'frontend-game' | 'backend-game' | 'combat';

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

  if (screen === 'combat') {
    return <CombatView onExit={() => setScreen('welcome')} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Say "Hello"</h1>
	<h3> </h3>
	<p>Walk around. The gold squares are doors.</p>
	<p>Say "hi" and "bye" and "job" and "look" or ask follow up questions.</p>


	<br />
        {auth?.authenticated && (
          <p className="auth-status">
            Welcome {auth.isRegistered ? 'Registered player' : 'Anonymous player'}
	    <br />
	    No login needed! Will have auth someday, but for now your cookie is set.
          </p>
        )}
      </header>

      <main className="welcome-screen">
        <p className="welcome-intro">
        </p>

        <div className="play-buttons">
          <button className="play-btn play-btn-frontend" onClick={() => setScreen('frontend-game')}>
            <span className="play-btn-title">Enter Town</span>
          </button>
          <a className="multiplayer-link" onClick={() => setScreen('backend-game')}>
            Multiplayer Mode — Backend Town
          </a>
          <button className="play-btn play-btn-frontend" onClick={() => setScreen('combat')} style={{ marginTop: '12px', backgroundColor: '#6b21a8' }}>
            <span className="play-btn-title">Combat Prototype</span>
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
