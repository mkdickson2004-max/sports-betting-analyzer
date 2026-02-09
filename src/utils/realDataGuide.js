/**
 * Real Data API Integration Guide
 * 
 * This file outlines how to connect to real sports betting APIs
 * to replace the mock data with live, accurate information.
 */

// ============================================
// RECOMMENDED APIs FOR PRODUCTION
// ============================================

/**
 * 1. THE ODDS API (https://the-odds-api.com)
 *    - FREE tier: 500 requests/month
 *    - Covers: NFL, NBA, MLB, NHL, NCAAB, NCAAF, Soccer
 *    - Data: Live odds from 15+ sportsbooks
 *    - Best for: Odds comparison engine
 */
const ODDS_API_EXAMPLE = `
  // Fetch live odds
  const response = await fetch(
    'https://api.the-odds-api.com/v4/sports/basketball_nba/odds?' +
    'apiKey=YOUR_API_KEY&regions=us&markets=h2h,spreads,totals'
  );
  const games = await response.json();
  // Returns real odds from DraftKings, FanDuel, BetMGM, etc.
`;

/**
 * 2. SPORTSDATA.IO (https://sportsdata.io)
 *    - Paid plans starting ~$10/month for hobbyist
 *    - Coverage: All major sports + fantasy
 *    - Data: Schedules, scores, player stats, advanced metrics
 *    - Best for: Historical data, ELO calculations, player injuries
 */
const SPORTSDATA_EXAMPLE = `
  // Fetch team stats
  const response = await fetch(
    'https://api.sportsdata.io/v3/nba/stats/json/TeamSeasonStats/2026?' +
    'key=YOUR_API_KEY'
  );
  // Returns: Points, rebounds, assists, defensive rating, etc.
`;

/**
 * 3. ESPN API (Unofficial)
 *    - FREE (unofficial, may change)
 *    - Data: Schedules, scores, basic stats
 *    - Best for: Quick game information
 */
const ESPN_EXAMPLE = `
  // Fetch today's NBA games
  const response = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
  );
  // Returns game times, scores, team info
`;

/**
 * 4. NBA STATS API (stats.nba.com)
 *    - FREE but rate-limited
 *    - Data: Official NBA statistics, advanced metrics
 *    - Best for: Net rating, pace, clutch stats
 *    - Note: Requires specific headers to access
 */
const NBA_STATS_EXAMPLE = `
  // Fetch team advanced stats
  const response = await fetch(
    'https://stats.nba.com/stats/leaguedashteamstats?' +
    'Season=2025-26&SeasonType=Regular+Season&MeasureType=Advanced',
    { headers: { 'Referer': 'https://www.nba.com/' } }
  );
  // Returns: OffRtg, DefRtg, NetRtg, Pace, etc.
`;

/**
 * 5. BALLDONTLIE (https://www.balldontlie.io)
 *    - FREE tier: 60 requests/minute
 *    - Data: NBA games, players, stats (2015+)
 *    - Best for: Historical game data for model training
 */
const BALLDONTLIE_EXAMPLE = `
  // Fetch historical games
  const response = await fetch(
    'https://api.balldontlie.io/v1/games?seasons[]=2025&team_ids[]=14'
  );
  // Returns historical game results for Lakers (team_id=14)
`;


// ============================================
// RECOMMENDED DATA PIPELINE
// ============================================

/**
 * For accurate predictions, you'd want:
 * 
 * 1. HISTORICAL DEPTH
 *    - 3-5 years of game results for ELO training
 *    - Season-long stats for current year
 *    - Last 10-20 games for recent form
 * 
 * 2. UPDATE FREQUENCY
 *    - Odds: Every 5-15 minutes (lines move!)
 *    - Injuries: Every 1-2 hours
 *    - Stats/ELO: Daily after games complete
 * 
 * 3. MODEL TRAINING DATA
 *    Historical features for each game:
 *    - Home team ELO at game time
 *    - Away team ELO at game time
 *    - Rest days for each team
 *    - Injuries (star player out = ~3-5 point swing)
 *    - Back-to-back status
 *    - Travel distance
 *    - Season point in schedule (early vs playoff push)
 */

// ============================================
// SAMPLE IMPLEMENTATION
// ============================================

export async function fetchRealOdds(sport = 'basketball_nba') {
    const API_KEY = process.env.ODDS_API_KEY;
    const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds?` +
        `apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    );

    if (!response.ok) {
        throw new Error(`Odds API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our app's format
    return data.map(game => ({
        id: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        startTime: game.commence_time,
        odds: transformBookmakerOdds(game.bookmakers)
    }));
}

function transformBookmakerOdds(bookmakers) {
    const result = { home: {}, away: {} };

    bookmakers.forEach(book => {
        const bookId = book.key; // 'draftkings', 'fanduel', etc.

        book.markets.forEach(market => {
            if (market.key === 'h2h') {
                // Moneyline
                market.outcomes.forEach(outcome => {
                    const side = outcome.name === book.home_team ? 'home' : 'away';
                    if (!result[side][bookId]) result[side][bookId] = {};
                    result[side][bookId].moneyline = outcome.price;
                });
            }
            // Add spreads, totals similarly...
        });
    });

    return result;
}

// ============================================
// COST ESTIMATE FOR PRODUCTION
// ============================================

/**
 * Monthly API costs for a hobbyist/small project:
 * 
 * The Odds API (Starter): $0/month (500 requests)
 * SportsData.io (Hobbyist): $10/month
 * 
 * Total: ~$10/month for real data
 * 
 * For a full production app:
 * The Odds API (Pro): $79/month (10k requests)
 * SportsData.io (Developer): $25/month
 * 
 * Total: ~$100/month
 */
