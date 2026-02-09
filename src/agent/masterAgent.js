/**
 * MASTER BETTING AGENT
 * 
 * Orchestrates all data collection, analysis, and prediction generation.
 * Runs autonomously to provide real-time betting intelligence.
 * 
 * ALL DATA IS SCRAPED - NO API KEYS REQUIRED
 */

import dataAgent from './dataAgent.js';
import eloEngine from './eloEngine.js';
import newsAnalyzer from './newsAnalyzer.js';

// Configuration - NO API KEYS NEEDED
const CONFIG = {
    // Update intervals (in milliseconds)
    ODDS_UPDATE_INTERVAL: 5 * 60 * 1000,      // 5 minutes
    GAMES_UPDATE_INTERVAL: 2 * 60 * 1000,     // 2 minutes
    NEWS_UPDATE_INTERVAL: 10 * 60 * 1000,     // 10 minutes
    INJURIES_UPDATE_INTERVAL: 30 * 60 * 1000, // 30 minutes

    // Sports to track
    SPORTS: ['basketball_nba'],

    // Minimum edge to flag as value bet
    MIN_EDGE_PERCENT: 3.0,

    // Data source
    DATA_SOURCE: 'web_scraping_no_api'
};

// Agent state
let agentState = {
    isRunning: false,
    lastRun: null,
    data: {
        odds: [],
        games: [],
        injuries: {},
        news: [],
        teamStats: [],
        eloRankings: [],
        valueBets: [],
        alerts: [],
        scrapedData: {} // Enhanced scraped data for each game
    },
    errors: [],
    stats: {
        totalRuns: 0,
        oddsUpdates: 0,
        gamesTracked: 0,
        valueBetsFound: 0
    }
};

/**
 * Calculate value bets based on current data
 */
function calculateValueBets() {
    const valueBets = [];
    const { odds, games } = agentState.data;

    if (!odds || odds.length === 0) return valueBets;

    odds.forEach(gameOdds => {
        // Get ELO prediction
        const prediction = eloEngine.predictMatchup(
            gameOdds.homeTeam,
            gameOdds.awayTeam
        );

        if (prediction.error) return;

        // Find best odds across books
        let bestHomeOdds = -999;
        let bestAwayOdds = -999;
        let bestHomeBook = null;
        let bestAwayBook = null;

        Object.entries(gameOdds.bookmakers || {}).forEach(([bookKey, book]) => {
            const h2h = book.markets?.h2h;
            if (!h2h) return;

            h2h.forEach(outcome => {
                if (outcome.name === gameOdds.homeTeam && outcome.price > bestHomeOdds) {
                    bestHomeOdds = outcome.price;
                    bestHomeBook = book.name;
                }
                if (outcome.name === gameOdds.awayTeam && outcome.price > bestAwayOdds) {
                    bestAwayOdds = outcome.price;
                    bestAwayBook = book.name;
                }
            });
        });

        // Calculate implied probabilities
        const homeImplied = americanToImplied(bestHomeOdds);
        const awayImplied = americanToImplied(bestAwayOdds);

        // Calculate edge
        const homeEdge = ((prediction.homeWinProb / 100) - homeImplied) / homeImplied * 100;
        const awayEdge = ((prediction.awayWinProb / 100) - awayImplied) / awayImplied * 100;

        // Flag value bets
        if (homeEdge >= CONFIG.MIN_EDGE_PERCENT) {
            valueBets.push({
                game: `${gameOdds.awayTeam} @ ${gameOdds.homeTeam}`,
                pick: gameOdds.homeTeam,
                side: 'home',
                modelProb: prediction.homeWinProb,
                marketProb: Math.round(homeImplied * 100),
                edge: Math.round(homeEdge * 10) / 10,
                bestOdds: bestHomeOdds,
                bestBook: bestHomeBook,
                startTime: gameOdds.startTime,
                reasons: generateReasons(prediction, 'home')
            });
        }

        if (awayEdge >= CONFIG.MIN_EDGE_PERCENT) {
            valueBets.push({
                game: `${gameOdds.awayTeam} @ ${gameOdds.homeTeam}`,
                pick: gameOdds.awayTeam,
                side: 'away',
                modelProb: prediction.awayWinProb,
                marketProb: Math.round(awayImplied * 100),
                edge: Math.round(awayEdge * 10) / 10,
                bestOdds: bestAwayOdds,
                bestBook: bestAwayBook,
                startTime: gameOdds.startTime,
                reasons: generateReasons(prediction, 'away')
            });
        }
    });

    // Sort by edge
    valueBets.sort((a, b) => b.edge - a.edge);

    return valueBets;
}

/**
 * Convert American odds to implied probability
 */
function americanToImplied(odds) {
    if (odds > 0) {
        return 100 / (odds + 100);
    }
    return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Generate betting reasons
 */
function generateReasons(prediction, side) {
    const reasons = [];
    const team = side === 'home' ? prediction.homeTeam : prediction.awayTeam;
    const opponent = side === 'home' ? prediction.awayTeam : prediction.homeTeam;
    const elo = side === 'home' ? prediction.homeElo : prediction.awayElo;
    const oppElo = side === 'home' ? prediction.awayElo : prediction.homeElo;

    // ELO advantage
    if (elo > oppElo) {
        reasons.push(`ELO advantage: ${elo} vs ${oppElo} (+${elo - oppElo})`);
    }

    // Home court
    if (side === 'home') {
        reasons.push('Home court advantage (+~3-4 points)');
    }

    // Record
    const record = side === 'home' ? prediction.homeRecord : prediction.awayRecord;
    reasons.push(`Season record: ${record}`);

    return reasons;
}

/**
 * Run a single data collection cycle
 * ALL DATA SCRAPED - NO API KEYS
 */
async function runCycle() {
    console.log('\n' + '='.repeat(60));
    console.log('[MASTER AGENT] Starting data collection cycle...');
    console.log('[MASTER AGENT] Data Source: WEB SCRAPING (No APIs)');
    console.log(`[MASTER AGENT] Time: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Fetch games/scores from ESPN (free, no API key)
        console.log('[MASTER AGENT] Step 1: Fetching games from ESPN...');
        const games = await dataAgent.fetchESPNScoreboard('nba');
        agentState.data.games = games;
        agentState.stats.gamesTracked = games.length;

        // 2. Fetch injuries from ESPN (free, no API key)
        console.log('[MASTER AGENT] Step 2: Fetching injury reports...');
        const injuries = await dataAgent.fetchInjuryReports('nba');
        agentState.data.injuries = injuries;

        // 3. Fetch and analyze news from ESPN (free, no API key)
        console.log('[MASTER AGENT] Step 3: Analyzing news...');
        const newsData = await newsAnalyzer.fetchAndAnalyzeNews();
        agentState.data.news = newsData.articles;
        agentState.data.alerts = newsData.highImpactAlerts;

        // 4. Odds are scraped on the server side
        // The frontend will get odds from the /api/data endpoint
        console.log('[MASTER AGENT] Step 4: Odds scraped by server...');
        agentState.stats.oddsUpdates++;

        // 5. Calculate value bets
        console.log('[MASTER AGENT] Step 5: Calculating value bets...');
        agentState.data.valueBets = calculateValueBets();
        agentState.stats.valueBetsFound = agentState.data.valueBets.length;

        // 6. Get ELO rankings
        agentState.data.eloRankings = eloEngine.getEloRankings();

        // Update state
        agentState.lastRun = new Date().toISOString();
        agentState.stats.totalRuns++;

        console.log('\n' + '='.repeat(60));
        console.log('[MASTER AGENT] ✓ Cycle complete!');
        console.log(`[MASTER AGENT] Games: ${games.length}`);
        console.log(`[MASTER AGENT] Value bets found: ${agentState.data.valueBets.length}`);
        console.log(`[MASTER AGENT] High-impact alerts: ${agentState.data.alerts.length}`);
        console.log('[MASTER AGENT] Data Source: 100% Web Scraping');
        console.log('='.repeat(60) + '\n');

        return agentState.data;
    } catch (error) {
        console.error('[MASTER AGENT] Cycle error:', error);
        agentState.errors.push({
            time: new Date().toISOString(),
            error: error.message
        });
        return null;
    }
}

/**
 * Get current agent state and data
 */
export function getAgentData() {
    return {
        ...agentState,
        isLive: true,
        lastUpdated: agentState.lastRun,
        dataSource: CONFIG.DATA_SOURCE
    };
}

/**
 * Start the agent (single run for now)
 */
export async function startAgent() {
    console.log('[MASTER AGENT] 🚀 Agent starting...');
    console.log('[MASTER AGENT] 📊 Data Source: Web Scraping (NO API keys required)');
    agentState.isRunning = true;

    // Run initial cycle
    await runCycle();

    return getAgentData();
}

/**
 * Export for use in React
 */
export default {
    startAgent,
    getAgentData,
    runCycle,
    CONFIG
};
