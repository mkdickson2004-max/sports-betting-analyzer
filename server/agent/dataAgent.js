/**
 * SPORTS DATA AGENT
 * 
 * Autonomous agent that scrapes, aggregates, and analyzes sports data
 * from multiple sources across the internet to provide accurate betting intelligence.
 */

// Data source endpoints
const DATA_SOURCES = {
    // Live Odds
    ODDS_API: 'https://api.the-odds-api.com/v4/sports',

    // Scores & Schedules
    ESPN_NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
    ESPN_NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
    ESPN_MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb',
    ESPN_NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl',

    // News & Updates
    ESPN_NEWS: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',

    // Team Stats (NBA official)
    NBA_STATS: 'https://stats.nba.com/stats',

    // Player/Team Data
    BALLDONTLIE: 'https://api.balldontlie.io/v1',
};

// Store for aggregated data
class SportsDataStore {
    constructor() {
        this.odds = new Map();
        this.games = new Map();
        this.injuries = new Map();
        this.news = [];
        this.teamStats = new Map();
        this.eloRatings = new Map();
        this.lastUpdated = {};
    }

    getAll() {
        return {
            odds: Object.fromEntries(this.odds),
            games: Object.fromEntries(this.games),
            injuries: Object.fromEntries(this.injuries),
            news: this.news,
            teamStats: Object.fromEntries(this.teamStats),
            eloRatings: Object.fromEntries(this.eloRatings),
            lastUpdated: this.lastUpdated
        };
    }
}

export const dataStore = new SportsDataStore();

/**
 * AGENT: Fetch live odds from The Odds API
 */
export async function fetchLiveOdds(sport = 'basketball_nba', apiKey) {
    console.log(`[AGENT] Fetching live odds for ${sport}...`);

    try {
        const url = `${DATA_SOURCES.ODDS_API}/${sport}/odds?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Odds API error: ${response.status}`);
        }

        const data = await response.json();

        // Process and store odds
        data.forEach(game => {
            const gameOdds = {
                id: game.id,
                sport: game.sport_key,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                startTime: game.commence_time,
                bookmakers: {}
            };

            game.bookmakers?.forEach(book => {
                gameOdds.bookmakers[book.key] = {
                    name: book.title,
                    markets: {}
                };

                book.markets?.forEach(market => {
                    gameOdds.bookmakers[book.key].markets[market.key] = market.outcomes.map(o => ({
                        name: o.name,
                        price: o.price,
                        point: o.point
                    }));
                });
            });

            dataStore.odds.set(game.id, gameOdds);
        });

        dataStore.lastUpdated.odds = new Date().toISOString();
        console.log(`[AGENT] ✓ Fetched odds for ${data.length} games`);

        return data;
    } catch (error) {
        console.error('[AGENT] Odds fetch error:', error.message);
        return null;
    }
}

/**
 * AGENT: Fetch today's games and scores from ESPN
 */
export async function fetchESPNScoreboard(sport = 'nba') {
    console.log(`[AGENT] Fetching ${sport.toUpperCase()} scoreboard...`);

    const endpoints = {
        nba: DATA_SOURCES.ESPN_NBA,
        nfl: DATA_SOURCES.ESPN_NFL,
        mlb: DATA_SOURCES.ESPN_MLB,
        nhl: DATA_SOURCES.ESPN_NHL
    };

    try {
        const response = await fetch(`${endpoints[sport]}/scoreboard`);
        const data = await response.json();

        const games = data.events?.map(event => ({
            id: event.id,
            name: event.name,
            shortName: event.shortName,
            date: event.date,
            status: event.status?.type?.description,
            venue: event.competitions?.[0]?.venue?.fullName,
            broadcast: event.competitions?.[0]?.broadcasts?.[0]?.names?.[0],
            homeTeam: {
                id: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.id,
                name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName,
                abbr: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.abbreviation,
                score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.score,
                record: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.records?.[0]?.summary
            },
            awayTeam: {
                id: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.id,
                name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName,
                abbr: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.abbreviation,
                score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.score,
                record: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.records?.[0]?.summary
            }
        })) || [];

        games.forEach(game => {
            dataStore.games.set(game.id, game);
        });

        dataStore.lastUpdated.games = new Date().toISOString();
        console.log(`[AGENT] ✓ Fetched ${games.length} games from ESPN`);

        return games;
    } catch (error) {
        console.error('[AGENT] ESPN fetch error:', error.message);
        return [];
    }
}

/**
 * AGENT: Fetch team stats from ESPN
 */
export async function fetchTeamStats(sport = 'nba') {
    console.log(`[AGENT] Fetching ${sport.toUpperCase()} team stats...`);

    const endpoints = {
        nba: DATA_SOURCES.ESPN_NBA,
        nfl: DATA_SOURCES.ESPN_NFL
    };

    try {
        const response = await fetch(`${endpoints[sport]}/teams`);
        const data = await response.json();

        const teams = data.sports?.[0]?.leagues?.[0]?.teams?.map(t => ({
            id: t.team.id,
            name: t.team.displayName,
            abbr: t.team.abbreviation,
            location: t.team.location,
            color: t.team.color,
            logo: t.team.logos?.[0]?.href
        })) || [];

        // Fetch detailed stats for each team
        for (const team of teams) {
            try {
                const statsResponse = await fetch(`${endpoints[sport]}/teams/${team.id}/statistics`);
                const statsData = await statsResponse.json();

                team.stats = statsData.results?.stats?.categories?.reduce((acc, cat) => {
                    cat.stats?.forEach(stat => {
                        acc[stat.name] = stat.value;
                    });
                    return acc;
                }, {}) || {};

                dataStore.teamStats.set(team.abbr, team);
            } catch (e) {
                // Individual team stats may fail, continue
            }
        }

        dataStore.lastUpdated.teamStats = new Date().toISOString();
        console.log(`[AGENT] ✓ Fetched stats for ${teams.length} teams`);

        return teams;
    } catch (error) {
        console.error('[AGENT] Team stats fetch error:', error.message);
        return [];
    }
}

/**
 * AGENT: Fetch latest news and headlines
 */
export async function fetchSportsNews(sport = 'nba') {
    console.log(`[AGENT] Fetching ${sport.toUpperCase()} news...`);

    try {
        const response = await fetch(DATA_SOURCES.ESPN_NEWS);
        const data = await response.json();

        const articles = data.articles?.map(article => ({
            id: article.dataSourceIdentifier,
            headline: article.headline,
            description: article.description,
            published: article.published,
            link: article.links?.web?.href,
            images: article.images?.map(img => img.url),
            categories: article.categories?.map(c => c.description),
            // Extract team mentions
            teams: extractTeamMentions(article.headline + ' ' + article.description)
        })) || [];

        dataStore.news = articles;
        dataStore.lastUpdated.news = new Date().toISOString();
        console.log(`[AGENT] ✓ Fetched ${articles.length} news articles`);

        return articles;
    } catch (error) {
        console.error('[AGENT] News fetch error:', error.message);
        return [];
    }
}

/**
 * AGENT: Scrape injury reports from ESPN
 */
export async function fetchInjuryReports(sport = 'nba') {
    console.log(`[AGENT] Fetching ${sport.toUpperCase()} injuries...`);

    try {
        // ESPN injuries endpoint
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries`);
        const data = await response.json();

        const injuries = {};

        data.injuries?.forEach(teamInjury => {
            const teamName = teamInjury.team?.displayName;
            const teamAbbr = teamInjury.team?.abbreviation;

            injuries[teamAbbr] = {
                team: teamName,
                players: teamInjury.injuries?.map(inj => ({
                    name: inj.athlete?.displayName,
                    position: inj.athlete?.position?.abbreviation,
                    status: inj.status,
                    injury: inj.type?.text || inj.details?.type,
                    date: inj.date,
                    shortComment: inj.shortComment,
                    longComment: inj.longComment
                })) || []
            };

            dataStore.injuries.set(teamAbbr, injuries[teamAbbr]);
        });

        dataStore.lastUpdated.injuries = new Date().toISOString();
        console.log(`[AGENT] ✓ Fetched injuries for ${Object.keys(injuries).length} teams`);

        return injuries;
    } catch (error) {
        console.error('[AGENT] Injuries fetch error:', error.message);
        return {};
    }
}

/**
 * Helper: Extract team names from text
 */
function extractTeamMentions(text) {
    const teamNames = [
        'Lakers', 'Celtics', 'Warriors', 'Heat', 'Nuggets', 'Suns', 'Bucks', 'Knicks',
        '76ers', 'Nets', 'Bulls', 'Cavaliers', 'Mavericks', 'Clippers', 'Kings', 'Grizzlies',
        'Pelicans', 'Hawks', 'Raptors', 'Pacers', 'Hornets', 'Wizards', 'Magic', 'Pistons',
        'Thunder', 'Jazz', 'Timberwolves', 'Trail Blazers', 'Spurs', 'Rockets'
    ];

    return teamNames.filter(team =>
        text.toLowerCase().includes(team.toLowerCase())
    );
}

/**
 * MASTER AGENT: Run all data collection
 */
export async function runDataAgent(oddsApiKey = null, sport = 'nba') {
    console.log('\n========================================');
    console.log(`[AGENT] Starting comprehensive data collection for ${sport.toUpperCase()}...`);
    console.log(`[AGENT] Time: ${new Date().toISOString()}`);
    console.log('========================================\n');

    const results = {
        games: null,
        injuries: null,
        news: null,
        odds: null,
        teamStats: null
    };

    try {
        // Parallel fetching for speed
        const [games, injuries, news] = await Promise.all([
            fetchESPNScoreboard(sport),
            fetchInjuryReports(sport),
            fetchSportsNews(sport)
        ]);

        results.games = games;
        results.injuries = injuries;
        results.news = news;

        // Fetch team stats (sequential due to rate limits)
        results.teamStats = await fetchTeamStats(sport);

        // Fetch live odds if API key provided
        if (oddsApiKey) {
            const oddsKey = sport === 'nba' ? 'basketball_nba' : 'americanfootball_nfl';
            results.odds = await fetchLiveOdds(oddsKey, oddsApiKey);
        } else {
            console.log('[AGENT] ⚠ No Odds API key provided - skipping live odds');
        }

        console.log('\n========================================');
        console.log('[AGENT] ✓ Data collection complete!');
        console.log(`[AGENT] Games: ${results.games?.length || 0}`);
        console.log(`[AGENT] Injuries: ${Object.keys(results.injuries || {}).length} teams`);
        console.log(`[AGENT] News: ${results.news?.length || 0} articles`);
        console.log(`[AGENT] Teams: ${results.teamStats?.length || 0}`);
        console.log(`[AGENT] Odds: ${results.odds?.length || 0} markets`);
        console.log('========================================\n');

        return {
            success: true,
            data: dataStore.getAll(),
            results
        };
    } catch (error) {
        console.error('[AGENT] Master agent error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export default {
    runDataAgent,
    fetchLiveOdds,
    fetchESPNScoreboard,
    fetchTeamStats,
    fetchSportsNews,
    fetchInjuryReports,
    dataStore
};
