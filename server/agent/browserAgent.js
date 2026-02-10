/**
 * BROWSER AGENT
 * 
 * Provides autonomous web surfing capabilities to the AI system.
 * Uses Puppeteer to navigate, render JavaScript-heavy sites, and extract content.
 * 
 * Capabilities:
 * - Render dynamic modern web apps (SPA)
 * - Bypass basic bot detection (via stealth headers)
 * - extract relevant text for LLM analysis
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

class BrowserAgent {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Launch the browser instance
     */
    async launch() {
        if (this.browser) return;

        console.log('[BROWSER] Launching headless browser...');
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Memory optimization
                '--disable-gpu'
            ]
        });

        this.page = await this.browser.newPage();

        // Stealth: Set User-Agent
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Optimization: Block images/fonts (save bandwidth)
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    /**
     * Navigate to a URL and wait for meaningful content
     */
    async goto(url) {
        if (!this.page) await this.launch();

        console.log(`[BROWSER] Navigating to: ${url}`);
        try {
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            return true;
        } catch (e) {
            console.error(`[BROWSER] Navigation failed: ${e.message}`);
            return false;
        }
    }

    /**
     * Extract clean text content from the current page
     */
    async extractContent() {
        if (!this.page) return '';

        const html = await this.page.content();
        const $ = cheerio.load(html);

        // Remove clutter
        $('script, style, nav, footer, iframe, ads, .ads, .sidebar').remove();

        // Extract meaningful text
        const title = $('title').text().trim();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000); // Limit context size

        return {
            title,
            url: this.page.url(),
            content: bodyText
        };
    }

    /**
     * Perform a Google Search and return top results
     */
    async googleSearch(query) {
        await this.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

        // Extract search result links
        const links = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('div.g a'))
                .map(a => ({ title: a.innerText, url: a.href }))
                .filter(item => item.url && item.title)
                .slice(0, 5); // Top 5 results
        });

        return links;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('[BROWSER] Closed.');
        }
    }
}

export default new BrowserAgent();
