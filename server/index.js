import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchESPNScoreboard, fetchInjuryReports, fetchSportsNews, fetchTeamStats, dataStore, runDataAgent } from './agent/dataAgent.js';
import { scrapeAllOdds } from './agent/oddsScraper.js';
import browserAgent from './agent/browserAgent.js';
import { isLLMConfigured } from './agent/llmService.js';
import { fetchDetailedTeamStats } from './agent/playerStatsScraper.js';
import { scrapeAllGameData, scrapeAdvancedStats, scrapeTeamSchedule } from './agent/comprehensiveScraper.js';
import { runAgentAnalysis, getAgentStatus } from './agent/aiAgent.js';
import deepAnalyzer from './agent/deepAnalyzer.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (imports)

// Serve Static Frontend (Production)
app.use(express.static(path.join(__dirname, '../dist')));

// Cache context
let isProcessing = false;
let lastUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 mins

// ---------------------------------------------------------
// MAIN DATA ENDPOINT (Powered by runDataAgent)
// ---------------------------------------------------------
app.get('/api/data', async (req, res) => {
    const now = Date.now();

    // Check if we have recent data and are not currently processing
    if (dataStore.games.size > 0 && (now - lastUpdate < CACHE_DURATION) && !isProcessing) {
        console.log('[SERVER] Serving cached data');
        return res.json(dataStore.getAll());
    }

    if (isProcessing) {
        console.warn('[SERVER] Data update processing... serving potentially stale data');
        return res.json(dataStore.getAll());
    }

    try {
        isProcessing = true;
        console.log('[SERVER] Fetching fresh data via runDataAgent...');

        // Execute the full pipeline (Roster, Schedule, Social, AI)
        const result = await runDataAgent();

        isProcessing = false;
        lastUpdate = Date.now();

        if (result.success) {
            res.json(result.data);
        } else {
            console.error('[SERVER] runDataAgent failed:', result.error);
            // Serve stale data if available
            if (dataStore.games.size > 0) return res.json(dataStore.getAll());
            res.status(500).json({ error: result.error });
        }
    } catch (e) {
        isProcessing = false;
        console.error('[SERVER] API Error:', e);
        if (dataStore.games.size > 0) return res.json(dataStore.getAll());
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------
// BROWSER AGENT: Autonomous Research
// ---------------------------------------------------------
app.get('/api/research', async (req, res) => {
    const { query, url } = req.query;

    if (!query && !url) {
        return res.status(400).json({ error: 'Provide query or url' });
    }

    try {
        await browserAgent.launch();

        let result = {};
        if (url) {
            await browserAgent.goto(url);
            result = await browserAgent.extractContent();
        } else if (query) {
            const links = await browserAgent.googleSearch(query);
            // Visit first link automatically
            if (links.length > 0) {
                await browserAgent.goto(links[0].url);
                const content = await browserAgent.extractContent();
                result = {
                    search_results: links,
                    viewed_page: content
                };
            } else {
                result = { error: 'No results found' };
            }
        }

        await browserAgent.close();
        res.json({ success: true, data: result });
    } catch (e) {
        console.error('[BROWSER] Error:', e.message);
        try { await browserAgent.close(); } catch (err) { }
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------
// SUPPORT ENDPOINTS
// ---------------------------------------------------------

// Endpoint for detailed team stats
app.get('/api/stats/:sport/:teamId', async (req, res) => {
    const { sport, teamId } = req.params;
    try {
        const stats = await fetchDetailedTeamStats(sport, teamId);
        if (stats) res.json(stats);
        else res.status(404).json({ error: 'Stats not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for team schedule
app.get('/api/schedule/:sport/:teamAbbr', async (req, res) => {
    const { sport, teamAbbr } = req.params;
    try {
        const schedule = await scrapeTeamSchedule(teamAbbr, sport);
        if (schedule) res.json(schedule);
        else res.status(404).json({ error: 'Schedule not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for advanced stats
app.get('/api/advanced-stats/:sport/:teamAbbr', async (req, res) => {
    const { sport, teamAbbr } = req.params;
    try {
        const stats = await scrapeAdvancedStats(teamAbbr, sport);
        if (stats) res.json(stats);
        else res.status(404).json({ error: 'Stats not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Agent status endpoint
app.get('/api/agent/status', (req, res) => {
    res.json(getAgentStatus());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        llmConfigured: isLLMConfigured(),
        agentMode: isLLMConfigured() ? 'ai-powered' : 'rule-based',
        dataSource: 'data_agent_pipeline_v2'
    });
});

// API Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        message: "Sports Betting Analyzer API is Running 🚀",
        status: "active",
        endpoints: {
            data: "/api/data?sport=nba",
            research: "/api/research?query=search_term",
            health: "/health",
        },
        info: "Frontend should be served at root /"
    });
});

// Handle SPA Routing (Send index.html for non-API routes)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (isLLMConfigured()) {
        console.log('🤖 AI Agent: ACTIVE (Gemini LLM connected)');
        console.log('   Pipeline: dataAgent -> BrowserAgent -> AI Analysis');
    } else {
        console.log('ℹ  AI Agent: Rule-based mode (no LLM)');
    }
});
