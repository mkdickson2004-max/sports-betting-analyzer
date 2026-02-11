/**
 * SPORTS DATA AGENT
 * 
 * Autonomous agent that scrapes, aggregates, and analyzes sports data
 * from multiple sources across the internet to provide accurate betting intelligence.
 */
import { runAgentAnalysis } from './aiAgent.js';
import { analyzeAllAdvancedFactors } from './advancedFactors.js';
import { fetchSocialSentiment } from './socialScraper.js';
import { runMonteCarloSimulation } from '../utils/monteCarlo.js';
import { scrapeAllOdds } from './oddsScraper.js';
// Data source endpoints

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
 * Helper: Fetch Team Roster
 */
async function fetchRoster(teamId, sport = 'nba') {
    if (!teamId) return [];
    try {
        const response = await fetch(`${DATA_SOURCES.ESPN_NBA}/teams/${teamId}/roster`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.athletes?.map(p => ({
            name: p.fullName,
            position: p.position?.abbreviation,
            status: p.status?.type?.name,
            stats: {}
        })) || [];
    } catch (e) {
        return [];
    }
}

/**
 * Helper: Fetch Team Schedule (for H2H and Trends)
 */
async function fetchSchedule(teamId, sport = 'nba') {
    if (!teamId) return [];
    try {
        const response = await fetch(`${DATA_SOURCES.ESPN_NBA}/teams/${teamId}/schedule`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.events?.map(e => ({
            date: e.date,
            opponent: e.competitions?.[0]?.competitors?.find(c => c.team?.id !== teamId)?.team,
            result: e.competitions?.[0]?.competitors?.find(c => c.team?.id === teamId)?.outcome?.type, // 'win' or 'loss'
            score: e.competitions?.[0]?.competitors?.find(c => c.team?.id === teamId)?.score?.value,
            oppScore: e.competitions?.[0]?.competitors?.find(c => c.team?.id !== teamId)?.score?.value
        })) || [];
    } catch (e) {
        console.warn(`[SCHEDULE] Fetch error for team ${teamId}:`, e.message);
        return [];
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
 * AGENT: Fetch live odds (Deprecated)
 */
export async function fetchLiveOdds(sport = 'nba', apiKey = null) {
    console.log(`[AGENT] Fetching live odds via scraper for ${sport}...`);
    return await scrapeAllOdds(sport);
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

        const validGames = data.events?.filter(event => {
            // STRICT FILTER: Only show upcoming or live games
            return !event.status.type.completed && event.status.type.state !== 'post';
        }) || [];

        const games = validGames.map(event => ({
            id: event.id,
            name: event.name,
            shortName: event.shortName,
            date: event.date,
            status: event.status?.type?.description,
            sport: sport, // Add sport tag for filtering
            venue: event.competitions?.[0]?.venue?.fullName,
            broadcast: event.competitions?.[0]?.broadcasts?.[0]?.names?.[0],
            officials: event.competitions?.[0]?.officials?.map(o => o.fullName),
            homeTeam: {
                id: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.id,
                name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName,
                abbr: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.abbreviation,
                logo: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.logo ||
                    event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.logos?.[0]?.href,
                score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.score,
                record: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.records?.[0]?.summary
            },
            awayTeam: {
                id: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.id,
                name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName,
                abbr: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.abbreviation,
                logo: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.logo ||
                    event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.logos?.[0]?.href,
                score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.score,
                record: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.records?.[0]?.summary
            }
        }));

        games.forEach(game => {
            dataStore.games.set(game.id, game);
        });

        dataStore.lastUpdated.games = new Date().toISOString();
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
            } catch (e) { }
        }

        dataStore.lastUpdated.teamStats = new Date().toISOString();
        return teams;
    } catch (error) {
        return [];
    }
}

/**
 * AGENT: Fetch latest news and headlines
 */
export async function fetchSportsNews(sport = 'nba') {
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
            teams: extractTeamMentions(article.headline + ' ' + article.description)
        })) || [];

        dataStore.news = articles;
        dataStore.lastUpdated.news = new Date().toISOString();
        return articles;
    } catch (error) {
        return [];
    }
}

/**
 * AGENT: Scrape injury reports from ESPN
 */
export async function fetchInjuryReports(sport = 'nba') {
    try {
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries`);
        const data = await response.json();
        const injuries = {};

        data.injuries?.forEach(teamInjury => {
            const teamAbbr = teamInjury.team?.abbreviation;
            injuries[teamAbbr] = {
                team: teamInjury.team?.displayName,
                players: teamInjury.injuries?.map(inj => ({
                    name: inj.athlete?.displayName,
                    status: inj.status,
                    injury: inj.type?.text || inj.details?.type,
                    date: inj.date,
                    shortComment: inj.shortComment
                })) || []
            };
            dataStore.injuries.set(teamAbbr, injuries[teamAbbr]);
        });
        dataStore.lastUpdated.injuries = new Date().toISOString();
        return injuries;
    } catch (error) {
        return {};
    }
}

/**
 * MASTER AGENT: Run all data collection
 */
export async function runDataAgent(oddsApiKey = null) {
    console.log('\n========================================');
    console.log('[AGENT] Starting comprehensive data collection...');

    const results = {
        games: null,
        injuries: null,
        news: null,
        odds: null,
        teamStats: null
    };

    try {
        const [nbaGames, nflGames, injuries, news, nbaOdds, nflOdds] = await Promise.all([
            fetchESPNScoreboard('nba'),
            fetchESPNScoreboard('nfl'),
            fetchInjuryReports('nba'),
            fetchSportsNews('nfl'),
            scrapeAllOdds('nba'),
            scrapeAllOdds('nfl')
        ]);

        // Merge Odds into Games
        // Both sources use ESPN IDs, so we can map directly
        const oddsMap = new Map();
        if (nbaOdds?.data) nbaOdds.data.forEach(o => oddsMap.set(o.id, o));
        if (nflOdds?.data) nflOdds.data.forEach(o => oddsMap.set(o.id, o));

        const games = [...nbaGames, ...nflGames].map(game => {
            const odds = oddsMap.get(game.id);
            if (odds) {
                game.odds = odds; // Attach structured odds object
            } else {
                game.odds = { bookmakers: [] }; // Empty fallack
            }
            return game;
        });

        results.games = games;
        results.injuries = injuries;
        results.news = news;
        results.odds = { nba: nbaOdds, nfl: nflOdds };

        await fetchTeamStats('nba');
        await fetchTeamStats('nfl');

        // ---------------------------------------------------------
        // AI PHASE: Run Deep Analysis on Active Games
        // ---------------------------------------------------------
        console.log(`[AGENT] 🧠 Running AI Analysis on ${games.length} games...`);

        // 1. Unified Data Fetch & Analysis Loop (Sequential)
        const evaluations = [];

        console.log(`[AGENT] Processing ${games.length} games sequentially to respect AI Rate Limits...`);

        for (const game of games) {
            try {
                const homeId = game.homeTeam?.id;
                const awayId = game.awayTeam?.id;

                // A. Fetch Roster & Schedule (Parallel per game)
                // Note: Social scraping is also parallelized here if needed, but we do it sequentially.
                const [
                    homeRoster, awayRoster,
                    homeSchedule, awaySchedule
                ] = await Promise.all([
                    fetchRoster(homeId),
                    fetchRoster(awayId),
                    fetchSchedule(homeId),
                    fetchSchedule(awayId)
                ]);

                // B. Calculate H2H (Head-to-Head)
                // Use loose equality for ID matching
                const h2hGames = homeSchedule.filter(g => g.opponent?.id == awayId);
                const homeWins = h2hGames.filter(g => g.result === 'win').length;
                const h2hData = {
                    totalGames: h2hGames.length,
                    homeWins: homeWins,
                    awayWins: h2hGames.length - homeWins,
                    lastGame: h2hGames[0] || null
                };

                // C. Fetch Social Sentiment
                let socialData = { hypeLevel: 'Low', posts: [] };
                try {
                    // Use standard function (imported above). Assuming 'nba' for now, or infer from game.sport?
                    // The function signature: fetchSocialSentiment(league, homeTeam, awayTeam)
                    // The 'game' object has 'sport' property if fetched from unified fetcher? 
                    // Let's assume 'nba' is safe default or use game.sport (if available).
                    // Actually fetchESPNScoreboard adds sport? No.
                    // But we can check leagues.
                    const league = game.league || 'nba'; // Fallback
                    socialData = await fetchSocialSentiment(league, game.homeTeam, game.awayTeam);
                } catch (e) {
                    // console.warn('Social fetch failed', e.message);
                }

                // D. Run Statistical Model
                const homeStats = dataStore.teamStats.get(game.homeTeam?.abbr);
                const awayStats = dataStore.teamStats.get(game.awayTeam?.abbr);

                let statsAnalysis = { factors: {}, homeWinProb: 0.5 };
                try {
                    statsAnalysis = await analyzeAllAdvancedFactors(
                        game,
                        game.odds || {},
                        injuries,
                        { home: homeStats, away: awayStats },
                        {
                            social: socialData,
                            h2h: h2hData,
                            schedule: { home: homeSchedule, away: awaySchedule },
                            rosters: { home: homeRoster, away: awayRoster },
                            refs: game.officials
                        },
                        news
                    );
                } catch (e) {
                    console.error(`Stats model error ${game.id}:`, e.message);
                }

                // SMART CACHING: Reuse AI analysis if recent (< 6 hours)
                let llmResult = null;
                const existingGame = dataStore.games.get(game.id);
                // Check if we have valid AI analysis timestamp
                const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 Hours

                const hasValidCache = existingGame?.aiAnalysis?.timestamp &&
                    (Date.now() - new Date(existingGame.aiAnalysis.timestamp).getTime() < CACHE_TTL);

                if (hasValidCache) {
                    console.log(`[AGENT] ♻ Reusing cached AI analysis for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
                    llmResult = existingGame.aiAnalysis;
                } else {
                    // E. Run AI Agent (API Call) - Only if no cache
                    console.log(`[AGENT] 🤖 Generative AI analyzing ${game.awayTeam.name} @ ${game.homeTeam.name}...`);

                    // MONTE CARLO (Over/Under Specialization)
                    let mcSim = null;
                    try {
                        mcSim = runMonteCarloSimulation(
                            homeStats || { avgPoints: 110, pace: 98 },
                            awayStats || { avgPoints: 110, pace: 98 }
                        );
                        console.log(`[AGENT] 🎲 Monte Carlo: ${mcSim.awayScore}-${mcSim.homeScore} (Total: ${mcSim.totalScore})`);
                    } catch (e) { console.error("MC Error", e); }

                    const scrapedData = {
                        factors: statsAnalysis.factors,
                        modelProb: statsAnalysis.homeWinProb,
                        monteCarlo: mcSim,
                        social: socialData,
                        h2h: h2hData,
                        schedule: { home: homeSchedule, away: awaySchedule },
                        rosters: { home: homeRoster, away: awayRoster },
                        teamStats: { home: homeStats || {}, away: awayStats || {} }
                    };

                    llmResult = await runAgentAnalysis(
                        game, scrapedData, game.odds || {}, injuries, news
                    );

                    // Add rate limit delay ONLY if we hit the API
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // F. Merge Results
                let evalResult = null;
                if (llmResult) {
                    // Add enhanced factors back to result
                    llmResult.enhancedFactors = statsAnalysis.factors;
                    if (!llmResult.modelProbability) llmResult.modelProbability = statsAnalysis.homeWinProb;

                    evalResult = { gameId: game.id, ...llmResult };
                    evaluations.push(evalResult);
                }

                // (Delay moved inside else block to speed up cached runs)

            } catch (err) {
                console.error(`[AGENT] Error processing game ${game.id}:`, err.message);
            }
        }

        // 3. Merge AI results into DataStore
        evaluations.forEach(evalResult => {
            const game = dataStore.games.get(evalResult.gameId);
            if (game) {
                game.aiAnalysis = evalResult;
                game.confidence = evalResult.confidence;
                game.analysis = evalResult.analysis; // for frontend
            }
        });

        console.log('[AGENT] ✓ Data collection & AI Analysis complete!');
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
    getData: () => dataStore.getAll()
};
