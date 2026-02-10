import { useState, useMemo } from 'react';
import DeepAnalysisPanel from './DeepAnalysisPanel';
import './LiveGameCard.css';

export default function LiveGameCard({ game, odds, injuries, news }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('analysis');

    // Get injuries for both teams
    const homeInjuries = injuries?.[game.homeTeam?.abbr];
    const awayInjuries = injuries?.[game.awayTeam?.abbr];

    // Calculate best odds from the odds data
    const bestOdds = useMemo(() => {
        if (!odds?.bookmakers) return null;

        const result = {
            home: { ml: -Infinity, spread: { point: -Infinity, price: -Infinity }, book: '' },
            away: { ml: -Infinity, spread: { point: -Infinity, price: -Infinity }, book: '' },
            over: { point: Infinity, price: -Infinity }, // Over: Lower point is better
            under: { point: -Infinity, price: -Infinity }, // Under: Higher point is better
        };

        odds.bookmakers.forEach(book => {
            // Moneyline - Maximize Price
            const h2h = book.markets?.find(m => m.key === 'h2h');
            h2h?.outcomes?.forEach(o => {
                if (o.name === game.homeTeam?.name) {
                    if (o.price > result.home.ml) {
                        result.home.ml = o.price;
                        result.home.mlBook = book.title;
                    }
                }
                if (o.name === game.awayTeam?.name) {
                    if (o.price > result.away.ml) {
                        result.away.ml = o.price;
                        result.away.mlBook = book.title;
                    }
                }
            });

            // Spread - Maximize Point (e.g. +5.5 > +4.5, -2.5 > -3.5), then Price
            const spread = book.markets?.find(m => m.key === 'spreads');
            spread?.outcomes?.forEach(o => {
                if (o.name === game.homeTeam?.name) {
                    const currentBest = result.home.spread;
                    if (o.point > currentBest.point || (o.point === currentBest.point && o.price > currentBest.price)) {
                        result.home.spread = { point: o.point, price: o.price };
                        result.home.spreadBook = book.title;
                    }
                }
                if (o.name === game.awayTeam?.name) {
                    const currentBest = result.away.spread;
                    if (o.point > currentBest.point || (o.point === currentBest.point && o.price > currentBest.price)) {
                        result.away.spread = { point: o.point, price: o.price };
                        result.away.spreadBook = book.title;
                    }
                }
            });

            // Total - Over (Min Point), Under (Max Point)
            const total = book.markets?.find(m => m.key === 'totals');
            if (total?.outcomes) {
                const over = total.outcomes.find(o => o.name === 'Over');
                const under = total.outcomes.find(o => o.name === 'Under');

                if (over) {
                    if (over.point < result.over.point || (over.point === result.over.point && over.price > result.over.price)) {
                        result.over = { point: over.point, price: over.price };
                    }
                }
                if (under) {
                    if (under.point > result.under.point || (under.point === result.under.point && under.price > result.under.price)) {
                        result.under = { point: under.point, price: under.price };
                    }
                }
            }
        });

        // Clean up infinity values
        if (result.home.ml === -Infinity) result.home.ml = null;
        if (result.away.ml === -Infinity) result.away.ml = null;

        // Pass a single total for display header (avg or standard)
        result.total = result.over.point !== Infinity ? result.over.point : null;

        return result;
    }, [odds, game]);

    // Calculate edge and bet sizing from model vs market
    const edgeAnalysis = useMemo(() => {
        if (!bestOdds || !game.homeTeam?.record || !game.awayTeam?.record) {
            return { edge: 0, side: null, betSize: 'skip', confidence: 0 };
        }

        // Parse records
        const homeRecord = game.homeTeam.record.split('-').map(Number);
        const awayRecord = game.awayTeam.record.split('-').map(Number);

        const homeWinPct = homeRecord[0] / (homeRecord[0] + homeRecord[1] + 0.001);
        const awayWinPct = awayRecord[0] / (awayRecord[0] + awayRecord[1] + 0.001);

        // Model probability with home advantage
        let modelHomeProb = (homeWinPct * 0.4) + (1 - awayWinPct) * 0.3 + 0.15;
        modelHomeProb = Math.max(0.2, Math.min(0.8, modelHomeProb));

        // Calculate implied probability from moneyline
        const homeImplied = bestOdds.home.ml > 0
            ? 100 / (bestOdds.home.ml + 100)
            : Math.abs(bestOdds.home.ml) / (Math.abs(bestOdds.home.ml) + 100);

        const awayImplied = bestOdds.away.ml > 0
            ? 100 / (bestOdds.away.ml + 100)
            : Math.abs(bestOdds.away.ml) / (Math.abs(bestOdds.away.ml) + 100);

        // Calculate edges
        const homeEdge = ((modelHomeProb - homeImplied) / homeImplied) * 100;
        const awayEdge = (((1 - modelHomeProb) - awayImplied) / awayImplied) * 100;

        // Find best edge
        const bestEdge = homeEdge > awayEdge ? homeEdge : awayEdge;
        const side = homeEdge > awayEdge ? 'home' : 'away';
        const teamPick = side === 'home' ? game.homeTeam : game.awayTeam;

        // Determine bet sizing based on edge and confidence
        let betSize = 'skip';
        let confidence = 0;

        if (bestEdge >= 8) {
            betSize = 'strong'; // Heavy bet - high edge
            confidence = 85 + Math.min(10, bestEdge - 8);
        } else if (bestEdge >= 5) {
            betSize = 'medium'; // Standard bet - good edge
            confidence = 70 + (bestEdge - 5) * 3;
        } else if (bestEdge >= 3) {
            betSize = 'lean'; // Lean/small bet - moderate edge
            confidence = 55 + (bestEdge - 3) * 5;
        } else if (bestEdge > 0) {
            betSize = 'skip'; // No bet - edge too small
            confidence = 40 + bestEdge * 5;
        } else {
            betSize = 'fade'; // Consider opposite
            confidence = Math.max(30, 50 + bestEdge * 2);
        }

        return {
            edge: Math.round(bestEdge * 10) / 10,
            side,
            teamPick,
            betSize,
            confidence: Math.round(confidence),
            modelProb: Math.round((side === 'home' ? modelHomeProb : 1 - modelHomeProb) * 100),
            marketProb: Math.round((side === 'home' ? homeImplied : awayImplied) * 100)
        };
    }, [bestOdds, game]);

    const gameTime = new Date(game.date).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });

    const isLive = game.status === 'In Progress';

    return (
        <div className={`live-game-card ${expanded ? 'expanded' : ''} ${isLive ? 'live' : ''}`}>
            {/* Game Header */}
            <div className="game-header" onClick={() => setExpanded(!expanded)}>
                <div className="game-time">
                    <span className="time">{gameTime}</span>
                    <span className="broadcast">{game.broadcast}</span>
                    {isLive && <span className="live-tag">🔴 LIVE</span>}
                </div>

                <div className="matchup">
                    {/* Away Team */}
                    <div className="team away">
                        {game.awayTeam?.logo && (
                            <img src={game.awayTeam.logo} alt="" className="team-logo" />
                        )}
                        <div className="team-info">
                            <span className="team-abbr">{game.awayTeam?.abbr}</span>
                            <span className="team-record">{game.awayTeam?.record}</span>
                        </div>
                        {bestOdds && (
                            <div className="team-odds">
                                <span className="spread">
                                    {bestOdds.away.spread?.point > 0 ? '+' : ''}
                                    {bestOdds.away.spread?.point}
                                </span>
                                <span className="ml">
                                    {bestOdds.away.ml > 0 ? '+' : ''}{bestOdds.away.ml}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="vs">
                        <span>@</span>
                        {bestOdds?.total && (
                            <span className="total">O/U {bestOdds.total}</span>
                        )}
                    </div>

                    {/* Home Team */}
                    <div className="team home">
                        {game.homeTeam?.logo && (
                            <img src={game.homeTeam.logo} alt="" className="team-logo" />
                        )}
                        <div className="team-info">
                            <span className="team-abbr">{game.homeTeam?.abbr}</span>
                            <span className="team-record">{game.homeTeam?.record}</span>
                        </div>
                        {bestOdds && (
                            <div className="team-odds">
                                <span className="spread">
                                    {bestOdds.home.spread?.point > 0 ? '+' : ''}
                                    {bestOdds.home.spread?.point}
                                </span>
                                <span className="ml">
                                    {bestOdds.home.ml > 0 ? '+' : ''}{bestOdds.home.ml}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edge Preview Badge */}
                {edgeAnalysis.edge !== 0 ? (
                    <div className={`edge-preview ${edgeAnalysis.betSize}`}>
                        <div className="edge-team">
                            {edgeAnalysis.teamPick?.abbr}
                        </div>
                        <div className="edge-value">
                            {edgeAnalysis.edge > 0 ? '+' : ''}{edgeAnalysis.edge}%
                        </div>
                        <div className={`bet-size ${edgeAnalysis.betSize}`}>
                            {edgeAnalysis.betSize === 'strong' && '🔥 STRONG'}
                            {edgeAnalysis.betSize === 'medium' && '✅ VALUE'}
                            {edgeAnalysis.betSize === 'lean' && '📊 LEAN'}
                            {edgeAnalysis.betSize === 'skip' && '⏸️ SKIP'}
                            {edgeAnalysis.betSize === 'fade' && '⚠️ FADE'}
                        </div>
                    </div>
                ) : (
                    <div className="edge-preview no-data">
                        <div className="edge-value">—</div>
                        <div className="bet-size skip">📡 NO ODDS</div>
                    </div>
                )}

                <button className="expand-btn">
                    {expanded ? '▲' : '▼'}
                </button>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="game-details">
                    {/* Tabs */}
                    <div className="detail-tabs">
                        <button
                            className={activeTab === 'analysis' ? 'active' : ''}
                            onClick={() => setActiveTab('analysis')}
                        >
                            🧠 AI Analysis
                        </button>
                        <button
                            className={activeTab === 'odds' ? 'active' : ''}
                            onClick={() => setActiveTab('odds')}
                        >
                            📊 Odds Comparison
                        </button>
                        <button
                            className={activeTab === 'injuries' ? 'active' : ''}
                            onClick={() => setActiveTab('injuries')}
                        >
                            🏥 Injuries
                        </button>
                    </div>

                    {/* AI Analysis Tab */}
                    {activeTab === 'analysis' && (
                        <DeepAnalysisPanel
                            game={game}
                            odds={odds}
                            injuries={injuries}
                            news={news}
                            scrapedData={game.scrapedData}
                            analysisData={game.aiAnalysis}
                        />
                    )}

                    {/* Odds Tab */}
                    {activeTab === 'odds' && odds?.bookmakers && (
                        <div className="odds-table-container">
                            <table className="odds-table">
                                <thead>
                                    <tr>
                                        <th>Sportsbook</th>
                                        <th>{game.awayTeam?.abbr} Spread</th>
                                        <th>{game.awayTeam?.abbr} ML</th>
                                        <th>{game.homeTeam?.abbr} Spread</th>
                                        <th>{game.homeTeam?.abbr} ML</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {odds.bookmakers.map(book => {
                                        const h2h = book.markets?.find(m => m.key === 'h2h');
                                        const spreads = book.markets?.find(m => m.key === 'spreads');
                                        const totals = book.markets?.find(m => m.key === 'totals');

                                        const awayML = h2h?.outcomes?.find(o => o.name === game.awayTeam?.name);
                                        const homeML = h2h?.outcomes?.find(o => o.name === game.homeTeam?.name);
                                        const awaySpread = spreads?.outcomes?.find(o => o.name === game.awayTeam?.name);
                                        const homeSpread = spreads?.outcomes?.find(o => o.name === game.homeTeam?.name);

                                        const over = totals?.outcomes?.find(o => o.name === 'Over');

                                        // Check for best odds
                                        const isBestAwaySpread = awaySpread && bestOdds?.away.spread &&
                                            awaySpread.point === bestOdds.away.spread.point &&
                                            awaySpread.price === bestOdds.away.spread.price;

                                        const isBestHomeSpread = homeSpread && bestOdds?.home.spread &&
                                            homeSpread.point === bestOdds.home.spread.point &&
                                            homeSpread.price === bestOdds.home.spread.price;

                                        const isBestAwayML = awayML && bestOdds?.away.ml &&
                                            awayML.price === bestOdds.away.ml;

                                        const isBestHomeML = homeML && bestOdds?.home.ml &&
                                            homeML.price === bestOdds.home.ml;

                                        const isBestOver = over && bestOdds?.over &&
                                            over.point === bestOdds.over.point &&
                                            over.price === bestOdds.over.price;

                                        return (
                                            <tr key={book.key}>
                                                <td className="book-name">{book.title}</td>
                                                <td className={isBestAwaySpread ? 'best' : ''}>
                                                    {awaySpread ? `${awaySpread.point > 0 ? '+' : ''}${awaySpread.point} (${awaySpread.price > 0 ? '+' : ''}${awaySpread.price})` : '-'}
                                                </td>
                                                <td className={isBestAwayML ? 'best' : ''}>
                                                    {awayML ? `${awayML.price > 0 ? '+' : ''}${awayML.price}` : '-'}
                                                </td>
                                                <td className={isBestHomeSpread ? 'best' : ''}>
                                                    {homeSpread ? `${homeSpread.point > 0 ? '+' : ''}${homeSpread.point} (${homeSpread.price > 0 ? '+' : ''}${homeSpread.price})` : '-'}
                                                </td>
                                                <td className={isBestHomeML ? 'best' : ''}>
                                                    {homeML ? `${homeML.price > 0 ? '+' : ''}${homeML.price}` : '-'}
                                                </td>
                                                <td className={isBestOver ? 'best' : ''}>
                                                    {over ? `O ${over.point} (${over.price > 0 ? '+' : ''}${over.price})` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Injuries Tab */}
                    {activeTab === 'injuries' && (
                        <div className="injuries-panel">
                            <div className="team-injuries">
                                <h4>{game.awayTeam?.name}</h4>
                                {awayInjuries?.players?.length > 0 ? (
                                    <ul>
                                        {awayInjuries.players.map((player, i) => (
                                            <li key={i} className={player.status?.toLowerCase()}>
                                                <span className="player">{player.name}</span>
                                                <span className="status">{player.status}</span>
                                                <span className="type">{player.type}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-injuries">No injuries reported</p>
                                )}
                            </div>

                            <div className="team-injuries">
                                <h4>{game.homeTeam?.name}</h4>
                                {homeInjuries?.players?.length > 0 ? (
                                    <ul>
                                        {homeInjuries.players.map((player, i) => (
                                            <li key={i} className={player.status?.toLowerCase()}>
                                                <span className="player">{player.name}</span>
                                                <span className="status">{player.status}</span>
                                                <span className="type">{player.type}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-injuries">No injuries reported</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
