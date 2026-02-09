/**
 * AI BETTING ANALYZER
 * 
 * Generates intelligent, human-readable analysis explaining:
 * - Why the market odds are mispriced
 * - Key advantages/disadvantages for each team
 * - Specific factors supporting the bet
 * - Risk assessment and confidence level
 */

/**
 * Generate comprehensive AI analysis for a matchup
 */
export function generateMatchupAnalysis(game, odds, injuries, news) {
    const homeTeam = game.homeTeam;
    const awayTeam = game.awayTeam;

    // Parse records
    const homeRecord = parseRecord(homeTeam?.record);
    const awayRecord = parseRecord(awayTeam?.record);

    // Calculate team strength metrics
    const homeStrength = calculateTeamStrength(homeRecord, true);
    const awayStrength = calculateTeamStrength(awayRecord, false);

    // Get injury impact
    const homeInjuryImpact = analyzeInjuryImpact(injuries?.[homeTeam?.abbr]);
    const awayInjuryImpact = analyzeInjuryImpact(injuries?.[awayTeam?.abbr]);

    // Get relevant news
    const relevantNews = findRelevantNews(news, homeTeam?.abbr, awayTeam?.abbr);

    // Calculate model probability
    const modelHomeProb = calculateModelProbability(
        homeStrength,
        awayStrength,
        homeInjuryImpact,
        awayInjuryImpact
    );

    // Get market odds and calculate edge
    const marketData = extractMarketData(odds, homeTeam?.name, awayTeam?.name);

    // Generate the analysis
    return {
        homeTeam: homeTeam?.name,
        awayTeam: awayTeam?.name,
        homeAbbr: homeTeam?.abbr,
        awayAbbr: awayTeam?.abbr,

        // Model predictions
        modelHomeWinProb: Math.round(modelHomeProb * 100),
        modelAwayWinProb: Math.round((1 - modelHomeProb) * 100),

        // Market comparison
        marketHomeProb: marketData.homeImplied,
        marketAwayProb: marketData.awayImplied,

        // Edge calculations
        homeEdge: calculateEdge(modelHomeProb, marketData.homeImplied / 100),
        awayEdge: calculateEdge(1 - modelHomeProb, marketData.awayImplied / 100),

        // Best odds
        bestHomeOdds: marketData.bestHome,
        bestAwayOdds: marketData.bestAway,

        // Team analysis
        homeAnalysis: generateTeamAnalysis(homeTeam, homeRecord, homeStrength, homeInjuryImpact, true),
        awayAnalysis: generateTeamAnalysis(awayTeam, awayRecord, awayStrength, awayInjuryImpact, false),

        // Why market is wrong
        marketMispricing: generateMarketMispricingAnalysis(
            modelHomeProb,
            marketData,
            homeInjuryImpact,
            awayInjuryImpact,
            relevantNews,
            homeTeam,
            awayTeam
        ),

        // Key factors
        keyFactors: generateKeyFactors(
            homeRecord,
            awayRecord,
            homeInjuryImpact,
            awayInjuryImpact,
            relevantNews,
            homeTeam,
            awayTeam
        ),

        // Betting recommendation
        recommendation: generateRecommendation(
            modelHomeProb,
            marketData,
            homeTeam,
            awayTeam,
            homeInjuryImpact,
            awayInjuryImpact
        ),

        // Confidence level
        confidence: calculateConfidence(
            Math.abs(modelHomeProb - marketData.homeImplied / 100),
            homeInjuryImpact,
            awayInjuryImpact
        ),

        // Risk factors
        riskFactors: generateRiskFactors(homeInjuryImpact, awayInjuryImpact, relevantNews),

        // News impact
        newsImpact: relevantNews
    };
}

/**
 * Parse W-L record
 */
function parseRecord(recordStr) {
    if (!recordStr) return { wins: 0, losses: 0, winPct: 0.5 };
    const [wins, losses] = recordStr.split('-').map(Number);
    return {
        wins: wins || 0,
        losses: losses || 0,
        winPct: wins / (wins + losses + 0.001)
    };
}

/**
 * Calculate team strength score
 */
function calculateTeamStrength(record, isHome) {
    let strength = record.winPct * 100;

    // Home court advantage (~60% historical home win rate in NBA)
    if (isHome) strength += 5;

    // Normalize to 0-100
    return Math.max(0, Math.min(100, strength));
}

/**
 * Analyze injury impact
 */
function analyzeInjuryImpact(teamInjuries) {
    if (!teamInjuries?.players?.length) {
        return { score: 0, severity: 'none', details: [] };
    }

    let impactScore = 0;
    const details = [];

    teamInjuries.players.forEach(player => {
        const status = player.status?.toLowerCase() || '';

        if (status === 'out') {
            impactScore += 15;
            details.push({ player: player.name, status: 'OUT', impact: 'high', injury: player.type });
        } else if (status === 'doubtful') {
            impactScore += 10;
            details.push({ player: player.name, status: 'DOUBTFUL', impact: 'high', injury: player.type });
        } else if (status === 'questionable') {
            impactScore += 5;
            details.push({ player: player.name, status: 'QUESTIONABLE', impact: 'medium', injury: player.type });
        } else if (status === 'probable' || status === 'day-to-day') {
            impactScore += 2;
            details.push({ player: player.name, status: player.status, impact: 'low', injury: player.type });
        }
    });

    let severity = 'none';
    if (impactScore >= 25) severity = 'critical';
    else if (impactScore >= 15) severity = 'significant';
    else if (impactScore >= 8) severity = 'moderate';
    else if (impactScore > 0) severity = 'minor';

    return { score: impactScore, severity, details };
}

/**
 * Find relevant news for teams
 */
function findRelevantNews(news, homeAbbr, awayAbbr) {
    if (!news?.length) return [];

    const teamNames = {
        LAL: ['lakers', 'los angeles lakers'],
        BOS: ['celtics', 'boston'],
        GSW: ['warriors', 'golden state'],
        MIA: ['heat', 'miami'],
        // Add more mappings...
    };

    return news.filter(article => {
        const text = `${article.headline} ${article.description || ''}`.toLowerCase();
        return article.isHighImpact && (
            text.includes(homeAbbr?.toLowerCase()) ||
            text.includes(awayAbbr?.toLowerCase())
        );
    }).slice(0, 3);
}

/**
 * Calculate model probability
 */
function calculateModelProbability(homeStrength, awayStrength, homeInjuryImpact, awayInjuryImpact) {
    // Base probability from strength comparison
    let prob = (homeStrength - awayStrength + 50) / 100;

    // Adjust for injuries (injury to home team hurts, injury to away helps)
    prob -= homeInjuryImpact.score * 0.01;
    prob += awayInjuryImpact.score * 0.01;

    // Clamp between 0.15 and 0.85
    return Math.max(0.15, Math.min(0.85, prob));
}

/**
 * Extract market data from odds
 */
function extractMarketData(odds, homeName, awayName) {
    const result = {
        homeImplied: 50,
        awayImplied: 50,
        bestHome: { odds: 0, book: 'N/A' },
        bestAway: { odds: 0, book: 'N/A' }
    };

    if (!odds?.bookmakers) return result;

    odds.bookmakers.forEach(book => {
        const h2h = book.markets?.find(m => m.key === 'h2h');
        h2h?.outcomes?.forEach(outcome => {
            const implied = americanToImplied(outcome.price);

            if (outcome.name === homeName) {
                if (outcome.price > result.bestHome.odds) {
                    result.bestHome = { odds: outcome.price, book: book.title };
                }
                result.homeImplied = Math.round(implied * 100);
            }
            if (outcome.name === awayName) {
                if (outcome.price > result.bestAway.odds) {
                    result.bestAway = { odds: outcome.price, book: book.title };
                }
                result.awayImplied = Math.round(implied * 100);
            }
        });
    });

    return result;
}

/**
 * Convert American odds to implied probability
 */
function americanToImplied(odds) {
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Calculate edge percentage
 */
function calculateEdge(modelProb, marketProb) {
    if (marketProb <= 0) return 0;
    return Math.round(((modelProb - marketProb) / marketProb) * 100 * 10) / 10;
}

/**
 * Generate team analysis
 */
function generateTeamAnalysis(team, record, strength, injuryImpact, isHome) {
    const analysis = {
        name: team?.name,
        record: `${record.wins}-${record.losses}`,
        winPct: Math.round(record.winPct * 100),
        strengthRating: Math.round(strength),
        advantages: [],
        disadvantages: []
    };

    // Record-based analysis
    if (record.winPct > 0.6) {
        analysis.advantages.push(`Strong ${record.wins}-${record.losses} record (${Math.round(record.winPct * 100)}% win rate)`);
    } else if (record.winPct < 0.4) {
        analysis.disadvantages.push(`Struggling at ${record.wins}-${record.losses} (${Math.round(record.winPct * 100)}% win rate)`);
    }

    // Home/away advantage
    if (isHome) {
        analysis.advantages.push('Home court advantage (NBA home teams win ~60% historically)');
    } else {
        analysis.disadvantages.push('Playing on the road (away teams face hostile environment)');
    }

    // Injury impact
    if (injuryImpact.severity === 'critical') {
        analysis.disadvantages.push(`CRITICAL: Multiple key players injured (${injuryImpact.details.length} players out/questionable)`);
    } else if (injuryImpact.severity === 'significant') {
        analysis.disadvantages.push(`Significant injury concerns affecting rotation`);
    } else if (injuryImpact.severity === 'none') {
        analysis.advantages.push('Healthy roster - no significant injuries reported');
    }

    return analysis;
}

/**
 * Generate market mispricing analysis
 */
function generateMarketMispricingAnalysis(modelProb, marketData, homeInjury, awayInjury, news, homeTeam, awayTeam) {
    const reasons = [];
    const modelHome = modelProb * 100;
    const marketHome = marketData.homeImplied;
    const diff = Math.abs(modelHome - marketHome);

    // Identify the mispriced side
    if (modelHome > marketHome + 5) {
        // Market undervaluing home team
        reasons.push({
            type: 'undervalued',
            team: homeTeam?.name,
            explanation: `The market is pricing ${homeTeam?.name} at ${marketHome}% win probability, but our model shows ${Math.round(modelHome)}%. This ${Math.round(diff)}% gap suggests the market is undervaluing them.`
        });

        if (awayInjury.severity !== 'none') {
            reasons.push({
                type: 'injury_edge',
                explanation: `${awayTeam?.name} has injury concerns that may not be fully priced in: ${awayInjury.details.map(d => `${d.player} (${d.status})`).join(', ')}`
            });
        }
    } else if (modelHome < marketHome - 5) {
        // Market undervaluing away team
        reasons.push({
            type: 'undervalued',
            team: awayTeam?.name,
            explanation: `The market is pricing ${awayTeam?.name} at ${100 - marketHome}% win probability, but our model shows ${Math.round(100 - modelHome)}%. This suggests value on the underdog.`
        });
    }

    // News-based factors
    if (news?.length > 0) {
        reasons.push({
            type: 'news_factor',
            explanation: `Recent news may not be fully priced in: "${news[0].headline}"`
        });
    }

    // Injury asymmetry
    if (homeInjury.score - awayInjury.score > 10) {
        reasons.push({
            type: 'injury_asymmetry',
            explanation: `${homeTeam?.name} is dealing with more severe injury issues, creating potential value on ${awayTeam?.name}`
        });
    } else if (awayInjury.score - homeInjury.score > 10) {
        reasons.push({
            type: 'injury_asymmetry',
            explanation: `${awayTeam?.name} is dealing with more severe injury issues, creating potential value on ${homeTeam?.name}`
        });
    }

    return reasons;
}

/**
 * Generate key factors
 */
function generateKeyFactors(homeRecord, awayRecord, homeInjury, awayInjury, news, homeTeam, awayTeam) {
    const factors = [];

    // Record comparison
    const recordDiff = homeRecord.winPct - awayRecord.winPct;
    if (Math.abs(recordDiff) > 0.15) {
        const better = recordDiff > 0 ? homeTeam : awayTeam;
        const worse = recordDiff > 0 ? awayTeam : homeTeam;
        factors.push({
            factor: 'Record Differential',
            impact: recordDiff > 0 ? 'home' : 'away',
            icon: '📊',
            detail: `${better?.name} has a significantly better win rate (${Math.round(Math.max(homeRecord.winPct, awayRecord.winPct) * 100)}%) compared to ${worse?.name} (${Math.round(Math.min(homeRecord.winPct, awayRecord.winPct) * 100)}%)`
        });
    }

    // Home court
    factors.push({
        factor: 'Home Court Advantage',
        impact: 'home',
        icon: '🏟️',
        detail: `${homeTeam?.name} benefits from playing at home. NBA home teams win approximately 60% of games historically.`
    });

    // Injuries
    if (homeInjury.details.length > 0) {
        factors.push({
            factor: 'Injury Report',
            impact: 'away',
            icon: '🏥',
            detail: `${homeTeam?.name} injuries: ${homeInjury.details.slice(0, 2).map(d => `${d.player} (${d.status})`).join(', ')}`
        });
    }
    if (awayInjury.details.length > 0) {
        factors.push({
            factor: 'Injury Report',
            impact: 'home',
            icon: '🏥',
            detail: `${awayTeam?.name} injuries: ${awayInjury.details.slice(0, 2).map(d => `${d.player} (${d.status})`).join(', ')}`
        });
    }

    // Recent news
    news?.slice(0, 1).forEach(article => {
        factors.push({
            factor: 'Breaking News',
            impact: 'neutral',
            icon: '📰',
            detail: article.headline
        });
    });

    return factors;
}

/**
 * Generate betting recommendation
 */
function generateRecommendation(modelProb, marketData, homeTeam, awayTeam, homeInjury, awayInjury) {
    const homeEdge = calculateEdge(modelProb, marketData.homeImplied / 100);
    const awayEdge = calculateEdge(1 - modelProb, marketData.awayImplied / 100);

    if (homeEdge >= 10 && homeInjury.severity !== 'critical') {
        return {
            pick: homeTeam?.name,
            side: 'home',
            action: 'STRONG BET',
            confidence: 'high',
            odds: marketData.bestHome.odds,
            book: marketData.bestHome.book,
            reasoning: `Our model shows a ${homeEdge}% edge on ${homeTeam?.name}. At ${marketData.bestHome.odds > 0 ? '+' : ''}${marketData.bestHome.odds} odds, this represents significant value. The market appears to be undervaluing their chances.`
        };
    } else if (awayEdge >= 10 && awayInjury.severity !== 'critical') {
        return {
            pick: awayTeam?.name,
            side: 'away',
            action: 'STRONG BET',
            confidence: 'high',
            odds: marketData.bestAway.odds,
            book: marketData.bestAway.book,
            reasoning: `Our model shows a ${awayEdge}% edge on ${awayTeam?.name}. At ${marketData.bestAway.odds > 0 ? '+' : ''}${marketData.bestAway.odds} odds, this represents significant value despite playing on the road.`
        };
    } else if (homeEdge >= 5) {
        return {
            pick: homeTeam?.name,
            side: 'home',
            action: 'LEAN',
            confidence: 'medium',
            odds: marketData.bestHome.odds,
            book: marketData.bestHome.book,
            reasoning: `Moderate ${homeEdge}% edge detected on ${homeTeam?.name}. Consider a smaller position given the tighter margin.`
        };
    } else if (awayEdge >= 5) {
        return {
            pick: awayTeam?.name,
            side: 'away',
            action: 'LEAN',
            confidence: 'medium',
            odds: marketData.bestAway.odds,
            book: marketData.bestAway.book,
            reasoning: `Moderate ${awayEdge}% edge detected on ${awayTeam?.name}. Consider a smaller position given the tighter margin.`
        };
    }

    return {
        pick: null,
        action: 'PASS',
        confidence: 'low',
        reasoning: 'No significant edge detected. The market appears to be fairly priced for this matchup.'
    };
}

/**
 * Calculate confidence level
 */
function calculateConfidence(edgeMagnitude, homeInjury, awayInjury) {
    let confidence = 50;

    // Higher edge = higher confidence
    confidence += edgeMagnitude * 100;

    // Injury uncertainty reduces confidence
    if (homeInjury.severity === 'critical' || awayInjury.severity === 'critical') {
        confidence -= 20;
    }

    // Many questionable players = uncertainty
    const totalQuestionable = (homeInjury.details?.filter(d => d.status === 'QUESTIONABLE').length || 0) +
        (awayInjury.details?.filter(d => d.status === 'QUESTIONABLE').length || 0);
    confidence -= totalQuestionable * 5;

    return Math.max(20, Math.min(95, Math.round(confidence)));
}

/**
 * Generate risk factors
 */
function generateRiskFactors(homeInjury, awayInjury, news) {
    const risks = [];

    // Injury risks
    const questionablePlayers = [
        ...homeInjury.details?.filter(d => d.status === 'QUESTIONABLE') || [],
        ...awayInjury.details?.filter(d => d.status === 'QUESTIONABLE') || []
    ];

    if (questionablePlayers.length > 0) {
        risks.push({
            type: 'injury_uncertainty',
            severity: 'medium',
            detail: `${questionablePlayers.length} player(s) listed as questionable - game-time decisions could swing odds`
        });
    }

    // News volatility
    if (news?.some(n => n.isHighImpact)) {
        risks.push({
            type: 'news_volatility',
            severity: 'medium',
            detail: 'Recent breaking news may cause line movement - consider betting early or late to capture value'
        });
    }

    // Both teams struggling
    if (homeInjury.severity === 'significant' && awayInjury.severity === 'significant') {
        risks.push({
            type: 'uncertainty',
            severity: 'high',
            detail: 'Both teams dealing with significant injuries - game outcome more unpredictable than usual'
        });
    }

    return risks;
}

export default {
    generateMatchupAnalysis
};
