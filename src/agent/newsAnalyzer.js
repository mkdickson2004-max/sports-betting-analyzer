/**
 * NEWS & SENTIMENT ANALYZER
 * 
 * Scrapes sports news from multiple sources and analyzes sentiment
 * to detect breaking news that could affect betting lines.
 */

// News sources to scrape
const NEWS_SOURCES = {
    espn: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
    // Additional sources would require web scraping
};

// Keywords that indicate high-impact news
const HIGH_IMPACT_KEYWORDS = [
    // Injuries
    'injury', 'injured', 'out', 'doubtful', 'questionable', 'day-to-day',
    'surgery', 'MRI', 'torn', 'sprain', 'strain', 'fracture', 'concussion',
    'cleared', 'return', 'returns', 'back', 'healthy',

    // Trades & Roster
    'trade', 'traded', 'signs', 'signed', 'waived', 'released', 'acquired',
    'buyout', 'contract', 'extension',

    // Rest & Load Management
    'rest', 'resting', 'load management', 'sitting out', 'DNP',

    // Coaching
    'fired', 'suspended', 'ejected', 'fined', 'coach',

    // Performance
    'dominating', 'struggling', 'slump', 'hot streak', 'cold streak',
    'career-high', 'triple-double', 'record'
];

// Team name mappings
const TEAM_MAPPINGS = {
    'lakers': 'LAL', 'los angeles lakers': 'LAL',
    'celtics': 'BOS', 'boston celtics': 'BOS',
    'warriors': 'GSW', 'golden state warriors': 'GSW', 'golden state': 'GSW',
    'heat': 'MIA', 'miami heat': 'MIA',
    'nuggets': 'DEN', 'denver nuggets': 'DEN',
    'suns': 'PHX', 'phoenix suns': 'PHX',
    'bucks': 'MIL', 'milwaukee bucks': 'MIL',
    'knicks': 'NYK', 'new york knicks': 'NYK',
    '76ers': 'PHI', 'sixers': 'PHI', 'philadelphia 76ers': 'PHI',
    'nets': 'BKN', 'brooklyn nets': 'BKN',
    'bulls': 'CHI', 'chicago bulls': 'CHI',
    'cavaliers': 'CLE', 'cavs': 'CLE', 'cleveland cavaliers': 'CLE',
    'mavericks': 'DAL', 'mavs': 'DAL', 'dallas mavericks': 'DAL',
    'clippers': 'LAC', 'la clippers': 'LAC',
    'kings': 'SAC', 'sacramento kings': 'SAC',
    'grizzlies': 'MEM', 'memphis grizzlies': 'MEM',
    'pelicans': 'NOP', 'new orleans pelicans': 'NOP',
    'hawks': 'ATL', 'atlanta hawks': 'ATL',
    'raptors': 'TOR', 'toronto raptors': 'TOR',
    'pacers': 'IND', 'indiana pacers': 'IND',
    'hornets': 'CHA', 'charlotte hornets': 'CHA',
    'wizards': 'WAS', 'washington wizards': 'WAS',
    'magic': 'ORL', 'orlando magic': 'ORL',
    'pistons': 'DET', 'detroit pistons': 'DET',
    'thunder': 'OKC', 'oklahoma city thunder': 'OKC',
    'jazz': 'UTA', 'utah jazz': 'UTA',
    'timberwolves': 'MIN', 'wolves': 'MIN', 'minnesota timberwolves': 'MIN',
    'trail blazers': 'POR', 'blazers': 'POR', 'portland trail blazers': 'POR',
    'spurs': 'SAS', 'san antonio spurs': 'SAS',
    'rockets': 'HOU', 'houston rockets': 'HOU'
};

/**
 * Analyze news article for betting impact
 */
export function analyzeArticle(article) {
    const text = `${article.headline} ${article.description}`.toLowerCase();

    // Find mentioned teams
    const mentionedTeams = [];
    Object.entries(TEAM_MAPPINGS).forEach(([name, abbr]) => {
        if (text.includes(name) && !mentionedTeams.includes(abbr)) {
            mentionedTeams.push(abbr);
        }
    });

    // Find impact keywords
    const foundKeywords = HIGH_IMPACT_KEYWORDS.filter(kw =>
        text.includes(kw.toLowerCase())
    );

    // Calculate impact score (0-100)
    let impactScore = 0;

    // More keywords = higher impact
    impactScore += Math.min(foundKeywords.length * 15, 50);

    // Specific high-impact patterns
    if (text.includes('out') && (text.includes('injury') || text.includes('injured'))) {
        impactScore += 30;
    }
    if (text.includes('trade')) impactScore += 25;
    if (text.includes('surgery')) impactScore += 35;
    if (text.includes('returns') || text.includes('cleared')) impactScore += 20;
    if (text.includes('suspended') || text.includes('ejected')) impactScore += 15;

    impactScore = Math.min(impactScore, 100);

    // Determine sentiment
    let sentiment = 'neutral';
    const positiveWords = ['returns', 'cleared', 'healthy', 'back', 'dominating', 'hot streak'];
    const negativeWords = ['out', 'injured', 'surgery', 'torn', 'suspended', 'struggling', 'slump'];

    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;

    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
        ...article,
        mentionedTeams,
        impactKeywords: foundKeywords,
        impactScore,
        sentiment,
        isHighImpact: impactScore >= 40,
        analyzedAt: new Date().toISOString()
    };
}

/**
 * Fetch and analyze all recent news
 */
export async function fetchAndAnalyzeNews() {
    console.log('[NEWS AGENT] Fetching and analyzing sports news...');

    try {
        const response = await fetch(NEWS_SOURCES.espn);
        const data = await response.json();

        const analyzedArticles = data.articles?.map(article =>
            analyzeArticle({
                id: article.dataSourceIdentifier,
                headline: article.headline,
                description: article.description || '',
                published: article.published,
                link: article.links?.web?.href,
                image: article.images?.[0]?.url
            })
        ) || [];

        // Sort by impact
        const sortedArticles = analyzedArticles.sort((a, b) => b.impactScore - a.impactScore);

        // Separate high-impact alerts
        const highImpactAlerts = sortedArticles.filter(a => a.isHighImpact);

        console.log(`[NEWS AGENT] ✓ Analyzed ${analyzedArticles.length} articles`);
        console.log(`[NEWS AGENT] ⚠ Found ${highImpactAlerts.length} high-impact alerts`);

        return {
            articles: sortedArticles,
            highImpactAlerts,
            teamNews: groupByTeam(sortedArticles),
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('[NEWS AGENT] Error:', error.message);
        return { articles: [], highImpactAlerts: [], teamNews: {} };
    }
}

/**
 * Group news by team
 */
function groupByTeam(articles) {
    const byTeam = {};

    articles.forEach(article => {
        article.mentionedTeams.forEach(team => {
            if (!byTeam[team]) byTeam[team] = [];
            byTeam[team].push(article);
        });
    });

    return byTeam;
}

/**
 * Get betting alerts - news that could move lines
 */
export function getBettingAlerts(analyzedNews) {
    return analyzedNews.highImpactAlerts?.map(article => ({
        headline: article.headline,
        teams: article.mentionedTeams,
        impact: article.impactScore,
        sentiment: article.sentiment,
        keywords: article.impactKeywords.slice(0, 3),
        recommendation: generateRecommendation(article)
    })) || [];
}

/**
 * Generate betting recommendation based on news
 */
function generateRecommendation(article) {
    const { mentionedTeams, sentiment, impactKeywords } = article;

    if (mentionedTeams.length === 0) {
        return 'Monitor for team-specific impacts';
    }

    const team = mentionedTeams[0];

    if (impactKeywords.includes('out') || impactKeywords.includes('surgery')) {
        return `Consider betting AGAINST ${team} - key player news may not be priced in`;
    }

    if (impactKeywords.includes('returns') || impactKeywords.includes('cleared')) {
        return `Consider betting ON ${team} - returning player may boost performance`;
    }

    if (sentiment === 'negative') {
        return `Watch ${team} lines for potential overreaction opportunities`;
    }

    if (sentiment === 'positive') {
        return `Lines may move toward ${team} - act early if betting`;
    }

    return `Monitor ${team} for line movements`;
}

export default {
    analyzeArticle,
    fetchAndAnalyzeNews,
    getBettingAlerts
};
