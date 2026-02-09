import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchESPNScoreboard, fetchInjuryReports, fetchSportsNews, fetchTeamStats, dataStore } from './agent/dataAgent.js';
import { scrapeAllOdds } from './agent/oddsScraper.js';
import { fetchDetailedTeamStats } from './agent/playerStatsScraper.js';
import { scrapeAllGameData, scrapeAdvancedStats, scrapeTeamSchedule, calculateRestDays } from './agent/comprehensiveScraper.js';
import { runAgentAnalysis, getAgentStatus } from './agent/aiAgent.js';
import { isLLMConfigured } from './agent/llmService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory cache to prevent excessive scraping
let cache = {
    nba: { data: null, lastUpdated: 0 },
    nfl: { data: null, lastUpdated: 0 }
};

// Cache for scraped data (longer duration)
let scrapedDataCache = {
    nba: { data: null, lastUpdated: 0 },
    nfl: { data: null, lastUpdated: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SCRAPED_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for heavy scraping

app.get('/api/data', async (req, res) => {
    const sport = req.query.sport || 'nba';
    const now = Date.now();

    // Check cache
    if (cache[sport] && cache[sport].data && (now - cache[sport].lastUpdated < CACHE_DURATION)) {
        console.log(`[SERVER] Serving cached data for ${sport}`);
        return res.json(cache[sport].data);
    }

    console.log(`[SERVER] Fetching fresh data for ${sport}`);
    try {
        // Step 1: Fetch core data from ESPN in parallel
        const [games, injuries, news] = await Promise.all([
            fetchESPNScoreboard(sport),
            fetchInjuryReports(sport),
            fetchSportsNews(sport)
        ]);

        // Step 2: Scrape odds using the multi-book scraper (NO API KEY REQUIRED)
        console.log('[SERVER] Scraping odds...');
        const oddsResult = await scrapeAllOdds(sport);
        const odds = oddsResult.data || [];

        // Step 3: Fetch team stats
        const teamStats = await fetchTeamStats(sport);

        // Step 4: Scrape advanced data for all teams in today's games
        console.log('[SERVER] Scraping comprehensive data for all games...');
        const enhancedData = {};

        // Scrape data for each game
        for (const game of games.slice(0, 10)) { // Limit to prevent timeout
            const homeAbbr = game.homeTeam?.abbr;
            const awayAbbr = game.awayTeam?.abbr;

            if (homeAbbr && awayAbbr) {
                try {
                    // Check scraped data cache
                    const cacheKey = `${homeAbbr}_${awayAbbr}`;
                    if (!scrapedDataCache[sport].data) {
                        scrapedDataCache[sport].data = {};
                    }

                    if (scrapedDataCache[sport].data[cacheKey] &&
                        now - scrapedDataCache[sport].lastUpdated < SCRAPED_CACHE_DURATION) {
                        enhancedData[game.id] = scrapedDataCache[sport].data[cacheKey];
                    } else {
                        const matchingOdds = odds.find(o =>
                            o.home_team?.includes(homeAbbr) ||
                            o.away_team?.includes(awayAbbr)
                        );

                        const gameScrapedData = await scrapeAllGameData(
                            game,
                            matchingOdds,
                            injuries[homeAbbr],
                            news
                        );

                        if (gameScrapedData) {
                            enhancedData[game.id] = gameScrapedData;
                            scrapedDataCache[sport].data[cacheKey] = gameScrapedData;
                        }
                    }
                } catch (e) {
                    console.error(`[SERVER] Error scraping data for ${homeAbbr} vs ${awayAbbr}:`, e.message);
                }
            }
        }

        scrapedDataCache[sport].lastUpdated = now;

        // Step 5: Run AI Agent analysis (if LLM configured)
        const aiAnalysis = {};
        if (isLLMConfigured()) {
            console.log('[SERVER] ℹ AI Agent ready for on-demand analysis (skipping auto-start to save quota)');
        } else {
            console.log('[SERVER] ℹ No GEMINI_API_KEY set. AI agent running in rule-based mode.');
        }

        // Step 6: Construct response object
        const responseData = {
            games: games.reduce((acc, g) => { acc[g.id] = g; return acc; }, {}),
            odds: odds.reduce((acc, o) => { acc[o.id] = o; return acc; }, {}),
            injuries: dataStore.injuries ? Object.fromEntries(dataStore.injuries) : injuries,
            news: dataStore.news || news,
            teamStats: dataStore.teamStats ? Object.fromEntries(dataStore.teamStats) : {},
            eloRatings: dataStore.eloRatings ? Object.fromEntries(dataStore.eloRatings) : {},
            scrapedData: enhancedData,
            aiAnalysis: aiAnalysis,
            agentStatus: getAgentStatus(),
            lastUpdated: {
                games: new Date().toISOString(),
                odds: new Date().toISOString(),
                scrapedData: new Date().toISOString(),
                aiAnalysis: isLLMConfigured() ? new Date().toISOString() : null
            },
            oddsSource: oddsResult.source,
            booksIncluded: oddsResult.booksIncluded,
            dataSource: isLLMConfigured() ? 'ai_agent_with_scraping' : 'web_scraping_no_api'
        };

        // Update cache
        cache[sport] = {
            data: responseData,
            lastUpdated: now
        };

        console.log(`[SERVER] Returning ${games.length} games, ${odds.length} odds markets, ${Object.keys(enhancedData).length} games with enhanced data`);
        res.json(responseData);

    } catch (error) {
        console.error('[SERVER] Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Endpoint for detailed team stats
app.get('/api/stats/:sport/:teamId', async (req, res) => {
    const { sport, teamId } = req.params;
    try {
        const stats = await fetchDetailedTeamStats(sport, teamId);
        if (stats) {
            res.json(stats);
        } else {
            res.status(404).json({ error: 'Stats not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint for scraped game data
app.get('/api/scraped/:sport/:gameId', async (req, res) => {
    const { sport, gameId } = req.params;

    try {
        // Get game from cache
        const cachedData = cache[sport]?.data;
        if (cachedData?.scrapedData?.[gameId]) {
            return res.json(cachedData.scrapedData[gameId]);
        }

        // If not in cache, fetch
        const game = cachedData?.games?.[gameId];
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const scrapedData = await scrapeAllGameData(game, null, null, []);
        res.json(scrapedData || { error: 'Could not scrape data' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint for team schedule (rest days calculation)
app.get('/api/schedule/:sport/:teamAbbr', async (req, res) => {
    const { sport, teamAbbr } = req.params;

    try {
        const schedule = await scrapeTeamSchedule(teamAbbr, sport);
        if (schedule) {
            res.json(schedule);
        } else {
            res.status(404).json({ error: 'Schedule not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint for advanced stats
app.get('/api/advanced-stats/:sport/:teamAbbr', async (req, res) => {
    const { sport, teamAbbr } = req.params;

    try {
        const stats = await scrapeAdvancedStats(teamAbbr, sport);
        if (stats) {
            res.json(stats);
        } else {
            res.status(404).json({ error: 'Stats not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Agent status endpoint
app.get('/api/agent/status', (req, res) => {
    res.json(getAgentStatus());
});

// On-demand AI analysis for a specific game
app.get('/api/agent/analyze/:gameId', async (req, res) => {
    const { gameId } = req.params;
    const sport = req.query.sport || 'nba';

    try {
        const cachedData = cache[sport]?.data;
        const game = cachedData?.games?.[gameId];

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const result = await runAgentAnalysis(
            game,
            cachedData?.scrapedData?.[gameId] || {},
            cachedData?.odds?.[Object.keys(cachedData.odds).find(k =>
                cachedData.odds[k].home_team?.includes(game.homeTeam?.abbr)
            )] || null,
            cachedData?.injuries || {},
            cachedData?.news || []
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        llmConfigured: isLLMConfigured(),
        agentMode: isLLMConfigured() ? 'ai-powered' : 'rule-based',
        dataSource: isLLMConfigured() ? 'ai_agent_with_scraping' : 'web_scraping_only',
        message: isLLMConfigured()
            ? 'AI Agent active with Gemini LLM. Enhanced analysis enabled.'
            : 'Running in rule-based mode. Set GEMINI_API_KEY for AI-powered analysis.'
    });
});


// Root route for API verification
app.get('/', (req, res) => {
    res.json({
        message: "Sports Betting Analyzer API is Running 🚀",
        status: "active",
        endpoints: {
            data: "/api/data?sport=nba",
            health: "/health",
            status: "/api/agent/status"
        },
        info: "This is the backend API. Please use the frontend application to view the dashboard."
    });
});

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);
    if (isLLMConfigured()) {
        console.log('🤖 AI Agent: ACTIVE (Gemini LLM connected)');
        console.log('   Model: gemini-2.0-flash (free tier)');
    } else {
        console.log('ℹ  AI Agent: Rule-based mode (no LLM)');
        console.log('   Set GEMINI_API_KEY env variable to enable AI-powered analysis');
        console.log('   Get your free key at: https://aistudio.google.com/apikey');
    }
});
