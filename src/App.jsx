import { useState } from 'react';
import Header from './components/Header';
import LiveDashboard from './components/LiveDashboard';
import LiveGameCard from './components/LiveGameCard';
import EloRankings from './components/EloRankings';
import ParlayCreator from './components/ParlayCreator';
import SuperBowlView from './components/SuperBowlView';
import useDataAgent from './hooks/useDataAgent';
import BacktestView from './components/BacktestView';
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
          {/* View Tabs */}
          <div className="view-tabs">
            <button
              className={`view-tab ${activeView === 'games' ? 'active' : ''}`}
              onClick={() => setActiveView('games')}
            >
              <span className="tab-icon">🎮</span>
              Today's Games
              {data.games.length > 0 && (
                <span className="tab-badge">{data.games.length}</span>
              )}
            </button>
            <button
              className={`view-tab ${activeView === 'superbowl' ? 'active' : ''}`}
              onClick={() => setActiveView('superbowl')}
            >
              <span className="tab-icon">🏆</span>
              Super Bowl LX
              <span className="tab-badge highlight">LIVE</span>
            </button>
            <button
              className={`view-tab ${activeView === 'value' ? 'active' : ''}`}
              onClick={() => setActiveView('value')}
            >
              <span className="tab-icon">💰</span>
              Value Bets
              {data.valueBets.length > 0 && (
                <span className="tab-badge value">{data.valueBets.length}</span>
              )}
            </button>
            <button
              className={`view-tab ${activeView === 'news' ? 'active' : ''}`}
              onClick={() => setActiveView('news')}
            >
              <span className="tab-icon">📰</span>
              News & Alerts
              {data.alerts.length > 0 && (
                <span className="tab-badge alert">{data.alerts.length}</span>
              )}
            </button>
            <button
              className={`view-tab ${activeView === 'injuries' ? 'active' : ''}`}
              onClick={() => setActiveView('injuries')}
            >
              <span className="tab-icon">🏥</span>
              Injuries
            </button>
            <button
              className={`view-tab ${activeView === 'parlay' ? 'active' : ''}`}
              onClick={() => setActiveView('parlay')}
            >
              <span className="tab-icon">🎰</span>
              Parlay Builder
            </button>
            <button
              className={`view-tab ${activeView === 'backtest' ? 'active' : ''}`}
              onClick={() => setActiveView('backtest')}
            >
              <span className="tab-icon">⏳</span>
              Backtest Model
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
          {!data.isLoading && activeView === 'games' && (
            <LiveDashboard data={data} />
          )}

          {/* Games List */}
          {!data.isLoading && activeView === 'games' && (
            <section className="games-section">
              <div className="section-header">
                <h2>🏀 Live NBA Games</h2>
                <span className="live-badge">
                  <span className="live-dot"></span>
                  LIVE DATA
                </span>
              </div>

              {data.games.length > 0 ? (
                <div className="games-list">
                  {data.games.map(game => (
                    <LiveGameCard
                      key={game.id}
                      game={game}
                      odds={data.odds.find(o =>
                        o.home_team === game.homeTeam?.name ||
                        o.away_team === game.awayTeam?.name
                      )}
                      injuries={data.injuries}
                      news={data.news}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-games">
                  <p>No games scheduled for today</p>
                </div>
              )}
            </section>
          )}

          {/* Value Bets View */}
          {!data.isLoading && activeView === 'value' && (
            <ValueBetsView valueBets={data.valueBets} />
          )}

          {/* News View */}
          {!data.isLoading && activeView === 'news' && (
            <NewsView news={data.news} alerts={data.alerts} />
          )}

          {/* Injuries View */}
          {!data.isLoading && activeView === 'injuries' && (
            <InjuriesView injuries={data.injuries} />
          )}

          {/* Parlay Creator View */}
          {!data.isLoading && activeView === 'parlay' && (
            <ParlayCreator
              valueBets={data.valueBets}
              games={data.games}
              odds={data.odds}
            />
          )}

          {/* Super Bowl View */}
          {!data.isLoading && activeView === 'superbowl' && (
            <SuperBowlView />
          )}

          {/* Backtest View */}
          {!data.isLoading && activeView === 'backtest' && (
            <BacktestView />
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
            Data sourced from ESPN, The Odds API, and other public sources.
          </p>
          <div className="data-source">
            Last updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Value Bets Component
function ValueBetsView({ valueBets }) {
  return (
    <div className="value-bets-view">
      <div className="view-header">
        <h2>💰 Value Betting Opportunities</h2>
        <p>Bets where our model finds +3% edge over market odds</p>
      </div>

      {valueBets.length === 0 ? (
        <div className="no-value-bets">
          <span className="icon">🔍</span>
          <p>No value bets found at this time</p>
          <p className="subtext">The agent is continuously monitoring for opportunities</p>
        </div>
      ) : (
        <div className="value-bets-grid">
          {valueBets.map((bet, i) => (
            <div key={i} className="value-bet-card">
              <div className="bet-header">
                <span className="bet-rank">#{i + 1}</span>
                <span className="bet-matchup">{bet.matchup}</span>
                <span className="bet-edge">+{bet.edge}% EDGE</span>
              </div>
              <div className="bet-pick">
                <span className="pick-label">PICK:</span>
                <span className="pick-team">{bet.pick}</span>
              </div>
              <div className="bet-details">
                <div className="detail-row">
                  <span>Model Probability:</span>
                  <span className="model-prob">{bet.modelProb}%</span>
                </div>
                <div className="detail-row">
                  <span>Market Implied:</span>
                  <span>{bet.marketProb}%</span>
                </div>
                <div className="detail-row">
                  <span>Best Odds:</span>
                  <span className="best-odds">
                    {bet.bestOdds > 0 ? '+' : ''}{bet.bestOdds}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Best Book:</span>
                  <span className="best-book">{bet.bestBook}</span>
                </div>
              </div>
              <div className="bet-time">
                {new Date(bet.startTime).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// News View Component
function NewsView({ news, alerts }) {
  return (
    <div className="news-view">
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3>⚠️ High-Impact Alerts</h3>
          <div className="alerts-list">
            {alerts.map((alert, i) => (
              <div key={i} className="alert-card">
                <div className="alert-keywords">
                  {alert.keywords?.map((kw, j) => (
                    <span key={j} className="keyword-tag">{kw}</span>
                  ))}
                </div>
                <h4>{alert.headline}</h4>
                <p>{alert.description}</p>
                <a href={alert.link} target="_blank" rel="noopener noreferrer">
                  Read more →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="news-section">
        <h3>📰 Latest NBA News</h3>
        <div className="news-grid">
          {news.slice(0, 12).map((article, i) => (
            <div key={i} className={`news-card ${article.isHighImpact ? 'high-impact' : ''}`}>
              {article.image && (
                <img src={article.image} alt="" className="news-image" />
              )}
              <div className="news-content">
                <h4>{article.headline}</h4>
                <p>{article.description}</p>
                <div className="news-meta">
                  <span>{new Date(article.published).toLocaleDateString()}</span>
                  {article.isHighImpact && (
                    <span className="impact-badge">BETTING IMPACT</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Injuries View Component
function InjuriesView({ injuries }) {
  const teams = Object.entries(injuries);

  return (
    <div className="injuries-view">
      <div className="view-header">
        <h2>🏥 Injury Report</h2>
        <p>Real-time injury data affecting betting lines</p>
      </div>

      {teams.length === 0 ? (
        <div className="no-injuries">
          <p>Loading injury data...</p>
        </div>
      ) : (
        <div className="injuries-grid">
          {teams.filter(([_, data]) => data.players?.length > 0).map(([abbr, data]) => (
            <div key={abbr} className="team-injuries-card">
              <div className="injury-team-header">
                <span className="team-abbr">{abbr}</span>
                <span className="team-name">{data.team}</span>
                <span className="injury-count">{data.players.length}</span>
              </div>
              <div className="injured-players">
                {data.players.map((player, i) => (
                  <div key={i} className={`injured-player ${player.status?.toLowerCase()}`}>
                    <span className="player-name">{player.name}</span>
                    <span className="player-pos">{player.position}</span>
                    <span className={`player-status ${player.status?.toLowerCase()}`}>
                      {player.status}
                    </span>
                    <span className="injury-type">{player.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
