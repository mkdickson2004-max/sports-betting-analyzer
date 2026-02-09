import { useState, useMemo } from 'react';
import { nbaTeams, sportsbooks, injuries, trends } from '../data/mockData';
import { analyzeMatchup } from '../utils/modelPredictor';
import { americanToImpliedProb, calculateEdge, findBestOdds, formatOdds, calculateExpectedValue } from '../utils/oddsConverter';
import { getEloTier } from '../utils/eloCalculator';
import './GameCard.css';

export default function GameCard({ game }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('odds');

    const homeTeam = nbaTeams[game.homeTeam];
    const awayTeam = nbaTeams[game.awayTeam];

    // Run AI analysis
    const analysis = useMemo(() => {
        return analyzeMatchup(homeTeam, awayTeam);
    }, [game.homeTeam, game.awayTeam]);

    // Find best odds across all books
    const bestOdds = useMemo(() => {
        const homeMLOdds = sportsbooks.map(book => ({
            book: book.name,
            bookId: book.id,
            odds: game.odds.home[book.id]?.moneyline
        })).filter(o => o.odds);

        const awayMLOdds = sportsbooks.map(book => ({
            book: book.name,
            bookId: book.id,
            odds: game.odds.away[book.id]?.moneyline
        })).filter(o => o.odds);

        return {
            home: findBestOdds(homeMLOdds),
            away: findBestOdds(awayMLOdds)
        };
    }, [game.odds]);

    // Calculate edge for each team
    const modelEdge = useMemo(() => {
        const homeProb = analysis.homeWinProb / 100;
        const awayProb = analysis.awayWinProb / 100;

        const homeBestOdds = bestOdds.home?.best?.odds || -110;
        const awayBestOdds = bestOdds.away?.best?.odds || -110;

        const homeMarketProb = americanToImpliedProb(homeBestOdds);
        const awayMarketProb = americanToImpliedProb(awayBestOdds);

        const homeEdge = calculateEdge(homeProb, homeMarketProb);
        const awayEdge = calculateEdge(awayProb, awayMarketProb);

        const homeEV = calculateExpectedValue(homeBestOdds, homeProb);
        const awayEV = calculateExpectedValue(awayBestOdds, awayProb);

        return {
            home: { edge: homeEdge, ev: homeEV, isValue: homeEdge > 3 },
            away: { edge: awayEdge, ev: awayEV, isValue: awayEdge > 3 }
        };
    }, [analysis, bestOdds]);

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const homeEloTier = getEloTier(homeTeam.elo);
    const awayEloTier = getEloTier(awayTeam.elo);

    const favoredTeam = analysis.favoredTeam === 'home' ? homeTeam : awayTeam;
    const hasValue = modelEdge.home.isValue || modelEdge.away.isValue;

    return (
        <div className={`game-card ${expanded ? 'expanded' : ''} ${hasValue ? 'has-value' : ''}`}>
            {/* Value Badge */}
            {hasValue && (
                <div className="value-badge">
                    <span>+EV</span>
                    VALUE BET
                </div>
            )}

            {/* Game Header */}
            <div className="game-header" onClick={() => setExpanded(!expanded)}>
                <div className="game-time">
                    <span className="time">{formatTime(game.startTime)}</span>
                    <span className="broadcast">{game.broadcast}</span>
                </div>

                <div className="matchup">
                    <div className="team away">
                        <div className="team-info">
                            <span className="team-abbr">{awayTeam.abbr}</span>
                            <span className="team-name">{awayTeam.city} {awayTeam.name}</span>
                            <span className="team-record">({awayTeam.record.wins}-{awayTeam.record.losses})</span>
                        </div>
                        <div className="team-meta">
                            <span className="elo-badge" style={{ borderColor: awayEloTier.color }}>
                                {awayEloTier.emoji} {awayTeam.elo}
                            </span>
                            {awayTeam.streakType && (
                                <span className={`streak ${awayTeam.streakType === 'W' ? 'win' : 'loss'}`}>
                                    {awayTeam.streakType}{awayTeam.streakCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="vs-indicator">
                        <span className="at-symbol">@</span>
                        <div className="win-prob">
                            <div className="prob-bar">
                                <div
                                    className="prob-fill home"
                                    style={{ width: `${analysis.homeWinProb}%` }}
                                ></div>
                            </div>
                            <span className="prob-text">{analysis.awayWinProb}% - {analysis.homeWinProb}%</span>
                        </div>
                    </div>

                    <div className="team home">
                        <div className="team-info">
                            <span className="team-abbr">{homeTeam.abbr}</span>
                            <span className="team-name">{homeTeam.city} {homeTeam.name}</span>
                            <span className="team-record">({homeTeam.record.wins}-{homeTeam.record.losses})</span>
                        </div>
                        <div className="team-meta">
                            <span className="elo-badge" style={{ borderColor: homeEloTier.color }}>
                                {homeEloTier.emoji} {homeTeam.elo}
                            </span>
                            {homeTeam.streakType && (
                                <span className={`streak ${homeTeam.streakType === 'W' ? 'win' : 'loss'}`}>
                                    {homeTeam.streakType}{homeTeam.streakCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button className="expand-btn">
                    <span className={`chevron ${expanded ? 'up' : 'down'}`}>›</span>
                </button>
            </div>

            {/* AI Summary Banner */}
            <div className="ai-summary">
                <div className="ai-icon">🤖</div>
                <div className="ai-content">
                    <strong>{favoredTeam.city} {favoredTeam.name}</strong> favored by model
                    ({analysis.favoredTeam === 'home' ? analysis.homeWinProb : analysis.awayWinProb}% win prob):
                    <span className="reason-preview">
                        {analysis.reasons.slice(0, 2).map(r => r.reason).join(' • ')}
                    </span>
                </div>
                {hasValue && (
                    <div className="edge-indicator positive">
                        +{Math.max(modelEdge.home.edge, modelEdge.away.edge).toFixed(1)}% Edge
                    </div>
                )}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="game-details animate-fade-in">
                    {/* Tabs */}
                    <div className="detail-tabs">
                        <button
                            className={`tab ${activeTab === 'odds' ? 'active' : ''}`}
                            onClick={() => setActiveTab('odds')}
                        >
                            📊 Odds Comparison
                        </button>
                        <button
                            className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            🧠 AI Analysis
                        </button>
                        <button
                            className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
                            onClick={() => setActiveTab('trends')}
                        >
                            📈 Trends & Stats
                        </button>
                    </div>

                    {/* Odds Comparison Tab */}
                    {activeTab === 'odds' && (
                        <div className="tab-content odds-content">
                            <OddsTable game={game} homeTeam={homeTeam} awayTeam={awayTeam} bestOdds={bestOdds} modelEdge={modelEdge} />
                        </div>
                    )}

                    {/* AI Analysis Tab */}
                    {activeTab === 'analysis' && (
                        <div className="tab-content analysis-content">
                            <AIAnalysis
                                analysis={analysis}
                                homeTeam={homeTeam}
                                awayTeam={awayTeam}
                                modelEdge={modelEdge}
                            />
                        </div>
                    )}

                    {/* Trends Tab */}
                    {activeTab === 'trends' && (
                        <div className="tab-content trends-content">
                            <TrendsView homeTeam={homeTeam} awayTeam={awayTeam} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Odds Comparison Table Component
function OddsTable({ game, homeTeam, awayTeam, bestOdds, modelEdge }) {
    return (
        <div className="odds-table-wrapper">
            <table className="odds-table">
                <thead>
                    <tr>
                        <th>Sportsbook</th>
                        <th>
                            <div className="team-header">
                                <span>{awayTeam.abbr}</span>
                                <small>Spread</small>
                            </div>
                        </th>
                        <th>
                            <div className="team-header">
                                <span>{awayTeam.abbr}</span>
                                <small>ML</small>
                            </div>
                        </th>
                        <th>
                            <div className="team-header">
                                <span>{homeTeam.abbr}</span>
                                <small>Spread</small>
                            </div>
                        </th>
                        <th>
                            <div className="team-header">
                                <span>{homeTeam.abbr}</span>
                                <small>ML</small>
                            </div>
                        </th>
                        <th>
                            <div className="team-header">
                                <span>Total</span>
                                <small>O/U</small>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sportsbooks.map(book => {
                        const homeOdds = game.odds.home[book.id];
                        const awayOdds = game.odds.away[book.id];

                        if (!homeOdds || !awayOdds) return null;

                        const isBestHomeML = bestOdds.home?.best?.bookId === book.id;
                        const isBestAwayML = bestOdds.away?.best?.bookId === book.id;

                        return (
                            <tr key={book.id}>
                                <td className="book-cell">
                                    <span className="book-logo">{book.logo}</span>
                                    <span className="book-name">{book.name}</span>
                                </td>
                                <td>
                                    <span className="spread-line">
                                        {awayOdds.spread.line > 0 ? '+' : ''}{awayOdds.spread.line}
                                    </span>
                                    <span className="spread-odds">({formatOdds(awayOdds.spread.odds)})</span>
                                </td>
                                <td className={isBestAwayML ? 'best-odds' : ''}>
                                    <span className="ml-odds">{formatOdds(awayOdds.moneyline)}</span>
                                    {isBestAwayML && <span className="best-tag">BEST</span>}
                                </td>
                                <td>
                                    <span className="spread-line">
                                        {homeOdds.spread.line > 0 ? '+' : ''}{homeOdds.spread.line}
                                    </span>
                                    <span className="spread-odds">({formatOdds(homeOdds.spread.odds)})</span>
                                </td>
                                <td className={isBestHomeML ? 'best-odds' : ''}>
                                    <span className="ml-odds">{formatOdds(homeOdds.moneyline)}</span>
                                    {isBestHomeML && <span className="best-tag">BEST</span>}
                                </td>
                                <td>
                                    <span className="total-line">{homeOdds.total.line}</span>
                                    <span className="total-odds">
                                        O {formatOdds(homeOdds.total.overOdds)} / U {formatOdds(homeOdds.total.underOdds)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Edge Summary */}
            <div className="edge-summary">
                <div className={`edge-card ${modelEdge.away.isValue ? 'value' : ''}`}>
                    <div className="edge-team">{awayTeam.abbr}</div>
                    <div className="edge-stats">
                        <div className="edge-row">
                            <span>Model Edge:</span>
                            <span className={modelEdge.away.edge > 0 ? 'positive' : 'negative'}>
                                {modelEdge.away.edge > 0 ? '+' : ''}{modelEdge.away.edge.toFixed(1)}%
                            </span>
                        </div>
                        <div className="edge-row">
                            <span>Expected Value:</span>
                            <span className={modelEdge.away.ev.isPositiveEV ? 'positive' : 'negative'}>
                                {modelEdge.away.ev.evPercent > 0 ? '+' : ''}{modelEdge.away.ev.evPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    {modelEdge.away.isValue && <div className="value-marker">+EV BET</div>}
                </div>

                <div className={`edge-card ${modelEdge.home.isValue ? 'value' : ''}`}>
                    <div className="edge-team">{homeTeam.abbr}</div>
                    <div className="edge-stats">
                        <div className="edge-row">
                            <span>Model Edge:</span>
                            <span className={modelEdge.home.edge > 0 ? 'positive' : 'negative'}>
                                {modelEdge.home.edge > 0 ? '+' : ''}{modelEdge.home.edge.toFixed(1)}%
                            </span>
                        </div>
                        <div className="edge-row">
                            <span>Expected Value:</span>
                            <span className={modelEdge.home.ev.isPositiveEV ? 'positive' : 'negative'}>
                                {modelEdge.home.ev.evPercent > 0 ? '+' : ''}{modelEdge.home.ev.evPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    {modelEdge.home.isValue && <div className="value-marker">+EV BET</div>}
                </div>
            </div>
        </div>
    );
}

// AI Analysis Component
function AIAnalysis({ analysis, homeTeam, awayTeam, modelEdge }) {
    const favoredTeam = analysis.favoredTeam === 'home' ? homeTeam : awayTeam;

    return (
        <div className="ai-analysis">
            <div className="analysis-header">
                <div className="favored-team">
                    <h3>🏆 Model Pick: {favoredTeam.city} {favoredTeam.name}</h3>
                    <div className="confidence-meter">
                        <span>Confidence:</span>
                        <div className="meter">
                            <div
                                className="meter-fill"
                                style={{ width: `${analysis.confidence}%` }}
                            ></div>
                        </div>
                        <span>{analysis.confidence}%</span>
                    </div>
                </div>

                <div className="prob-display">
                    <div className="prob-circle">
                        <span className="prob-value">{analysis.favoredTeam === 'home' ? analysis.homeWinProb : analysis.awayWinProb}%</span>
                        <span className="prob-label">Win Prob</span>
                    </div>
                </div>
            </div>

            <div className="reasons-list">
                <h4>Key Factors (X, Y, Z Analysis)</h4>
                {analysis.reasons.map((reason, i) => (
                    <div
                        key={i}
                        className={`reason-item ${reason.type}`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="reason-label">{reason.label}</div>
                        <div className="reason-content">
                            <span>{reason.reason}</span>
                            <span className={`impact ${reason.type}`}>
                                {reason.type === 'positive' ? '+' : '-'}{(reason.impact * 100).toFixed(0)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Injury Report */}
            <div className="injury-report">
                <h4>🚑 Injury Report</h4>
                <div className="injury-grid">
                    <div className="injury-team">
                        <span className="team-name">{awayTeam.name}</span>
                        {injuries[awayTeam.abbr]?.length > 0 ? (
                            injuries[awayTeam.abbr].map((inj, i) => (
                                <div key={i} className={`injury-item ${inj.status.toLowerCase()}`}>
                                    <span className="player">{inj.player}</span>
                                    <span className="status">{inj.status}</span>
                                    <span className="injury-type">{inj.injury}</span>
                                </div>
                            ))
                        ) : (
                            <span className="no-injuries">✓ No major injuries</span>
                        )}
                    </div>
                    <div className="injury-team">
                        <span className="team-name">{homeTeam.name}</span>
                        {injuries[homeTeam.abbr]?.length > 0 ? (
                            injuries[homeTeam.abbr].map((inj, i) => (
                                <div key={i} className={`injury-item ${inj.status.toLowerCase()}`}>
                                    <span className="player">{inj.player}</span>
                                    <span className="status">{inj.status}</span>
                                    <span className="injury-type">{inj.injury}</span>
                                </div>
                            ))
                        ) : (
                            <span className="no-injuries">✓ No major injuries</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Trends View Component
function TrendsView({ homeTeam, awayTeam }) {
    const homeTrends = trends[homeTeam.abbr] || [];
    const awayTrends = trends[awayTeam.abbr] || [];

    return (
        <div className="trends-view">
            <div className="trends-grid">
                <div className="team-trends">
                    <h4>{awayTeam.city} {awayTeam.name}</h4>
                    <div className="stats-row">
                        <div className="stat">
                            <span className="stat-label">Last 10</span>
                            <span className="stat-value">{awayTeam.last10.filter(x => x === 1).length}-{awayTeam.last10.filter(x => x === 0).length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">ATS</span>
                            <span className="stat-value">{awayTeam.atsRecord.wins}-{awayTeam.atsRecord.losses}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Away</span>
                            <span className="stat-value">{awayTeam.awayRecord.wins}-{awayTeam.awayRecord.losses}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Net Rtg</span>
                            <span className={`stat-value ${awayTeam.netRating > 0 ? 'positive' : 'negative'}`}>
                                {awayTeam.netRating > 0 ? '+' : ''}{awayTeam.netRating}
                            </span>
                        </div>
                    </div>
                    <ul className="trend-list">
                        {awayTrends.map((trend, i) => (
                            <li key={i}>{trend}</li>
                        ))}
                    </ul>
                </div>

                <div className="team-trends">
                    <h4>{homeTeam.city} {homeTeam.name}</h4>
                    <div className="stats-row">
                        <div className="stat">
                            <span className="stat-label">Last 10</span>
                            <span className="stat-value">{homeTeam.last10.filter(x => x === 1).length}-{homeTeam.last10.filter(x => x === 0).length}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">ATS</span>
                            <span className="stat-value">{homeTeam.atsRecord.wins}-{homeTeam.atsRecord.losses}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Home</span>
                            <span className="stat-value">{homeTeam.homeRecord.wins}-{homeTeam.homeRecord.losses}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Net Rtg</span>
                            <span className={`stat-value ${homeTeam.netRating > 0 ? 'positive' : 'negative'}`}>
                                {homeTeam.netRating > 0 ? '+' : ''}{homeTeam.netRating}
                            </span>
                        </div>
                    </div>
                    <ul className="trend-list">
                        {homeTrends.map((trend, i) => (
                            <li key={i}>{trend}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Head-to-Head */}
            <div className="h2h-section">
                <h4>📊 Key Matchup Stats</h4>
                <div className="h2h-stats">
                    <div className="h2h-row">
                        <span className="h2h-label">Points Per Game</span>
                        <span className={awayTeam.pointsPerGame > homeTeam.pointsPerGame ? 'highlight' : ''}>
                            {awayTeam.pointsPerGame}
                        </span>
                        <span className={homeTeam.pointsPerGame > awayTeam.pointsPerGame ? 'highlight' : ''}>
                            {homeTeam.pointsPerGame}
                        </span>
                    </div>
                    <div className="h2h-row">
                        <span className="h2h-label">Points Allowed</span>
                        <span className={awayTeam.pointsAllowed < homeTeam.pointsAllowed ? 'highlight' : ''}>
                            {awayTeam.pointsAllowed}
                        </span>
                        <span className={homeTeam.pointsAllowed < awayTeam.pointsAllowed ? 'highlight' : ''}>
                            {homeTeam.pointsAllowed}
                        </span>
                    </div>
                    <div className="h2h-row">
                        <span className="h2h-label">Pace</span>
                        <span>{awayTeam.pace}</span>
                        <span>{homeTeam.pace}</span>
                    </div>
                    <div className="h2h-row">
                        <span className="h2h-label">Defense Rank</span>
                        <span className={awayTeam.defenseRank < homeTeam.defenseRank ? 'highlight' : ''}>
                            #{awayTeam.defenseRank}
                        </span>
                        <span className={homeTeam.defenseRank < awayTeam.defenseRank ? 'highlight' : ''}>
                            #{homeTeam.defenseRank}
                        </span>
                    </div>
                    <div className="h2h-row">
                        <span className="h2h-label">Offense Rank</span>
                        <span className={awayTeam.offenseRank < homeTeam.offenseRank ? 'highlight' : ''}>
                            #{awayTeam.offenseRank}
                        </span>
                        <span className={homeTeam.offenseRank < awayTeam.offenseRank ? 'highlight' : ''}>
                            #{homeTeam.offenseRank}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
