/**
 * useDataAgent Hook
 * 
 * React hook that runs the autonomous data agent and provides
 * real-time betting intelligence to components.
 * 
 * FETCHES FROM BACKEND AGENT
 */

import { useState, useEffect, useCallback } from 'react';

// API Base URL (env var or localhost default)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useDataAgent(initialSport = 'nba') {
    const [sport, setSport] = useState(initialSport);
    const [data, setData] = useState({
        games: [],
        odds: [],
        injuries: {},
        news: [],
        stats: {}, // derived from teamStats
        valueBets: [],
        alerts: [],
        isLoading: true,
        error: null,
        lastUpdated: null,
    });

    const [agentStatus, setAgentStatus] = useState({
        isRunning: false,
        currentTask: '',
        tasksCompleted: 0,
        totalTasks: 3,
    });

    /**
     * Calculate value bets from odds and model predictions
     * (Kept on client for now as it's pure math on fetched data)
     */
    const calculateValueBets = useCallback((odds, games) => {
        const valueBets = [];
        // Map odds object structure if needed, backend sends as map or array
        const oddsArray = Array.isArray(odds) ? odds : Object.values(odds);
        const gamesArray = Array.isArray(games) ? games : Object.values(games);

        oddsArray.forEach(game => {
            if (!game.bookmakers || Object.keys(game.bookmakers).length === 0) return;

            // Backend might store bookmakers as object map
            const bookmakers = Array.isArray(game.bookmakers) ? game.bookmakers : Object.values(game.bookmakers);

            // Find best odds across all books
            let bestHomeOdds = { price: -999, book: '' };
            let bestAwayOdds = { price: -999, book: '' };
            let bestHomeSpread = null;
            let bestAwaySpread = null;

            bookmakers.forEach(book => {
                // Book structure from backend might be { name, markets: { h2h: [...], spreads: [...] } }
                // or array of markets.

                // If markets is object map keys
                const markets = book.markets;
                if (!markets) return;

                // Handle both array (OddsAPI raw) and object (Processed) formats if possible, 
                // but let's assume Processed from dataAgent.js:
                // gameOdds.bookmakers[book.key].markets[market.key] = [...]

                const h2h = Array.isArray(markets) ? markets.find(m => m.key === 'h2h')?.outcomes : markets.h2h;
                const spreads = Array.isArray(markets) ? markets.find(m => m.key === 'spreads')?.outcomes : markets.spreads;

                if (h2h) {
                    h2h.forEach(outcome => {
                        if (outcome.name === game.homeTeam && outcome.price > bestHomeOdds.price) {
                            bestHomeOdds = { price: outcome.price, book: book.name };
                        }
                        if (outcome.name === game.awayTeam && outcome.price > bestAwayOdds.price) {
                            bestAwayOdds = { price: outcome.price, book: book.name };
                        }
                    });
                }

                if (spreads) {
                    spreads.forEach(outcome => {
                        if (outcome.name === game.homeTeam) {
                            if (!bestHomeSpread || outcome.price > bestHomeSpread.price) {
                                bestHomeSpread = { point: outcome.point, price: outcome.price, book: book.name };
                            }
                        }
                        if (outcome.name === game.awayTeam) {
                            if (!bestAwaySpread || outcome.price > bestAwaySpread.price) {
                                bestAwaySpread = { point: outcome.point, price: outcome.price, book: book.name };
                            }
                        }
                    });
                }
            });

            // Match with game data for records
            // Backend games use 'name' or 'homeTeam.name'
            const matchingGame = gamesArray.find(g =>
                g.homeTeam?.name === game.homeTeam || g.awayTeam?.name === game.awayTeam
            );

            // Parse records to estimate probability
            let modelHomeProb = 0.5;

            if (matchingGame) {
                // PRIMARILY USE AI MODEL PROBABILITY IF AVAILABLE
                if (matchingGame.aiAnalysis && (matchingGame.aiAnalysis.modelHomeWinProb || matchingGame.aiAnalysis.homeWinProb)) {
                    const prob = matchingGame.aiAnalysis.modelHomeWinProb || matchingGame.aiAnalysis.homeWinProb;
                    modelHomeProb = prob / 100;
                } else {
                    // Fallback to simple record-based estimation
                    const homeRecord = matchingGame.homeTeam?.record?.split('-').map(Number) || [0, 0];
                    const awayRecord = matchingGame.awayTeam?.record?.split('-').map(Number) || [0, 0];

                    const homeWinPct = homeRecord[0] / (homeRecord[0] + homeRecord[1] + 0.001);
                    const awayWinPct = awayRecord[0] / (awayRecord[0] + awayRecord[1] + 0.001);

                    // Combine with home advantage (~60% baseline for home)
                    modelHomeProb = (homeWinPct * 0.4) + (1 - awayWinPct) * 0.3 + 0.15;
                    modelHomeProb = Math.max(0.2, Math.min(0.8, modelHomeProb));
                }
            }

            // Calculate implied probability from odds
            const homeImplied = bestHomeOdds.price > 0
                ? 100 / (bestHomeOdds.price + 100)
                : Math.abs(bestHomeOdds.price) / (Math.abs(bestHomeOdds.price) + 100);

            const awayImplied = bestAwayOdds.price > 0
                ? 100 / (bestAwayOdds.price + 100)
                : Math.abs(bestAwayOdds.price) / (Math.abs(bestAwayOdds.price) + 100);

            // Calculate edge
            const homeEdge = ((modelHomeProb - homeImplied) / homeImplied) * 100;
            const awayEdge = (((1 - modelHomeProb) - awayImplied) / awayImplied) * 100;

            // Flag value bets (>3% edge)
            if (homeEdge > 3) {
                valueBets.push({
                    id: game.id,
                    matchup: `${game.awayTeam} @ ${game.homeTeam}`,
                    pick: game.homeTeam,
                    side: 'home',
                    modelProb: Math.round(modelHomeProb * 100),
                    marketProb: Math.round(homeImplied * 100),
                    edge: Math.round(homeEdge * 10) / 10,
                    bestOdds: bestHomeOdds.price,
                    bestBook: bestHomeOdds.book,
                    spread: bestHomeSpread,
                    startTime: game.startTime,
                });
            }

            if (awayEdge > 3) {
                valueBets.push({
                    id: game.id,
                    matchup: `${game.awayTeam} @ ${game.homeTeam}`,
                    pick: game.awayTeam,
                    side: 'away',
                    modelProb: Math.round((1 - modelHomeProb) * 100),
                    marketProb: Math.round(awayImplied * 100),
                    edge: Math.round(awayEdge * 10) / 10,
                    bestOdds: bestAwayOdds.price,
                    bestBook: bestAwayOdds.book,
                    spread: bestAwaySpread,
                    startTime: game.startTime,
                });
            }
        });

        // Sort by edge
        valueBets.sort((a, b) => b.edge - a.edge);

        return valueBets;
    }, []);

    const runAgent = useCallback(async () => {
        console.log(`[CLIENT] Fetching data for ${sport}...`);

        setAgentStatus({
            isRunning: true,
            currentTask: `Connecting to agent (${sport})...`,
            tasksCompleted: 0,
            totalTasks: 3,
        });

        setData(d => ({ ...d, isLoading: true, error: null }));

        try {
            // Fetch comprehensive data from backend
            const response = await fetch(`${API_BASE}/api/data?sport=${sport}`);

            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }

            setAgentStatus(s => ({ ...s, tasksCompleted: 1, currentTask: 'Processing data from agent...' }));

            const serverData = await response.json();

            // Server returns maps (objects), convert to arrays where needed
            const gamesRaw = serverData.games ? Object.values(serverData.games) : [];
            const scrapedData = serverData.scrapedData || {};
            const aiAnalysis = serverData.aiAnalysis || {};

            // Attach scraped data and AI analysis to each game
            // Check both the separate map AND the game object itself
            const games = gamesRaw.map(game => ({
                ...game,
                scrapedData: scrapedData[game.id] || game.scrapedData || null,
                aiAnalysis: aiAnalysis[game.id] || game.aiAnalysis || null
            }));

            const odds = serverData.odds ? Object.values(serverData.odds) : [];
            const injuries = serverData.injuries || {};
            const news = serverData.news || [];
            const teamStats = serverData.teamStats || {};

            setAgentStatus(s => ({ ...s, tasksCompleted: 2, currentTask: 'Analyzing matchups...' }));

            // Reconstruct Game Stats Map for DeepAnalysis
            const statsMap = {};
            games.forEach(game => {
                if (game.homeTeam?.abbr && game.awayTeam?.abbr) {
                    statsMap[game.id] = {
                        home: teamStats[game.homeTeam.abbr],
                        away: teamStats[game.awayTeam.abbr]
                    };
                }
            });

            // Calculate Value Bets
            const valueBets = calculateValueBets(serverData.odds || {}, serverData.games || {}); // Pass raw objects as helper expects

            const alerts = news.filter(n => n.description && (
                n.description.includes('injury') ||
                n.description.includes('out') ||
                n.description.includes('trade')
            ));

            setData({
                games,
                odds,
                injuries,
                news,
                stats: statsMap,
                valueBets,
                alerts,
                isLoading: false,
                error: null,
                lastUpdated: new Date().toISOString()
            });

            setAgentStatus(s => ({ ...s, tasksCompleted: 3, currentTask: 'Complete!', isRunning: false }));

        } catch (error) {
            console.error('[CLIENT] Data fetch error:', error);
            setData(d => ({ ...d, isLoading: false, error: error.message }));
            setAgentStatus(s => ({ ...s, isRunning: false, currentTask: 'Offline / Server Error' }));

            // Optional: fallback to empty state or cached data
        }
    }, [sport, calculateValueBets]);

    useEffect(() => {
        runAgent();
        const interval = setInterval(runAgent, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [runAgent]);

    return {
        data,
        agentStatus,
        refreshData: runAgent,
        setSport,
        currentSport: sport
    };
}

export default useDataAgent;
