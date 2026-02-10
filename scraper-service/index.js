import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import browserAgent from './agent.js';

dotenv.config();

/**
 * SCRAPER SERVICE API
 * 
 * Dedicated microservice for handling heavy browser automation tasks.
 * Main backend calls this service to perform research and scraping.
 */

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Log middleware
app.use((req, res, next) => {
    console.log(`[SCRAPER] ${req.method} ${req.url}`);
    next();
});

// Root
app.get('/', (req, res) => {
    res.json({ service: 'Scraper Service', status: 'active', version: '1.0' });
});

// Scrape URL Endpoint
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        await browserAgent.launch();
        await browserAgent.goto(url);
        const data = await browserAgent.extractContent();

        // Close after single request (to save memory on free tier)
        // For production, keep open or pool it.
        await browserAgent.close();

        res.json({ success: true, data });
    } catch (e) {
        console.error('[SCRAPER] API Error:', e);
        try { await browserAgent.close(); } catch (err) { }
        res.status(500).json({ error: e.message });
    }
});

// Google Search Endpoint
app.post('/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
        await browserAgent.launch();
        const results = await browserAgent.googleSearch(query);

        let viewedPage = null;
        if (results.length > 0) {
            // Automatically scrape the top result for context
            await browserAgent.goto(results[0].url);
            viewedPage = await browserAgent.extractContent();
        }

        await browserAgent.close();

        res.json({
            success: true,
            data: {
                search_results: results,
                top_result_content: viewedPage
            }
        });
    } catch (e) {
        console.error('[SCRAPER] API Error:', e);
        try { await browserAgent.close(); } catch (err) { }
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`[SCRAPER] Service running on port ${PORT}`);
});
