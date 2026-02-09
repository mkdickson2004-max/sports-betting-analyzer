import { useState, useMemo } from 'react';
import './ParlayCreator.css';

/**
 * Parlay Creator Component
 * 
 * Intelligently combines high-edge bets to create optimal parlays
 * that maximize probability-adjusted expected value.
 */
export default function ParlayCreator({ valueBets, games, odds }) {
    const [selectedLegs, setSelectedLegs] = useState([]);
    const [betAmount, setBetAmount] = useState(10);

    // Analyze all available bets and calculate edges
    const analyzedBets = useMemo(() => {
        if (!games || !odds) return [];

        const bets = [];

        games.forEach(game => {
            const gameOdds = odds.find(o =>
                o.home_team === game.homeTeam?.name ||
                o.away_team === game.awayTeam?.name
            );

            if (!gameOdds?.bookmakers?.length) return;
            if (!game.homeTeam?.record || !game.awayTeam?.record) return;

            // Parse records
            const homeRecord = game.homeTeam.record.split('-').map(Number);
            const awayRecord = game.awayTeam.record.split('-').map(Number);

            const homeWinPct = homeRecord[0] / (homeRecord[0] + homeRecord[1] + 0.001);
            const awayWinPct = awayRecord[0] / (awayRecord[0] + awayRecord[1] + 0.001);

            // Model probability with home advantage
            let modelHomeProb = (homeWinPct * 0.4) + (1 - awayWinPct) * 0.3 + 0.15;
            modelHomeProb = Math.max(0.2, Math.min(0.8, modelHomeProb));

            // Find best moneyline odds
            let bestHomeML = -999, bestAwayML = -999;
            let homeBook = '', awayBook = '';

            gameOdds.bookmakers.forEach(book => {
                const h2h = book.markets?.find(m => m.key === 'h2h');
                h2h?.outcomes?.forEach(o => {
                    if (o.name === game.homeTeam?.name && o.price > bestHomeML) {
                        bestHomeML = o.price;
                        homeBook = book.title;
                    }
                    if (o.name === game.awayTeam?.name && o.price > bestAwayML) {
                        bestAwayML = o.price;
                        awayBook = book.title;
                    }
                });
            });

            // Calculate implied probabilities
            const homeImplied = bestHomeML > 0
                ? 100 / (bestHomeML + 100)
                : Math.abs(bestHomeML) / (Math.abs(bestHomeML) + 100);

            const awayImplied = bestAwayML > 0
                ? 100 / (bestAwayML + 100)
                : Math.abs(bestAwayML) / (Math.abs(bestAwayML) + 100);

            // Calculate edges
            const homeEdge = ((modelHomeProb - homeImplied) / homeImplied) * 100;
            const awayEdge = (((1 - modelHomeProb) - awayImplied) / awayImplied) * 100;

            // Add home bet if positive edge
            if (homeEdge > 0) {
                bets.push({
                    id: `${game.id}-home`,
                    gameId: game.id,
                    matchup: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
                    team: game.homeTeam,
                    side: 'home',
                    modelProb: modelHomeProb,
                    marketProb: homeImplied,
                    edge: homeEdge,
                    odds: bestHomeML,
                    book: homeBook,
                    decimalOdds: bestHomeML > 0 ? (bestHomeML / 100) + 1 : (100 / Math.abs(bestHomeML)) + 1
                });
            }

            // Add away bet if positive edge
            if (awayEdge > 0) {
                bets.push({
                    id: `${game.id}-away`,
                    gameId: game.id,
                    matchup: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
                    team: game.awayTeam,
                    side: 'away',
                    modelProb: 1 - modelHomeProb,
                    marketProb: awayImplied,
                    edge: awayEdge,
                    odds: bestAwayML,
                    book: awayBook,
                    decimalOdds: bestAwayML > 0 ? (bestAwayML / 100) + 1 : (100 / Math.abs(bestAwayML)) + 1
                });
            }
        });

        // Sort by edge (highest first)
        return bets.sort((a, b) => b.edge - a.edge);
    }, [games, odds]);

    // Generate optimal parlay suggestions
    const parlayOptions = useMemo(() => {
        if (analyzedBets.length < 2) return [];

        const parlays = [];

        // Filter to only positive edge bets
        const positiveBets = analyzedBets.filter(b => b.edge > 2);

        if (positiveBets.length < 2) return [];

        // 2-leg parlay: Top 2 highest probability bets
        const safePicks = [...positiveBets].sort((a, b) => b.modelProb - a.modelProb).slice(0, 2);
        if (safePicks.length >= 2) {
            const prob = safePicks.reduce((p, b) => p * b.modelProb, 1);
            const payout = safePicks.reduce((p, b) => p * b.decimalOdds, 1);
            parlays.push({
                name: '🛡️ Safe Parlay',
                description: 'Highest probability combination',
                legs: safePicks,
                probability: prob,
                payout: payout,
                expectedValue: prob * payout - 1,
                risk: 'low'
            });
        }

        // 2-leg parlay: Top 2 highest edge bets
        const edgePicks = positiveBets.slice(0, 2);
        if (edgePicks.length >= 2 && edgePicks[0].id !== safePicks[0]?.id) {
            const prob = edgePicks.reduce((p, b) => p * b.modelProb, 1);
            const payout = edgePicks.reduce((p, b) => p * b.decimalOdds, 1);
            parlays.push({
                name: '💰 Value Parlay',
                description: 'Maximum edge combination',
                legs: edgePicks,
                probability: prob,
                payout: payout,
                expectedValue: prob * payout - 1,
                risk: 'medium'
            });
        }

        // 3-leg parlay: Balanced approach (top 3 by EV)
        if (positiveBets.length >= 3) {
            const evPicks = [...positiveBets]
                .map(b => ({ ...b, ev: b.modelProb * b.decimalOdds - 1 }))
                .sort((a, b) => b.ev - a.ev)
                .slice(0, 3);

            const prob = evPicks.reduce((p, b) => p * b.modelProb, 1);
            const payout = evPicks.reduce((p, b) => p * b.decimalOdds, 1);
            parlays.push({
                name: '🎯 Optimal Parlay',
                description: 'Best expected value 3-leg',
                legs: evPicks,
                probability: prob,
                payout: payout,
                expectedValue: prob * payout - 1,
                risk: 'medium'
            });
        }

        // 4-leg parlay: Higher risk/reward
        if (positiveBets.length >= 4) {
            const bigPicks = positiveBets.slice(0, 4);
            const prob = bigPicks.reduce((p, b) => p * b.modelProb, 1);
            const payout = bigPicks.reduce((p, b) => p * b.decimalOdds, 1);
            parlays.push({
                name: '🔥 Big Payout Parlay',
                description: 'Higher risk, higher reward',
                legs: bigPicks,
                probability: prob,
                payout: payout,
                expectedValue: prob * payout - 1,
                risk: 'high'
            });
        }

        return parlays.sort((a, b) => b.expectedValue - a.expectedValue);
    }, [analyzedBets]);

    // Custom parlay calculations
    const customParlay = useMemo(() => {
        if (selectedLegs.length < 2) return null;

        const legs = selectedLegs.map(id => analyzedBets.find(b => b.id === id)).filter(Boolean);
        if (legs.length < 2) return null;

        const prob = legs.reduce((p, b) => p * b.modelProb, 1);
        const payout = legs.reduce((p, b) => p * b.decimalOdds, 1);

        return {
            legs,
            probability: prob,
            payout: payout,
            expectedValue: prob * payout - 1,
            potentialWin: betAmount * payout - betAmount
        };
    }, [selectedLegs, analyzedBets, betAmount]);

    const toggleLeg = (betId) => {
        setSelectedLegs(prev =>
            prev.includes(betId)
                ? prev.filter(id => id !== betId)
                : [...prev, betId]
        );
    };

    const formatOdds = (odds) => odds > 0 ? `+${odds}` : odds;
    const formatPct = (prob) => `${(prob * 100).toFixed(1)}%`;
    const formatPayout = (payout) => `${payout.toFixed(2)}x`;

    return (
        <div className="parlay-creator">
            <div className="parlay-header">
                <h2>🎰 Smart Parlay Creator</h2>
                <p>AI-powered parlay suggestions optimized for probability × payout</p>
            </div>

            {/* Suggested Parlays */}
            {parlayOptions.length > 0 && (
                <div className="parlay-suggestions">
                    <h3>Suggested Parlays</h3>
                    <div className="parlay-grid">
                        {parlayOptions.map((parlay, idx) => (
                            <div key={idx} className={`parlay-card ${parlay.risk}`}>
                                <div className="parlay-card-header">
                                    <span className="parlay-name">{parlay.name}</span>
                                    <span className={`parlay-ev ${parlay.expectedValue > 0 ? 'positive' : 'negative'}`}>
                                        EV: {parlay.expectedValue > 0 ? '+' : ''}{(parlay.expectedValue * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="parlay-desc">{parlay.description}</p>
                                <div className="parlay-legs">
                                    {parlay.legs.map((leg, i) => (
                                        <div key={i} className="parlay-leg">
                                            <span className="leg-team">{leg.team.abbr}</span>
                                            <span className="leg-odds">{formatOdds(leg.odds)}</span>
                                            <span className="leg-edge">+{leg.edge.toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="parlay-stats">
                                    <div className="stat">
                                        <span className="label">Win Prob</span>
                                        <span className="value">{formatPct(parlay.probability)}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="label">Payout</span>
                                        <span className="value">{formatPayout(parlay.payout)}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="label">$10 → </span>
                                        <span className="value win">${(10 * parlay.payout).toFixed(2)}</span>
                                    </div>
                                </div>
                                <button
                                    className="use-parlay-btn"
                                    onClick={() => setSelectedLegs(parlay.legs.map(l => l.id))}
                                >
                                    Use This Parlay
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Build Custom Parlay */}
            <div className="custom-parlay-section">
                <h3>Build Custom Parlay</h3>
                <p className="section-desc">Select legs from available bets below</p>

                {analyzedBets.length === 0 ? (
                    <div className="no-bets-message">
                        <span>🔍</span>
                        <p>No positive edge bets available. Check back when games have odds.</p>
                    </div>
                ) : (
                    <>
                        <div className="available-legs">
                            {analyzedBets.map(bet => (
                                <div
                                    key={bet.id}
                                    className={`leg-option ${selectedLegs.includes(bet.id) ? 'selected' : ''} ${bet.edge > 5 ? 'strong' : bet.edge > 3 ? 'medium' : ''}`}
                                    onClick={() => toggleLeg(bet.id)}
                                >
                                    <div className="leg-check">
                                        {selectedLegs.includes(bet.id) ? '✓' : '○'}
                                    </div>
                                    <div className="leg-info">
                                        <span className="leg-matchup">{bet.matchup}</span>
                                        <span className="leg-pick">{bet.team.abbr} ML</span>
                                    </div>
                                    <div className="leg-numbers">
                                        <span className="leg-odds">{formatOdds(bet.odds)}</span>
                                        <span className="leg-edge">+{bet.edge.toFixed(1)}% edge</span>
                                        <span className="leg-prob">{formatPct(bet.modelProb)} prob</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Custom Parlay Summary */}
                        {customParlay && (
                            <div className="custom-parlay-summary">
                                <h4>Your Parlay ({customParlay.legs.length} legs)</h4>
                                <div className="custom-stats">
                                    <div className="stat-box">
                                        <span className="stat-label">Combined Probability</span>
                                        <span className="stat-value">{formatPct(customParlay.probability)}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Payout Multiplier</span>
                                        <span className="stat-value">{formatPayout(customParlay.payout)}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Expected Value</span>
                                        <span className={`stat-value ${customParlay.expectedValue > 0 ? 'positive' : 'negative'}`}>
                                            {customParlay.expectedValue > 0 ? '+' : ''}{(customParlay.expectedValue * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="bet-calculator">
                                    <label>
                                        Bet Amount: $
                                        <input
                                            type="number"
                                            value={betAmount}
                                            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                            min="1"
                                        />
                                    </label>
                                    <div className="potential-win">
                                        <span>Potential Win:</span>
                                        <span className="win-amount">${customParlay.potentialWin.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedLegs.length === 1 && (
                            <div className="parlay-hint">
                                Select at least 2 legs to create a parlay
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
