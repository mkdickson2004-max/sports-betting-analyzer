import express from 'express';
import cors from 'cors';
import { fetchESPNScoreboard, fetchInjuryReports, fetchSportsNews, fetchTeamStats, dataStore } from './agent/dataAgent.js';
import { scrapeAllOdds } from './agent/oddsScraper.js';
import { fetchDetailedTeamStats } from './agent/playerStatsScraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory cache to prevent excessive scraping
let cache = {
    nba: { data: null, lastUpdated: 0 },
    nfl: { data: null, lastUpdated: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

        // Step 4: Construct response object
        const responseData = {
            games: games.reduce((acc, g) => { acc[g.id] = g; return acc; }, {}),
            odds: odds.reduce((acc, o) => { acc[o.id] = o; return acc; }, {}),
            injuries: dataStore.injuries ? Object.fromEntries(dataStore.injuries) : injuries,
            news: dataStore.news || news,
            teamStats: dataStore.teamStats ? Object.fromEntries(dataStore.teamStats) : {},
            eloRatings: dataStore.eloRatings ? Object.fromEntries(dataStore.eloRatings) : {},
            lastUpdated: {
                games: new Date().toISOString(),
                odds: new Date().toISOString()
            },
            oddsSource: oddsResult.source,
            booksIncluded: oddsResult.booksIncluded
        };

        // Update cache
        cache[sport] = {
            data: responseData,
            lastUpdated: now
        };

        console.log(`[SERVER] Returning ${games.length} games, ${odds.length} odds markets`);
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
