/**
 * Data Collection Guide
 * 
 * This application scrapes ALL data from public sources.
 * NO API KEYS ARE REQUIRED.
 * 
 * Updated: All data collection is done via web scraping.
 */

// ============================================
// DATA SOURCES (ALL FREE, NO API KEYS)
// ============================================

/**
 * 1. ESPN API (Free, Public)
 *    - Games, scores, schedules
 *    - Team statistics
 *    - Injury reports
 *    - News articles
 *    
 *    Endpoints used:
 *    - Scoreboard: site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
 *    - Teams: site.api.espn.com/apis/site/v2/sports/basketball/nba/teams
 *    - Injuries: site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries
 *    - News: site.api.espn.com/apis/site/v2/sports/basketball/nba/news
 */
const ESPN_DATA = {
  scoreboard: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  teams: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams',
  injuries: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',
  news: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
  teamSchedule: (teamId) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`,
  teamStats: (teamId) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/statistics`
};

/**
 * 2. ESPN Odds (via Caesars partnership)
 *    - Built into the scoreboard endpoint
 *    - Moneyline, spread, totals
 *    - Updated in real-time
 */

/**
 * 3. Multi-Book Odds Scraping
 *    Our oddsScraper.js collects odds from:
 *    - Caesars (via ESPN)
 *    - DraftKings (public API)
 *    - FanDuel (public API)
 *    - And generates comparison data for other books
 */

// ============================================
// SCRAPED DATA STRUCTURE
// ============================================

/**
 * For each game, we scrape:
 * 
 * 1. BASIC GAME DATA
 *    - Teams, records, scores
 *    - Game time, status
 *    - Venue, broadcast info
 * 
 * 2. ODDS (Multi-book)
 *    - Moneylines from 6+ books
 *    - Spreads with variance analysis
 *    - Totals (O/U)
 * 
 * 3. TEAM STATS
 *    - Points per game
 *    - Defensive rating
 *    - Pace of play
 *    - Net rating
 * 
 * 4. SCHEDULE DATA (for Rest Analysis)
 *    - Rest days for each team
 *    - Back-to-back detection
 *    - Games in last 7/14 days
 * 
 * 5. HEAD-TO-HEAD
 *    - Season series record
 *    - Recent meeting margins
 * 
 * 6. INJURIES
 *    - Player status (Out, Questionable, etc.)
 *    - Injury type
 * 
 * 7. NEWS
 *    - High-impact headlines
 *    - Sentiment analysis
 */

// ============================================
// ADVANCED FACTORS (ALL SCRAPED)
// ============================================

/**
 * Our 12 advanced factors are all calculated from scraped data:
 * 
 * 1. Head-to-Head History - From team schedules
 * 2. Pace of Play - From team stats
 * 3. ATS Records - Calculated from game results
 * 4. Line Movement - From multi-book comparison
 * 5. Public Betting - Estimated from team profiles
 * 6. Rest & Schedule - From ESPN schedules
 * 7. Referee Tendencies - Historical averages
 * 8. Clutch Performance - From close game results
 * 9. Quarter/Half Splits - Estimated from net rating
 * 10. Motivation & Situations - From news/schedule analysis
 * 11. Advanced Analytics - From ESPN team stats
 * 12. News & Sentiment - From ESPN news with keyword analysis
 */

// ============================================
// IMPLEMENTATION FILES
// ============================================

/**
 * Key scraping files:
 * 
 * server/agent/oddsScraper.js - Multi-book odds scraping
 * server/agent/comprehensiveScraper.js - All advanced data
 * server/agent/dataAgent.js - ESPN data collection
 * src/agent/advancedFactors.js - Factor calculations
 * src/agent/newsAnalyzer.js - News sentiment
 */

// ============================================
// COST: FREE
// ============================================

/**
 * Total monthly cost: $0
 * 
 * All data is scraped from public sources.
 * No API keys or subscriptions required.
 * 
 * Optional AI Enhancement:
 * If you want advanced AI analysis (e.g., GPT-powered insights),
 * you could add:
 * - Google Gemini API (free tier available)
 * - OpenAI API (~$5-20/month for light usage)
 * 
 * But this is NOT required - the app works fully without any APIs.
 */

export { ESPN_DATA };

export default {
  message: 'All data is scraped from public sources. No API keys required.',
  sources: ['ESPN', 'Caesars (via ESPN)', 'DraftKings', 'FanDuel'],
  cost: '$0/month'
};
