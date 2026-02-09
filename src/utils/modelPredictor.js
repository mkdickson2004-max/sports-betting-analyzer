/**
 * Statistical Model for Win Probability Prediction
 * Simulates a logistic regression / XGBoost-style model
 */

/**
 * Feature weights (simulating trained model coefficients)
 * In production, these would come from a trained ML model
 */
const FEATURE_WEIGHTS = {
    eloAdvantage: 0.003,        // ELO difference
    recentFormWinPct: 0.15,     // Last 10 games win %
    homeAdvantage: 0.06,        // Playing at home
    restDaysAdvantage: 0.02,    // Extra rest days
    injuryImpact: -0.08,        // Key player injuries
    h2hAdvantage: 0.05,         // Head-to-head record
    atsStreak: 0.03,            // Against the spread streak
    defenseRank: -0.005,        // Defensive ranking (lower = better)
    offenseRank: -0.004,        // Offensive ranking
    travelFatigue: -0.04,       // Road trip fatigue
    backToBack: -0.07,          // Back-to-back game
    netRatingDiff: 0.008,       // Net rating differential
};

/**
 * Sigmoid function for logistic regression
 */
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate win probability based on multiple factors
 * @param {object} features - Team and matchup features
 * @returns {object} Prediction with probability and confidence
 */
export function predictWinProbability(features) {
    let logOdds = 0;
    const contributions = {};

    // ELO advantage (most significant factor)
    if (features.teamElo && features.opponentElo) {
        const eloDiff = features.teamElo - features.opponentElo;
        const contribution = eloDiff * FEATURE_WEIGHTS.eloAdvantage;
        logOdds += contribution;
        contributions.elo = { value: eloDiff, impact: contribution };
    }

    // Recent form (last 10 games)
    if (features.recentWinPct !== undefined) {
        const formAboveAvg = features.recentWinPct - 0.5;
        const contribution = formAboveAvg * FEATURE_WEIGHTS.recentFormWinPct * 10;
        logOdds += contribution;
        contributions.form = { value: features.recentWinPct, impact: contribution };
    }

    // Home advantage
    if (features.isHome) {
        logOdds += FEATURE_WEIGHTS.homeAdvantage;
        contributions.home = { value: true, impact: FEATURE_WEIGHTS.homeAdvantage };
    }

    // Rest days
    if (features.restDays !== undefined && features.opponentRestDays !== undefined) {
        const restAdvantage = features.restDays - features.opponentRestDays;
        const contribution = restAdvantage * FEATURE_WEIGHTS.restDaysAdvantage;
        logOdds += contribution;
        contributions.rest = { value: restAdvantage, impact: contribution };
    }

    // Key player injuries
    if (features.keyPlayerOut) {
        logOdds += FEATURE_WEIGHTS.injuryImpact;
        contributions.injury = { value: true, impact: FEATURE_WEIGHTS.injuryImpact };
    }

    // Head-to-head record
    if (features.h2hWinPct !== undefined) {
        const h2hAboveAvg = features.h2hWinPct - 0.5;
        const contribution = h2hAboveAvg * FEATURE_WEIGHTS.h2hAdvantage * 10;
        logOdds += contribution;
        contributions.h2h = { value: features.h2hWinPct, impact: contribution };
    }

    // Back-to-back games
    if (features.isBackToBack) {
        const contribution = FEATURE_WEIGHTS.backToBack;
        logOdds += contribution;
        contributions.backToBack = { value: true, impact: contribution };
    }

    // Net Rating differential
    if (features.netRating !== undefined && features.opponentNetRating !== undefined) {
        const ratingDiff = features.netRating - features.opponentNetRating;
        const contribution = ratingDiff * FEATURE_WEIGHTS.netRatingDiff;
        logOdds += contribution;
        contributions.netRating = { value: ratingDiff, impact: contribution };
    }

    // Defense rank impact
    if (features.defenseRank) {
        const defenseScore = (16 - features.defenseRank); // Centered around league average
        const contribution = defenseScore * FEATURE_WEIGHTS.defenseRank * -1;
        logOdds += contribution;
        contributions.defense = { value: features.defenseRank, impact: contribution };
    }

    const probability = sigmoid(logOdds);

    // Calculate confidence based on feature count and magnitude
    const activeFeatures = Object.keys(contributions).length;
    const totalImpact = Object.values(contributions).reduce((sum, c) => sum + Math.abs(c.impact), 0);
    const confidence = Math.min(0.95, 0.5 + (activeFeatures * 0.05) + (totalImpact * 0.1));

    return {
        probability: Math.round(probability * 1000) / 1000,
        probabilityPercent: Math.round(probability * 100),
        confidence: Math.round(confidence * 100) / 100,
        logOdds: Math.round(logOdds * 1000) / 1000,
        contributions,
        activeFactors: activeFeatures
    };
}

/**
 * Generate human-readable reasons for the prediction
 * @param {object} prediction - Prediction object with contributions
 * @param {object} teamData - Additional team data
 * @returns {Array} Array of reason objects
 */
export function generateReasons(prediction, teamData) {
    const reasons = [];
    const { contributions } = prediction;

    // Sort contributions by absolute impact
    const sorted = Object.entries(contributions)
        .sort((a, b) => Math.abs(b[1].impact) - Math.abs(a[1].impact));

    sorted.forEach(([key, data], index) => {
        const labels = ['X', 'Y', 'Z', 'W', 'V'];
        const label = labels[index] || '#';

        let reason = '';
        let type = data.impact > 0 ? 'positive' : 'negative';

        switch (key) {
            case 'elo':
                reason = data.value > 0
                    ? `ELO advantage of +${data.value} points (stronger overall team)`
                    : `ELO disadvantage of ${data.value} points`;
                break;
            case 'form':
                const winPct = Math.round(data.value * 100);
                reason = `Recent form: ${winPct}% win rate over last 10 games`;
                if (winPct >= 70) reason += ' (on fire 🔥)';
                break;
            case 'home':
                reason = 'Home court advantage factor';
                break;
            case 'rest':
                reason = data.value > 0
                    ? `${data.value}+ day${data.value > 1 ? 's' : ''} extra rest vs opponent`
                    : `Less rest than opponent (${Math.abs(data.value)} days)`;
                break;
            case 'injury':
                reason = 'Key player(s) injured or out';
                type = 'negative';
                break;
            case 'h2h':
                const h2hPct = Math.round(data.value * 100);
                reason = `Head-to-head: ${h2hPct}% win rate vs this opponent`;
                break;
            case 'backToBack':
                reason = 'Playing on back-to-back (fatigue factor)';
                type = 'negative';
                break;
            case 'netRating':
                reason = data.value > 0
                    ? `Net rating advantage: +${data.value.toFixed(1)} differential`
                    : `Net rating deficit: ${data.value.toFixed(1)} differential`;
                break;
            case 'defense':
                reason = data.value <= 10
                    ? `Top-${data.value} defense in the league`
                    : `Defense ranked #${data.value}`;
                break;
            default:
                reason = `${key}: ${data.value}`;
        }

        reasons.push({
            label,
            reason,
            type,
            impact: Math.round(Math.abs(data.impact) * 100) / 100,
            factor: key
        });
    });

    return reasons;
}

/**
 * Generate a comprehensive game analysis
 * @param {object} homeTeam - Home team data
 * @param {object} awayTeam - Away team data
 * @returns {object} Complete analysis
 */
export function analyzeMatchup(homeTeam, awayTeam) {
    const homeFeatures = {
        teamElo: homeTeam.elo,
        opponentElo: awayTeam.elo,
        recentWinPct: homeTeam.last10WinPct,
        isHome: true,
        restDays: homeTeam.restDays,
        opponentRestDays: awayTeam.restDays,
        keyPlayerOut: homeTeam.keyPlayerOut,
        h2hWinPct: homeTeam.h2hWinPct,
        isBackToBack: homeTeam.isBackToBack,
        netRating: homeTeam.netRating,
        opponentNetRating: awayTeam.netRating,
        defenseRank: homeTeam.defenseRank
    };

    const homePrediction = predictWinProbability(homeFeatures);
    const homeReasons = generateReasons(homePrediction, homeTeam);

    return {
        homeWinProb: homePrediction.probabilityPercent,
        awayWinProb: 100 - homePrediction.probabilityPercent,
        confidence: Math.round(homePrediction.confidence * 100),
        favoredTeam: homePrediction.probability > 0.5 ? 'home' : 'away',
        favoredBy: Math.abs(homePrediction.probabilityPercent - 50),
        reasons: homeReasons,
        rawPrediction: homePrediction
    };
}
