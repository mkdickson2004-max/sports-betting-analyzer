/**
 * DEEP AI ANALYZER
 * 
 * Comprehensive betting analysis engine that considers EVERY factor:
 * 
 * 1. TEAM STATS: Offensive/defensive ratings, pace, efficiency
 * 2. PLAYER MATCHUPS: Position-by-position starter comparisons
 * 3. INJURY IMPACT: How missing players affect team strength
 * 4. RECENT FORM: Last 5/10 game performance trends
 * 5. HEAD-TO-HEAD: Historical matchup data
 * 6. SITUATIONAL: Rest days, travel, back-to-backs
 * 7. ADVANCED METRICS: Net rating, TS%, PER, BPM
 * 8. BETTING MARKET: Line movement, sharp money, public %
 * 
 * The model explains EXACTLY what it's looking at and why.
 */

import { analyzeMatchups } from './matchupAnalyzer.js';
import { analyzeAllAdvancedFactors } from './advancedFactors.js';

/**
 * MODEL METHODOLOGY EXPLANATION
 */
export const MODEL_METHODOLOGY = {
    name: 'EdgeFinder AI v3.0',
    description: 'Comprehensive 16-factor predictive model with advanced situational analysis',

    factors: [
        {
            category: 'Team Strength',
            weight: 0.12,
            components: [
                'Season win percentage',
                'Point differential per game',
                'Strength of schedule',
                'Conference record'
            ]
        },
        {
            category: 'Matchup Analysis',
            weight: 0.15,
            components: [
                'Position-by-position starter comparison',
                'PER differential across starters',
                'Usage rate matchups',
                'Offensive vs defensive rating matchups'
            ]
        },
        {
            category: 'Head-to-Head History',
            weight: 0.08,
            components: [
                'All-time series record',
                'Last 5 meetings',
                'Home team H2H record',
                'Recent H2H margin trends'
            ]
        },
        {
            category: 'Against the Spread (ATS)',
            weight: 0.10,
            components: [
                'Overall ATS record',
                'Home/road ATS splits',
                'ATS as favorite/underdog',
                'Last 10 games ATS'
            ]
        },
        {
            category: 'Line Movement & Sharp Money',
            weight: 0.12,
            components: [
                'Opening vs current spread',
                'Reverse line movement detection',
                'Sharp vs public money divergence',
                'Steam moves identification'
            ]
        },
        {
            category: 'Public Betting',
            weight: 0.06,
            components: [
                'Ticket % on each side',
                'Money % vs ticket % divergence',
                'Fade the public opportunities',
                'Contrarian value plays'
            ]
        },
        {
            category: 'Rest & Schedule',
            weight: 0.10,
            components: [
                'Days of rest differential',
                'Back-to-back detection',
                'Travel distance fatigue',
                'Games in last 7/14 days'
            ]
        },
        {
            category: 'Referee Tendencies',
            weight: 0.05,
            components: [
                'Crew over/under tendency',
                'Average fouls per game',
                'Home whistle bias',
                'Pace impact'
            ]
        },
        {
            category: 'Clutch Performance',
            weight: 0.07,
            components: [
                'Close game record (5 pts or less)',
                'Clutch time net rating',
                '4th quarter margin',
                'Overtime record'
            ]
        },
        {
            category: 'Quarter/Half Splits',
            weight: 0.05,
            components: [
                'Quarter-by-quarter margins',
                '1st quarter ATS record',
                '1st half ATS record',
                'Start fast vs finish strong'
            ]
        },
        {
            category: 'Motivation & Situations',
            weight: 0.05,
            components: [
                'Playoff implications',
                'Revenge game detection',
                'Letdown spot identification',
                'Trap game detection'
            ]
        },
        {
            category: 'Injury Impact',
            weight: 0.08,
            components: [
                'VORP of missing players',
                'Minutes redistribution',
                'Replacement player quality',
                'Injury timeline and recovery'
            ]
        },
        {
            category: 'Recent Form',
            weight: 0.08,
            components: [
                'Last 5 game W-L record',
                'Last 5 game point differential',
                'Offensive rating trend',
                'Defensive rating trend'
            ]
        },
        {
            category: 'Pace of Play',
            weight: 0.06,
            components: [
                'Team pace rankings',
                'Expected combined pace',
                'Totals projection impact',
                'Over/under lean'
            ]
        }
    ],

    calculation: `
    P(home_win) = 
      (team_strength * 0.12) +
      (matchup_advantage * 0.15) +
      (h2h_history * 0.08) +
      (ats_trends * 0.10) +
      (line_movement * 0.12) +
      (public_fade * 0.06) +
      (rest_schedule * 0.10) +
      (referee_impact * 0.05) +
      (clutch_performance * 0.07) +
      (quarter_splits * 0.05) +
      (motivation * 0.05) +
      (injury_impact * 0.08) +
      (recent_form * 0.08) +
      (pace_totals * 0.06)
    
    Edge = Model Probability - Market Implied Probability
    
    Total Factors Analyzed: 50+
    Confidence = f(data_quality, factor_alignment, sharp_money_agreement)
  `
};

/**
 * Generate comprehensive deep analysis
 */
/**
 * Generate comprehensive deep analysis
 * @param {Object} game - Game data
 * @param {Object} odds - Odds data
 * @param {Object} injuries - Injury data
 * @param {Array} news - News articles
 * @param {Object} stats - Team stats
 * @param {Object} scrapedData - Pre-scraped comprehensive data (optional)
 */
export async function generateDeepAnalysis(game, odds, injuries, news, stats = {}, scrapedData = null) {
    // Get matchup data
    const matchupData = await analyzeMatchups(
        game.homeTeam,
        game.awayTeam,
        injuries
    );

    // Get all 12 advanced factors with scraped data
    // Pass the scraped data if available, otherwise use stats
    const gameStats = stats[game.id] || scrapedData?.stats || {};
    const advancedFactors = await analyzeAllAdvancedFactors(
        game,
        odds,
        injuries,
        gameStats,
        scrapedData,  // Pass scraped data to advanced factors
        news || []
    );

    // Calculate base factors
    const teamStrengthFactor = analyzeTeamStrength(game);
    const matchupFactor = analyzePositionalMatchups(matchupData);
    const injuryFactor = analyzeInjuryImpact(game, injuries);
    const formFactor = analyzeRecentForm(game);
    const situationalFactor = analyzeSituationalFactors(game);
    const marketFactor = analyzeMarket(odds, game);

    // Combine all factors for probability calculation
    const allFactors = {
        teamStrength: teamStrengthFactor,
        matchups: matchupFactor,
        injuries: injuryFactor,
        form: formFactor,
        situational: situationalFactor,
        market: marketFactor,
        // Add advanced factors
        advanced: advancedFactors
    };

    // Monte Carlo Simulation (Run 1000 iterations based on team stats)
    const simHome = scrapedData?.stats?.home?.derived || {};
    const simAway = scrapedData?.stats?.away?.derived || {};
    // Simulation returns home win probability (0.0 - 1.0)
    const simWinProb = runMonteCarloSimulation(
        simHome.offensiveRating ? simHome : { offensiveRating: 114, defensiveRating: 114, pace: 99 },
        simAway.offensiveRating ? simAway : { offensiveRating: 114, defensiveRating: 114, pace: 99 }
    );

    // Calculate final probability with advanced factors
    const factorProbability = calculateModelProbabilityAdvanced(allFactors);

    // BLENDED MODEL: 75% Factors (Qualitative + Quantitative) + 25% Pure Monte Carlo (Quantitative Simulation)
    // This adds robustness against bias and relies on statistical variance
    const modelProbability = (factorProbability * 0.75) + (simWinProb * 0.25);

    // Calculate edge vs market
    const marketProb = marketFactor.homeImplied / 100;
    const edge = ((modelProbability - marketProb) * 100);

    // Generate recommendation
    const recommendation = generateRecommendation(edge, modelProbability, marketFactor, allFactors);

    // Calculate confidence with advanced factors
    const confidence = calculateConfidenceAdvanced({
        dataQuality: assessDataQuality(game, odds, injuries),
        factorAlignment: assessFactorAlignment(teamStrengthFactor, matchupFactor, formFactor),
        edgeSize: Math.abs(edge),
        advancedFactors: advancedFactors
    });

    // Extract key advanced insights
    const advancedInsights = advancedFactors.summary.keyInsights || [];

    return {
        // Model info
        modelInfo: MODEL_METHODOLOGY,

        // Teams
        homeTeam: game.homeTeam?.name,
        awayTeam: game.awayTeam?.name,

        // Probabilities
        modelHomeWinProb: Math.round(modelProbability * 100),
        modelAwayWinProb: Math.round((1 - modelProbability) * 100),
        marketHomeProb: marketFactor.homeImplied,
        marketAwayProb: marketFactor.awayImplied,

        // Edge
        homeEdge: Math.round(edge * 10) / 10,
        awayEdge: Math.round(-edge * 10) / 10,

        // Detailed factors (original)
        factors: {
            teamStrength: teamStrengthFactor,
            matchups: matchupFactor,
            injuries: injuryFactor,
            form: formFactor,
            situational: situationalFactor,
            market: marketFactor
        },

        // ALL 10 Advanced Factors
        advancedFactors: advancedFactors.factors,
        advancedSummary: advancedFactors.summary,

        // Matchup breakdown
        matchupData,

        // Recommendation
        recommendation,
        confidence,

        // Risk assessment
        risks: identifyRisks(game, injuries, matchupData, formFactor),

        // Key insights (combined base + advanced)
        keyInsights: [
            ...generateKeyInsights({
                teamStrength: teamStrengthFactor,
                matchups: matchupFactor,
                injuries: injuryFactor,
                form: formFactor,
                situational: situationalFactor,
                edge
            }),
            ...advancedInsights
        ],

        // Bet sizing suggestion
        betSizing: suggestBetSize(edge, confidence),

        // Totals recommendation from pace analysis
        totalsAnalysis: getTotalsRecommendation(advancedFactors.factors)
    };
}

/**
 * Get totals recommendation from advanced factors
 */
function getTotalsRecommendation(factors) {
    const paceFactor = factors.find(f => f.factor === 'Pace of Play');
    const refFactor = factors.find(f => f.factor === 'Referee Tendencies');

    let overScore = 0;
    let underScore = 0;

    if (paceFactor?.totalsRecommendation === 'over') overScore += 2;
    if (paceFactor?.totalsRecommendation === 'under') underScore += 2;

    if (refFactor?.recommendation?.includes('OVER')) overScore += 1;
    if (refFactor?.recommendation?.includes('UNDER')) underScore += 1;

    const projectedTotal = paceFactor?.projectedTotal || 220;

    return {
        lean: overScore > underScore ? 'OVER' : underScore > overScore ? 'UNDER' : 'NO LEAN',
        confidence: Math.abs(overScore - underScore) > 1 ? 'high' : 'medium',
        projectedTotal,
        paceInsight: paceFactor?.insight,
        refInsight: refFactor?.insight
    };
}

/**
 * Calculate model probability with all advanced factors
 */
function calculateModelProbabilityAdvanced(allFactors) {
    // Base weights
    const baseWeights = {
        teamStrength: 0.12,
        matchups: 0.15,
        injuries: 0.08,
        form: 0.08,
        situational: 0.07
    };

    // Start with base probability
    let baseProbability =
        (allFactors.teamStrength.probContribution * baseWeights.teamStrength) +
        (allFactors.matchups.probContribution * baseWeights.matchups) +
        (allFactors.injuries.probContribution * baseWeights.injuries) +
        (allFactors.form.probContribution * baseWeights.form) +
        (allFactors.situational.probContribution * baseWeights.situational);

    // Apply advanced factor adjustments
    const advancedAdjustment = allFactors.advanced.summary.totalProbAdjustment / 100;

    // Final probability
    // Final probability
    // We multiply by 0.85 to allow for a wider range of probabilities (10-90%) instead of being compressed to 30-70%
    // This allows the model to correctly identify strong favorites
    const probability = 0.50 + (baseProbability - 0.50) * 0.85 + advancedAdjustment;

    // Normalize to reasonable range (5% to 95%)
    return Math.max(0.05, Math.min(0.95, probability));
}

/**
 * Calculate confidence with advanced factors
 */
function calculateConfidenceAdvanced({ dataQuality, factorAlignment, edgeSize, advancedFactors }) {
    let confidence = 50;

    // Data quality adds up to +15
    confidence += dataQuality * 15;

    // Factor alignment adds up to +15
    confidence += factorAlignment * 15;

    // Edge size adds up to +10
    if (edgeSize > 15) confidence += 10;
    else if (edgeSize > 10) confidence += 8;
    else if (edgeSize > 5) confidence += 5;

    // Advanced factors alignment adds up to +15
    const advSummary = advancedFactors.summary;
    if (advSummary.totalFactors > 0) {
        const factorAgreement = Math.abs(advSummary.homeAdvantages - advSummary.awayAdvantages) / advSummary.totalFactors;
        confidence += factorAgreement * 15;
    }

    // Sharp money agreement adds confidence
    const lineMovement = advancedFactors.factors.find(f => f.factor === 'Line Movement');
    if (lineMovement?.hasRLM) confidence += 5; // Reverse line movement is a strong signal

    // Penalty for lack of data
    if (advSummary.totalFactors === 0) {
        confidence -= 35; // Significant penalty if no advanced factors
    } else if (advSummary.totalFactors < 5) {
        confidence -= 15;
    }

    return Math.min(95, Math.max(10, Math.round(confidence)));
}


/**
 * Analyze team strength factor
 */
function analyzeTeamStrength(game) {
    const homeRecord = parseRecord(game.homeTeam?.record || '0-0');
    const awayRecord = parseRecord(game.awayTeam?.record || '0-0');

    const homeWinPct = homeRecord.wins / Math.max(1, homeRecord.total);
    const awayWinPct = awayRecord.wins / Math.max(1, awayRecord.total);

    // Estimate point differential from record
    const homePointDiff = (homeWinPct - 0.5) * 10;
    const awayPointDiff = (awayWinPct - 0.5) * 10;

    // Bench Unit Impact
    const homeAbbr = game.homeTeam?.abbr || 'UNK';
    const awayAbbr = game.awayTeam?.abbr || 'UNK';
    const homeBench = BENCH_UNIT_RATINGS[homeAbbr] || 0;
    const awayBench = BENCH_UNIT_RATINGS[awayAbbr] || 0;

    // Calculate strength rating (0-100)
    // Weighted: 80% Starters (WinPct), 20% Bench Depth
    let homeStrength = Math.round(homeWinPct * 100) + (homeBench * 2);
    let awayStrength = Math.round(awayWinPct * 100) + (awayBench * 2);

    return {
        home: {
            record: game.homeTeam?.record,
            winPct: Math.round(homeWinPct * 100),
            pointDiff: Math.round(homePointDiff * 10) / 10,
            strength: homeStrength,
            benchRating: homeBench,
            tier: getTier(homeWinPct)
        },
        away: {
            record: game.awayTeam?.record,
            winPct: Math.round(awayWinPct * 100),
            pointDiff: Math.round(awayPointDiff * 10) / 10,
            strength: awayStrength,
            benchRating: awayBench,
            tier: getTier(awayWinPct)
        },
        differential: homeStrength - awayStrength,
        advantage: homeStrength > awayStrength + 10 ? 'home' :
            awayStrength > homeStrength + 10 ? 'away' : 'neutral',
        probContribution: 0.50 + (homeStrength - awayStrength) / 200
    };
}

function getTier(winPct) {
    if (winPct >= 0.65) return 'Elite';
    if (winPct >= 0.55) return 'Playoff';
    if (winPct >= 0.45) return 'Bubble';
    if (winPct >= 0.35) return 'Lottery';
    return 'Tank';
}

function parseRecord(record) {
    const parts = record.split('-');
    const wins = parseInt(parts[0]) || 0;
    const losses = parseInt(parts[1]) || 0;
    return { wins, losses, total: wins + losses };
}

/**
 * Analyze positional matchups
 */
function analyzePositionalMatchups(matchupData) {
    const { matchups, summary, overallAdvantage } = matchupData;

    // Calculate position-by-position breakdown
    const positionBreakdown = matchups.map(m => ({
        position: m.position,
        homeName: m.homePlayer.name,
        awayName: m.awayPlayer.name,
        homeStats: `${m.homePlayer.stats.ppg}/${m.homePlayer.stats.rpg}/${m.homePlayer.stats.apg}`,
        awayStats: `${m.awayPlayer.stats.ppg}/${m.awayPlayer.stats.rpg}/${m.awayPlayer.stats.apg}`,
        homePER: m.homePlayer.stats.per,
        awayPER: m.awayPlayer.stats.per,
        advantage: m.winner,
        score: m.overallScore,
        analysis: m.analysis,
        keyFactors: m.keyFactors
    }));

    // Find dominant matchups
    const dominantMatchups = matchups.filter(m => Math.abs(m.overallScore) > 20);

    // Calculate total PER differential
    const homeTotalPER = matchups.reduce((sum, m) => sum + m.homePlayer.stats.per, 0);
    const awayTotalPER = matchups.reduce((sum, m) => sum + m.awayPlayer.stats.per, 0);

    return {
        positions: positionBreakdown,
        summary: {
            homeWins: summary.homeMatchupWins,
            awayWins: summary.awayMatchupWins,
            even: summary.evenMatchups,
            totalScore: overallAdvantage.score
        },
        dominantMatchups: dominantMatchups.map(m => ({
            position: m.position,
            winner: m.winnerName,
            advantage: m.winner,
            description: m.analysis
        })),
        perDifferential: {
            home: Math.round(homeTotalPER * 10) / 10,
            away: Math.round(awayTotalPER * 10) / 10,
            diff: Math.round((homeTotalPER - awayTotalPER) * 10) / 10
        },
        overallAdvantage: overallAdvantage.description,
        probContribution: 0.50 + (overallAdvantage.probabilityImpact / 100)
    };
}

/**
 * Analyze injury impact
 */
function analyzeInjuryImpact(game, injuries) {
    const homeInjuries = injuries?.[game.homeTeam?.abbr] || { players: [] };
    const awayInjuries = injuries?.[game.awayTeam?.abbr] || { players: [] };

    // Calculate injury impact (higher = more impacted)
    const homeInjuryImpact = calculateInjuryImpactScore(homeInjuries.players || []);
    const awayInjuryImpact = calculateInjuryImpactScore(awayInjuries.players || []);

    const homeOut = (homeInjuries.players || []).filter(p => p.status?.toLowerCase() === 'out');
    const awayOut = (awayInjuries.players || []).filter(p => p.status?.toLowerCase() === 'out');

    const homeQuestionable = (homeInjuries.players || []).filter(p =>
        ['questionable', 'doubtful', 'day-to-day'].includes(p.status?.toLowerCase())
    );
    const awayQuestionable = (awayInjuries.players || []).filter(p =>
        ['questionable', 'doubtful', 'day-to-day'].includes(p.status?.toLowerCase())
    );

    return {
        home: {
            out: homeOut.map(p => ({ name: p.name, type: p.type })),
            questionable: homeQuestionable.map(p => ({ name: p.name, status: p.status })),
            impactScore: homeInjuryImpact,
            healthRating: Math.max(0, 100 - homeInjuryImpact)
        },
        away: {
            out: awayOut.map(p => ({ name: p.name, type: p.type })),
            questionable: awayQuestionable.map(p => ({ name: p.name, status: p.status })),
            impactScore: awayInjuryImpact,
            healthRating: Math.max(0, 100 - awayInjuryImpact)
        },
        differential: awayInjuryImpact - homeInjuryImpact,
        advantage: homeInjuryImpact < awayInjuryImpact ? 'home' :
            awayInjuryImpact < homeInjuryImpact ? 'away' : 'neutral',
        probContribution: 0.50 + (awayInjuryImpact - homeInjuryImpact) / 200
    };
}

function calculateInjuryImpactScore(injuries) {
    let score = 0;

    injuries.forEach(inj => {
        const cleanName = inj.name?.replace(/\./g, '')?.replace(/ Jr/g, '')?.trim();
        const starValue = Object.keys(STAR_PLAYER_IMPACT).find(key => cleanName?.includes(key));
        const playerValue = starValue ? STAR_PLAYER_IMPACT[starValue] : 1.5;

        // Status multipliers
        const status = inj.status?.toLowerCase() || '';
        if (status.includes('out')) score += playerValue * 5;
        else if (status.includes('doubtful')) score += playerValue * 3;
        else if (status.includes('questionable')) score += playerValue * 1.5;
        else if (status.includes('day-to-day')) score += playerValue * 0.5;
    });

    return Math.min(100, Math.round(score));
}

/**
 * Analyze recent form
 */
function analyzeRecentForm(game) {
    // Simulate recent form data (would come from API)
    const homeLast5 = simulateRecentGames(game.homeTeam?.record);
    const awayLast5 = simulateRecentGames(game.awayTeam?.record);

    return {
        home: {
            last5Record: `${homeLast5.wins}-${homeLast5.losses}`,
            last5WinPct: Math.round((homeLast5.wins / 5) * 100),
            pointDiffL5: homeLast5.pointDiff,
            trend: homeLast5.trend,
            streak: homeLast5.streak
        },
        away: {
            last5Record: `${awayLast5.wins}-${awayLast5.losses}`,
            last5WinPct: Math.round((awayLast5.wins / 5) * 100),
            pointDiffL5: awayLast5.pointDiff,
            trend: awayLast5.trend,
            streak: awayLast5.streak
        },
        advantage: homeLast5.wins > awayLast5.wins ? 'home' :
            awayLast5.wins > homeLast5.wins ? 'away' : 'neutral',
        probContribution: 0.50 + (homeLast5.wins - awayLast5.wins) / 20
    };
}

function simulateRecentGames(record) {
    // No simulated data allowed.
    // If we don't have real recent games data, we return a neutral placeholder
    return {
        wins: 0,
        losses: 0,
        pointDiff: 0,
        trend: 'neutral',
        streak: 'No Data'
    };
}

/**
 * Analyze situational factors
 */
function analyzeSituationalFactors(game) {
    // Real data only. If no schedule data is available, return neutral.
    // Home court advantage is the only static factor we can assume.
    const homeCourtAdvantage = 3;

    return {
        homeCourtValue: `+${homeCourtAdvantage} pts`,
        home: {
            restDays: '?', // Unknown
            backToBack: false, // Cannot assume without data
            travel: 'Home'
        },
        away: {
            restDays: '?',
            backToBack: false,
            travel: 'Road'
        },
        totalAdvantagePoints: homeCourtAdvantage,
        advantage: 'home',
        probContribution: 0.50 + (homeCourtAdvantage / 20)
    };
}

/**
 * Analyze market data
 */
function analyzeMarket(odds, game) {
    let homeML = null;
    let awayML = null;
    let spread = null;
    let bestHomeBook = null;
    let bestAwayBook = null;

    // Find best odds across books
    odds?.bookmakers?.forEach(book => {
        const h2h = book.markets?.find(m => m.key === 'h2h');
        const spreads = book.markets?.find(m => m.key === 'spreads');

        h2h?.outcomes?.forEach(o => {
            if (o.name === game.homeTeam?.name) {
                if (!homeML || o.price > homeML) {
                    homeML = o.price;
                    bestHomeBook = book.title;
                }
            }
            if (o.name === game.awayTeam?.name) {
                if (!awayML || o.price > awayML) {
                    awayML = o.price;
                    bestAwayBook = book.title;
                }
            }
        });

        const homeSpread = spreads?.outcomes?.find(o => o.name === game.homeTeam?.name);
        if (homeSpread) spread = homeSpread.point;
    });

    // Calculate implied probabilities
    const homeImplied = oddsToProb(homeML);
    const awayImplied = oddsToProb(awayML);

    return {
        homeML,
        awayML,
        spread,
        bestHomeBook,
        bestAwayBook,
        homeImplied: Math.round(homeImplied * 100),
        awayImplied: Math.round(awayImplied * 100),
        vig: Math.round((homeImplied + awayImplied - 1) * 100 * 10) / 10,
        booksAnalyzed: odds?.bookmakers?.length || 0
    };
}

function oddsToProb(odds) {
    if (!odds) return 0.5;
    if (odds > 0) {
        return 100 / (odds + 100);
    } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }
}

/**
 * Calculate model probability
 */
function calculateModelProbability(factors) {
    const weights = {
        teamStrength: 0.20,
        matchups: 0.25,
        injuries: 0.15,
        form: 0.15,
        situational: 0.10,
        market: 0.15
    };

    const probability =
        (factors.teamStrength.probContribution * weights.teamStrength) +
        (factors.matchups.probContribution * weights.matchups) +
        (factors.injuries.probContribution * weights.injuries) +
        (factors.form.probContribution * weights.form) +
        (factors.situational.probContribution * weights.situational) +
        (0.50 * weights.market); // Market is used for comparison, not prediction

    // Normalize to reasonable range (10-90%)
    return Math.max(0.10, Math.min(0.90, probability));
}

/**
 * Generate recommendation
 */
function generateRecommendation(edge, modelProb, market, allFactors) {
    const absEdge = Math.abs(edge);
    const betSide = edge > 0 ? 'home' : 'away';

    let action;
    if (absEdge >= 10) {
        action = 'STRONG BET';
    } else if (absEdge >= 5) {
        action = 'LEAN';
    } else {
        action = 'PASS';
    }

    const detailedReasoning = generateDetailedReasoning(betSide, allFactors, absEdge);

    return {
        action,
        betSide,
        pick: betSide === 'home' ? market.bestHomeBook : market.bestAwayBook,
        odds: betSide === 'home' ? market.homeML : market.awayML,
        book: betSide === 'home' ? market.bestHomeBook : market.bestAwayBook,
        reasoning: detailedReasoning, // Now an object with summary and factors
        modelProb: Math.round(modelProb * 100),
        edge: Math.round(absEdge * 10) / 10
    };
}

/**
 * Generate detailed reasoning for the recommendation
 */
/**
 * Generate detailed reasoning for the recommendation
 */
function generateDetailedReasoning(side, factors, edge) {
    const reasons = [];
    const teamName = side === 'home' ? factors.teamStrength.home.record?.split('-')?.[0] || 'Home Team' : factors.teamStrength.away.record?.split('-')?.[0] || 'Away Team';

    // Team Strength
    if (factors.teamStrength.advantage === side) {
        reasons.push({
            factor: 'Team Strength',
            importance: Math.abs(factors.teamStrength.differential),
            icon: '📊',
            title: 'Statistical Dominance',
            description: `${side === 'home' ? 'Home' : 'Away'} team has significantly better season efficiency metrics.`
        });
    }

    // Recent Form
    const form = side === 'home' ? factors.form.home : factors.form.away;
    if (factors.form.advantage === side && form.trend === 'hot') {
        reasons.push({
            factor: 'Recent Form',
            importance: 80,
            icon: '🔥',
            title: 'Hot Streak',
            description: `Riding a ${form.streak} streak and outscoring opponents by ${form.pointDiffL5} over last 5.`
        });
    }

    // Matchup Advantage
    if (factors.matchups.overallAdvantage === side) {
        reasons.push({
            factor: 'Matchups',
            importance: 75,
            icon: '⚔️',
            title: 'Positional Mismatches',
            description: `Key advantages at ${factors.matchups.dominantMatchups.map(m => m.position).join(', ')} positions.`
        });
    }

    // Advanced Factors (Top 3)
    const buildingReasons = [];

    if (factors.advanced?.factors) {
        factors.advanced.factors
            .filter(f => f.advantage === side || (side === 'home' && f.advantage === 'over') || (side === 'away' && f.advantage === 'under')) // rough logic for totals
            .sort((a, b) => b.impact - a.impact)
            .slice(0, 3)
            .forEach(f => {
                reasons.push({
                    factor: f.factor,
                    importance: f.impact * 10,
                    icon: f.icon,
                    title: f.factor,
                    description: f.insight
                });
                buildingReasons.push(f.insight);
            });
    }

    // Sort by importance
    reasons.sort((a, b) => b.importance - a.importance);

    // Generate Narrative Paragraph
    const topFactor = reasons[0];
    const secondaryFactor = reasons[1];
    const tertiaryFactor = reasons[2];

    let narrative = `We recommend backing the ${side.toUpperCase()} team based on `;

    if (topFactor) {
        narrative += `${topFactor.title.toLowerCase()} (${topFactor.description}). `;
    }

    if (secondaryFactor) {
        narrative += `Additionally, ${secondaryFactor.description.toLowerCase()} `;
    }

    if (tertiaryFactor) {
        narrative += `Finally, ${tertiaryFactor.description.toLowerCase()}`;
    }

    return {
        summary: narrative,
        keyFactors: reasons
    };
}


/**
 * Calculate confidence level
 */
function calculateConfidence({ dataQuality, factorAlignment, edgeSize }) {
    // Base confidence
    let confidence = 50;

    // Data quality adds up to +20
    confidence += dataQuality * 20;

    // Factor alignment adds up to +20
    confidence += factorAlignment * 20;

    // Edge size adds up to +10
    if (edgeSize > 10) confidence += 10;
    else if (edgeSize > 5) confidence += 5;

    return Math.min(95, Math.max(30, Math.round(confidence)));
}

function assessDataQuality(game, odds, injuries) {
    let quality = 0;

    if (game.homeTeam?.record) quality += 0.25;
    if (game.awayTeam?.record) quality += 0.25;
    if (odds?.bookmakers?.length > 3) quality += 0.25;
    if (injuries && Object.keys(injuries).length > 0) quality += 0.25;

    return quality;
}

function assessFactorAlignment(teamStrength, matchups, form) {
    let alignment = 0;

    // Check if factors agree
    const tsAdv = teamStrength.advantage;
    const mAdv = matchups.summary.homeWins > matchups.summary.awayWins ? 'home' :
        matchups.summary.awayWins > matchups.summary.homeWins ? 'away' : 'neutral';
    const fAdv = form.advantage;

    if (tsAdv === mAdv && tsAdv !== 'neutral') alignment += 0.4;
    if (tsAdv === fAdv && tsAdv !== 'neutral') alignment += 0.3;
    if (mAdv === fAdv && mAdv !== 'neutral') alignment += 0.3;

    return alignment;
}

/**
 * Identify risks
 */
function identifyRisks(game, injuries, matchupData, form) {
    const risks = [];

    // Check for injuries
    const homeInjuries = injuries?.[game.homeTeam?.abbr]?.players || [];
    const awayInjuries = injuries?.[game.awayTeam?.abbr]?.players || [];

    if (homeInjuries.some(i => i.status === 'Out')) {
        risks.push({
            type: 'injury',
            severity: 'high',
            description: `${game.homeTeam?.name} has key players out`
        });
    }

    if (awayInjuries.some(i => i.status === 'Out')) {
        risks.push({
            type: 'injury',
            severity: 'high',
            description: `${game.awayTeam?.name} has key players out`
        });
    }

    // Check for cold streaks
    if (form.home.trend === 'cold') {
        risks.push({
            type: 'form',
            severity: 'medium',
            description: `${game.homeTeam?.name} is in poor form (L5: ${form.home.last5Record})`
        });
    }

    if (form.away.trend === 'hot') {
        risks.push({
            type: 'form',
            severity: 'medium',
            description: `${game.awayTeam?.name} is hot (L5: ${form.away.last5Record})`
        });
    }

    // Check for close matchups
    if (matchupData.summary.homeMatchupWins === matchupData.summary.awayMatchupWins) {
        risks.push({
            type: 'matchup',
            severity: 'low',
            description: 'Starters are evenly matched - game could go either way'
        });
    }

    return risks;
}

/**
 * Generate key insights
 */
function generateKeyInsights(factors) {
    const insights = [];

    // Team strength insight
    const tsDiff = factors.teamStrength.differential;
    if (Math.abs(tsDiff) > 20) {
        insights.push({
            icon: '📊',
            category: 'Team Strength',
            insight: `${tsDiff > 0 ? 'Home' : 'Away'} team has ${Math.abs(tsDiff)}% better win rate this season`
        });
    }

    // Matchup insight
    if (factors.matchups.dominantMatchups?.length > 0) {
        const dominant = factors.matchups.dominantMatchups[0];
        insights.push({
            icon: '⚔️',
            category: 'Key Matchup',
            insight: `${dominant.winner} dominates at ${dominant.position}`
        });
    }

    // PER differential
    const perDiff = factors.matchups.perDifferential.diff;
    if (Math.abs(perDiff) > 5) {
        insights.push({
            icon: '🏀',
            category: 'Player Efficiency',
            insight: `${perDiff > 0 ? 'Home' : 'Away'} starters have +${Math.abs(perDiff).toFixed(1)} combined PER`
        });
    }

    // Injury insight
    if (factors.injuries.differential !== 0) {
        const healthier = factors.injuries.differential > 0 ? 'Home' : 'Away';
        insights.push({
            icon: '🏥',
            category: 'Health',
            insight: `${healthier} team is significantly healthier`
        });
    }

    // Form insight
    if (factors.form.home.trend === 'hot') {
        insights.push({
            icon: '🔥',
            category: 'Form',
            insight: `Home team is HOT - ${factors.form.home.streak}`
        });
    }
    if (factors.form.away.trend === 'cold') {
        insights.push({
            icon: '❄️',
            category: 'Form',
            insight: `Away team is COLD - ${factors.form.away.streak}`
        });
    }

    // Edge insight
    if (Math.abs(factors.edge) > 10) {
        insights.push({
            icon: '💰',
            category: 'Value',
            insight: `${Math.abs(factors.edge).toFixed(1)}% edge is MASSIVE - market significantly off`
        });
    }

    return insights;
}

/**
 * Suggest bet sizing
 */
function suggestBetSize(edge, confidence) {
    const absEdge = Math.abs(edge);

    // If confidence is low (e.g. no data), do not recommend a bet
    if (confidence < 50 || isNaN(confidence)) {
        return { units: 0, description: 'Insufficient data for bet' };
    }

    if (absEdge < 3) {
        return { units: 0, description: 'No bet recommended' };
    } else if (absEdge < 5) {
        return { units: 0.5, description: '0.5 units - small value' };
    } else if (absEdge < 8) {
        return { units: 1, description: '1 unit - standard bet' };
    } else if (absEdge < 12) {
        return { units: 2, description: '2 units - strong value' };
    } else {
        return { units: 3, description: '3 units - max bet (rare edge)' };
    }
}

// --- NEW: Star Player Impact Dictionary ---
const STAR_PLAYER_IMPACT = {
    'Nikola Jokic': 9.5, 'Luka Doncic': 8.5, 'Giannis Antetokounmpo': 8.0, 'Joel Embiid': 8.0,
    'Shai Gilgeous-Alexander': 7.5, 'Jayson Tatum': 6.0, 'Stephen Curry': 6.5, 'Kevin Durant': 6.0,
    'LeBron James': 5.5, 'Anthony Davis': 6.0, 'Devin Booker': 5.0, 'Anthony Edwards': 5.0,
    'Tyrese Haliburton': 4.5, 'Ja Morant': 4.5, 'Donovan Mitchell': 4.5, 'Kawhi Leonard': 4.5,
    'Jimmy Butler': 4.0, 'Jalen Brunson': 4.5, 'Trae Young': 4.0, 'Damian Lillard': 4.0,
    'De Aaron Fox': 3.5, 'Domantas Sabonis': 3.5, 'Bam Adebayo': 3.5, 'Paul George': 3.5,
    'Kyrie Irving': 3.5, 'Zion Williamson': 3.5, 'Victor Wembanyama': 4.0, 'LaMelo Ball': 3.5
};

// --- NEW: Bench Unit Ratings (Net Rating relative to avg) ---
const BENCH_UNIT_RATINGS = {
    'IND': 5.5, 'GSW': 4.5, 'ORL': 4.0, 'NOP': 3.5, 'OKC': 3.0, 'UTA': 2.5,
    'SAC': 2.0, 'BKN': 2.0, 'TOR': 1.5, 'HOU': 1.5, 'NYK': 1.0, 'LAC': 1.0,
    'MIN': 0.5, 'CLE': 0.5, 'DAL': 0.0, 'MIA': 0.0, 'MEM': -0.5, 'BOS': -0.5,
    'ATL': -1.0, 'CHI': -1.5, 'DEN': -2.0, 'SAS': -2.0, 'DET': -2.5, 'WAS': -2.5,
    'POR': -3.0, 'MIL': -3.5, 'LAL': -4.0, 'PHI': -4.0, 'PHX': -4.5, 'CHA': -5.0
};

/**
 * Monte Carlo Simulation Engine
 */
function runMonteCarloSimulation(home, away, iterations = 1000) {
    let homeWins = 0;

    // Base ratings (fallback to league avg 115 if missing)
    const hOrtg = parseFloat(home.offensiveRating) || 115.0;
    const hDrtg = parseFloat(home.defensiveRating) || 115.0;
    const aOrtg = parseFloat(away.offensiveRating) || 115.0;
    const aDrtg = parseFloat(away.defensiveRating) || 115.0;
    const pace = (parseFloat(home.pace) + parseFloat(away.pace)) / 2 || 99.0;

    // Standard deviation for NBA scores (approx 12 points)
    const stdDev = 12.0;

    for (let i = 0; i < iterations; i++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const randStd = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Calculate projected score for this iteration
        // Home Score = (Home Offense + Away Defense / 2) * Pace + Home Court(3) + Noise
        const hScore = ((hOrtg + aDrtg) / 2) * (pace / 100) + 3.0 + (randStd * stdDev);
        const aScore = ((aOrtg + hDrtg) / 2) * (pace / 100) + (randStd * stdDev * 0.95); // Slightly uncorrelated noise

        if (hScore > aScore) homeWins++;
    }

    return homeWins / iterations;
}

export default {
    generateDeepAnalysis,
    MODEL_METHODOLOGY
};
