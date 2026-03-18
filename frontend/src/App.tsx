import { useState, useEffect, useRef } from 'react';
import { GameView } from './components/GameView.js';
import { CombatViewPixi } from './components/CombatViewPixi.js';
import { api } from './api.js';
import { combatApi } from './combatApi.js';
import type { CombatSessionResult } from './combatApi.js';

interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  isRegistered?: boolean;
}

type Screen = 'welcome' | 'frontend-game' | 'backend-game' | 'combat-pixi' | 'combat-server' | 'pvp-waiting';

function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [loading, setLoading] = useState(true);
  const [networkedCombat, setNetworkedCombat] = useState<CombatSessionResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api
      .get<AuthStatus>('/auth/status')
      .then(setAuth)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Cleanup PVP poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  if (screen === 'frontend-game') {
    return <GameView mode="frontend" onExit={() => setScreen('welcome')} />;
  }

  if (screen === 'backend-game') {
    return <GameView mode="backend" onExit={() => setScreen('welcome')} />;
  }

  if (screen === 'combat-pixi') {
    return <CombatViewPixi onExit={() => setScreen('welcome')} />;
  }

  if (screen === 'combat-server' && networkedCombat) {
    return (
      <CombatViewPixi
        mode="networked"
        sessionId={networkedCombat.sessionId}
        side={networkedCombat.side}
        initialState={networkedCombat.state}
        onExit={() => { combatApi.leave(networkedCombat.sessionId).catch(console.error); setNetworkedCombat(null); setScreen('welcome'); }}
      />
    );
  }

  if (screen === 'pvp-waiting' && networkedCombat) {
    return (
      <div style={{ backgroundColor: '#1a1a2e', color: '#eee', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Courier New', monospace" }}>
        <h2>Waiting for Player 2...</h2>
        <p style={{ color: '#888' }}>Session: {networkedCombat.sessionId}</p>
        <p style={{ color: '#aaa' }}>Open another browser (incognito) and click "PVP Combat Player 2"</p>
        <button onClick={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          combatApi.leave(networkedCombat.sessionId).catch(console.error);
          setNetworkedCombat(null);
          setScreen('welcome');
        }} style={{ marginTop: 16, padding: '8px 24px', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Cancel
        </button>
      </div>
    );
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
          <button className="play-btn play-btn-frontend" onClick={() => setScreen('combat-pixi')} style={{ marginTop: '12px', backgroundColor: '#6b21a8' }}>
            <span className="play-btn-title">Combat (Pixi)</span>
          </button>
          <button className="play-btn play-btn-frontend" onClick={() =>
            combatApi.create('pve').then(result => {
              setNetworkedCombat(result);
              setScreen('combat-server');
            }).catch(err => alert(`Failed to create combat session: ${err.message}`))
          } style={{ marginTop: '8px', backgroundColor: '#1e6b3a' }}>
            <span className="play-btn-title">Combat (Server)</span>
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="play-btn play-btn-frontend" onClick={() => {
              combatApi.create('pvp').then(result => {
                setNetworkedCombat(result);
                setScreen('pvp-waiting');
                // Poll for game start (when player 2 joins, status changes to 'active')
                pollRef.current = setInterval(() => {
                  combatApi.getState(result.sessionId).then(stateResult => {
                    if (stateResult.status === 'active') {
                      if (pollRef.current) clearInterval(pollRef.current);
                      pollRef.current = null;
                      setNetworkedCombat({ sessionId: result.sessionId, side: result.side, state: stateResult.state });
                      setScreen('combat-server');
                    }
                  }).catch(() => {});
                }, 1000);
              }).catch(err => alert(`Failed: ${err.message}`));
            }} style={{ flex: 1, backgroundColor: '#8b4513', fontSize: 12, padding: '6px 10px' }}>
              <span className="play-btn-title" style={{ fontSize: 13 }}>PVP Combat Player 1</span>
            </button>
            <button className="play-btn play-btn-frontend" onClick={() => {
              combatApi.findPvp().then(result => {
                setNetworkedCombat(result);
                setScreen('combat-server');
              }).catch(() => alert('No PVP session waiting. Player 1 must create first.'));
            }} style={{ flex: 1, backgroundColor: '#8b4513', fontSize: 12, padding: '6px 10px' }}>
              <span className="play-btn-title" style={{ fontSize: 13 }}>PVP Combat Player 2</span>
            </button>
          </div>
        </div>

        <p className="controls-hint">
          WASD / arrow keys · tap adjacent tile · or use the d-pad on mobile
        </p>
      </main>
    </div>
  );
}

export default App;
