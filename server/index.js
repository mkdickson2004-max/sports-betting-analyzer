import express from 'express';
import cors from 'cors';
import { runDataAgent } from './agent/dataAgent.js';
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
        // Run agent
        const result = await runDataAgent(null, sport); // Pass sport to agent

        if (result.success) {
            cache[sport] = {
                data: result.data,
                lastUpdated: now
            };
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[SERVER] Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for detailed team stats (heavy operation, cached separately or on demand)
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
