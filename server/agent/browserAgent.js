/**
 * BROWSER AGENT (Client / Proxy)
 * 
 * This module was refactored to be a LIGHTWEIGHT CLIENT.
 * Instead of running Puppeteer (heavy), it calls the dedicated
 * Scraper Microservice API.
 * 
 * To use: Ensure the scraper-service is running on port 3002 (or SCRAPER_URL).
 */

import fetch from 'node-fetch';

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3002'; // Default to local

class BrowserAgentClient {
    constructor() {
        this.isActive = false;
    }

    async launch() {
        // No-op for client, just check if service is up?
        try {
            const res = await fetch(`${SCRAPER_URL}/`);
            if (res.ok) {
                console.log('[BROWSER CLIENT] Connected to Scraper Service');
                this.isActive = true;
            } else {
                console.warn('[BROWSER CLIENT] Scraper Service Unreachable');
            }
        } catch (e) {
            console.warn('[BROWSER CLIENT] Scraper Service Offline:', e.message);
        }
    }

    async goto(url) {
        // No-op, handled by service per request
        this.currentUrl = url;
        return true;
    }

    async extractContent() {
        if (!this.currentUrl) return { error: 'No URL set' };

        console.log(`[BROWSER CLIENT] Requesting scrape for: ${this.currentUrl}`);
        try {
            const response = await fetch(`${SCRAPER_URL}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: this.currentUrl })
            });

            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error('[BROWSER CLIENT] Scrape failed:', e.message);
            return { error: 'Service Unavailable' };
        }
    }

    async googleSearch(query) {
        console.log(`[BROWSER CLIENT] Requesting search for: ${query}`);
        try {
            const response = await fetch(`${SCRAPER_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await response.json();
            if (data.success) {
                // Return search results array
                return data.data.search_results;
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error('[BROWSER CLIENT] Search failed:', e.message);
            return [];
        }
    }

    async close() {
        // No-op
    }
}

export default new BrowserAgentClient();
