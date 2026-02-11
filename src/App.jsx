import { useState } from 'react';
import Header from './components/Header';
import LiveDashboard from './components/LiveDashboard';
import LiveGameCard from './components/LiveGameCard';
import EloRankings from './components/EloRankings';
import ParlayCreator from './components/ParlayCreator';
import SuperBowlView from './components/SuperBowlView';
import useDataAgent from './hooks/useDataAgent';

import './App.css';

function App() {
  const [activeSport, setActiveSport] = useState('nba');
  const [activeView, setActiveView] = useState('games');

  // Run the autonomous data agent
  const { data, agentStatus, refreshData } = useDataAgent();

  return (
    <div className="app">
      <Header
        activeSport={activeSport}
        setActiveSport={setActiveSport}
        onRefresh={refreshData}
        lastUpdated={data.lastUpdated}
      />

      {/* Agent Status Banner */}
      {agentStatus.isRunning && (
        <div className="agent-status-banner">
          <div className="agent-spinner"></div>
          <span className="agent-task">{agentStatus.currentTask}</span>
          <span className="agent-progress">
            {agentStatus.tasksCompleted}/{agentStatus.totalTasks}
          </span>
        </div>
      )}

      <main className="main-content">
        <div className="container">
          {/* Simplified View Tabs */}
          <div className="view-tabs">
            <button className="view-tab active">
              <span className="tab-icon">🤖</span>
              AI Totals Analysis
              {data.games.length > 0 && (
                <span className="tab-badge">{data.games.length}</span>
              )}
            </button>
          </div>

          {/* Loading State */}
          {data.isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Agent is collecting data from across the internet...</p>
              <p className="loading-detail">{agentStatus.currentTask}</p>
            </div>
          )}

          {/* Error State */}
          {data.error && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>Error: {data.error}</p>
              <button onClick={refreshData}>Retry</button>
            </div>
          )}

          {/* Dashboard Stats */}
          {!data.isLoading && (
            <LiveDashboard data={data} />
          )}

          {/* Games List */}
          {!data.isLoading && (
            <section className="games-section">
              <div className="section-header">
                <h2>🏀 Live {activeSport.toUpperCase()} Games</h2>
                <span className="live-badge">
                  <span className="live-dot"></span>
                  LIVE DATA
                </span>
              </div>

              {data.games.filter(g => g.sport === activeSport).length > 0 ? (
                <div className="games-list">
                  {data.games
                    .filter(g => g.sport === activeSport)
                    .map(game => (
                      <LiveGameCard
                        key={game.id}
                        game={game}
                        odds={data.odds.find(o => o.id === game.id)}
                        injuries={data.injuries}
                        news={data.news}
                      />
                    ))}
                </div>
              ) : (
                <div className="no-games">
                  <p>No {activeSport.toUpperCase()} games scheduled for today</p>
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo">📊</span>
            <span>EdgeFinder</span>
          </div>
          <p className="disclaimer">
            For entertainment purposes only. Please gamble responsibly.
            Simulations powered by Monte Carlo AI models.
          </p>
          <div className="data-source">
            Last updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
