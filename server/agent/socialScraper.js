/**
 * SOCIAL MEDIA SCRAPER (Reddit)
 * 
 * Scrapes relevant subreddits (r/nba, r/sportsbook) for
 * fan sentiment, injury rumors, and betting hype.
 */

// Subreddits to monitor
const SUBREDDITS = {
    nba: ['nba', 'sportsbook', 'fantasybball'],
    nfl: ['nfl', 'sportsbook', 'fantasyfootball'],
    mlb: ['baseball', 'sportsbook', 'fantasybaseball'],
    nhl: ['hockey', 'sportsbook', 'fantasyhockey']
};

/**
 * Fetch top posts mentioning specific teams
 */
export async function fetchSocialSentiment(sport, homeTeam, awayTeam) {
    const subs = SUBREDDITS[sport] || ['sports'];
    const mentions = [];

    // Search terms (Team Name, City, Abbr?? Abbr is dangerous e.g. "LAC")
    const searchTerms = [
        homeTeam.name.toLowerCase(),
        awayTeam.name.toLowerCase(),
        homeTeam.abbr.toLowerCase(),
        awayTeam.abbr.toLowerCase()
    ];

    console.log(`[SOCIAL] Scanning Reddit for ${homeTeam.name} vs ${awayTeam.name}...`);

    for (const sub of subs) {
        try {
            // Use JSON endpoint for subreddit listing
            // Limit to 25 recent posts
            // Use generic browser UA to avoid Reddit's bot block
            const url = `https://www.reddit.com/r/${sub}/new.json?limit=25`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[SOCIAL] Reddit returned ${response.status} for r/${sub}`);
                continue;
            }

            const data = await response.json();
            const posts = data.data?.children || [];

            posts.forEach(post => {
                const title = post.data.title.toLowerCase();
                const selftext = post.data.selftext?.toLowerCase() || '';

                // Check if post mentions either team
                const mentionsHome = searchTerms.slice(0, 2).some(term => title.includes(term));
                const mentionsAway = searchTerms.slice(2, 4).some(term => title.includes(term));

                if (mentionsHome || mentionsAway) {
                    mentions.push({
                        source: `r/${sub}`,
                        title: post.data.title,
                        text: post.data.selftext?.substring(0, 200) + '...',
                        score: post.data.score,
                        comments: post.data.num_comments,
                        url: `https://reddit.com${post.data.permalink}`,
                        sentiment: 'neutral' // Will be analyzed by AI later
                    });
                }
            });

        } catch (e) {
            console.error(`[SOCIAL] Error scraping r/${sub}:`, e.message);
        }
    }

    // Basic heuristic sentiment if no AI
    // (Real sentiment analysis happens in AI agent)
    return {
        source: 'Reddit',
        posts: mentions,
        hypeLevel: mentions.length > 5 ? 'High' : mentions.length > 2 ? 'Medium' : 'Low'
    };
}

export default {
    fetchSocialSentiment
};
