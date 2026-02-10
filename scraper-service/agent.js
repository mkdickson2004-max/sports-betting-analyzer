/**
 * BROWSER AGENT (Microservice Edition)
 * 
 * Provides autonomous web surfing capabilities via Puppeteer.
 * This runs as a standalone service to offload browser automation from the main API.
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
            headless: 'new', // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Docker/Render/Heroku
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions'
            ]
        });

        // Create page once
        this.page = await this.browser.newPage();

        // Stealth: Set User-Agent
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Optimization: Block images/fonts (save bandwidth/CPU)
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
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
        if (!this.browser) await this.launch();

        console.log(`[BROWSER] Navigating to: ${url}`);
        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // Wait a small buffer for dynamic content
            await new Promise(r => setTimeout(r, 2000));
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
        $('script, style, nav, footer, iframe, ads, .ads, .sidebar, header, .menu, .cookie-banner').remove();

        // Extract meaningful text
        const title = $('title').text().trim();
        // Get text from body, clean excessive whitespace
        let bodyText = $('body').text().replace(/\s+/g, ' ').trim();

        // Truncate to avoid context window overflow (GPT limit ~128k but let's be safe)
        if (bodyText.length > 20000) {
            bodyText = bodyText.substring(0, 20000) + '... [TRUNCATED]';
        }

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
        if (!this.browser) await this.launch();

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        console.log(`[BROWSER] Searching Google: ${query}`);

        await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // Extract search result links
        // Selector logic for Google results (div.g > div > div > a)
        const links = await this.page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('div.g');

            items.forEach(item => {
                const link = item.querySelector('a');
                const title = item.querySelector('h3');
                if (link && title && link.href && !link.href.includes('google.com/search')) {
                    results.push({
                        title: title.innerText,
                        url: link.href
                    });
                }
            });
            return results.slice(0, 5); // Return top 5
        });

        return links;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('[BROWSER] Service stopped.');
        }
    }
}

export default new BrowserAgent();
