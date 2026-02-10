# Scraper Service (Microservice)

This is a dedicated microservice for handling Browser Automation tasks using Puppeteer.
It is separated from the main backend to improve performance and stability.

## Capabilities
- **Scrape URL:** Extracts clean text from any webpage (rendering JS).
- **Google Search:** Performs searches and returns results.
- **Stealth:** Uses realistic headers to bypass basic bot detection.

## Setup

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the service:
   ```bash
   npm start
   ```
   Runs on `http://localhost:3002`.

### Deployment (Render.com)
1. Create a new **Web Service**.
2. Connect your repository.
3. Set **Root Directory** to `scraper-service`.
4. Build Command: `npm install`
5. Start Command: `node index.js`
6. (Optional) Add Environment Variable:
   - `PUPPETEER_CACHE_DIR` = `/opt/render/project/puppeteer` (for caching)

## API Endpoints

### POST /scrape
Scrapes a specific URL.
```json
{ "url": "https://espn.com" }
```

### POST /search
Performs a Google search.
```json
{ "query": "LeBron James injury update" }
```
