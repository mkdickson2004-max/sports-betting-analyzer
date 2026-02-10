/**
 * Matchup Analyzer (Team-Level)
 * 
 * Analyzes stylistic matchups between teams using specific statistical categories.
 * Replaces individual player analysis when roster data is unavailable.
 */

export async function analyzeMatchups(homeTeam, awayTeam, injuries = {}, homeStats = {}, awayStats = {}) {
    // If stats are missing, return neutral
    if (!homeStats.derived || !awayStats.derived) {
        return generateNeutralMatchup();
    }

    const home = homeStats.offense || {};
    const away = awayStats.offense || {};
    const homeDef = homeStats.defense || {};
    const awayDef = awayStats.defense || {};

    // 1. Guard Play / Perimeter
    // 3PT Shooting, Assists, Steals (Defense)
    const homeGuardScore = normalize(home.threePointFieldGoalsPercentage?.value, 30, 40) +
        normalize(home.assists?.value, 20, 30) +
        normalize(homeDef.steals?.value, 5, 9);

    const awayGuardScore = normalize(away.threePointFieldGoalsPercentage?.value, 30, 40) +
        normalize(away.assists?.value, 20, 30) +
        normalize(awayDef.steals?.value, 5, 9);

    const guardAdvantage = calculateAdvantage(homeGuardScore, awayGuardScore);

    // 2. Wing Play / Scoring Versatility
    // FG%, Free Throws (Aggression), Turnovers (Discipline)
    const homeWingScore = normalize(home.fieldGoalsPercentage?.value, 42, 50) +
        normalize(home.freeThrowsAttempted?.value, 15, 25) -
        normalize(homeStats.general.turnovers?.value, 10, 16);

    const awayWingScore = normalize(away.fieldGoalsPercentage?.value, 42, 50) +
        normalize(away.freeThrowsAttempted?.value, 15, 25) -
        normalize(awayStats.general.turnovers?.value, 10, 16);

    const wingAdvantage = calculateAdvantage(homeWingScore, awayWingScore);

    // 3. Paint / Interior
    // Rebounding, Blocks, Paint Defense
    const homeBigScore = normalize(homeStats.general.rebounds?.value, 40, 50) +
        normalize(homeDef.blocks?.value, 3, 7);

    const awayBigScore = normalize(awayStats.general.rebounds?.value, 40, 50) +
        normalize(awayDef.blocks?.value, 3, 7);

    const paintAdvantage = calculateAdvantage(homeBigScore, awayBigScore);

    // 4. Bench / Depth (Using lookup if available, otherwise neutral)
    // This is handled in Team Strength usually, but we include a small factor here
    const benchAdvantage = 0; // Handled in deepAnalyzer

    // Aggregate
    const matchups = [
        { position: 'Guards', winner: guardAdvantage.winner, overallScore: guardAdvantage.score * 10, analysis: 'Perimeter matchup' },
        { position: 'Wings', winner: wingAdvantage.winner, overallScore: wingAdvantage.score * 10, analysis: 'Scoring versatility' },
        { position: 'Bigs', winner: paintAdvantage.winner, overallScore: paintAdvantage.score * 10, analysis: 'Paint dominance' }
    ];

    const totalScore = matchups.reduce((sum, m) => sum + m.overallScore, 0);
    const overallAdvantage = totalScore > 10 ? 'home' : totalScore < -10 ? 'away' : 'even';

    return {
        matchups,
        summary: {
            homeMatchupWins: matchups.filter(m => m.winner === 'home').length,
            awayMatchupWins: matchups.filter(m => m.winner === 'away').length,
            evenMatchups: matchups.filter(m => m.winner === 'even').length,
            averageScore: totalScore / 3,
            overallAdvantage
        },
        overallAdvantage: {
            score: totalScore,
            probabilityImpact: Math.max(-25, Math.min(25, totalScore)), // -25% to +25% impact
            description: getAdvantageDescription(totalScore)
        },
        // Legacy support for UI
        homeLineup: [],
        awayLineup: []
    };
}

function normalize(val, min, max) {
    if (!val) return 0.5;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function calculateAdvantage(homeScore, awayScore) {
    const diff = homeScore - awayScore;
    const score = Math.round(diff * 10); // Scale to simplified integer
    return {
        score,
        winner: score > 1 ? 'home' : score < -1 ? 'away' : 'even'
    };
}

function getAdvantageDescription(score) {
    if (score > 15) return 'Home has significant stylistic advantage';
    if (score > 5) return 'Home has slight edge in key areas';
    if (score < -15) return 'Away has significant stylistic advantage';
    if (score < -5) return 'Away has slight edge in key areas';
    return 'Teams match up evenly';
}

function generateNeutralMatchup() {
    return {
        matchups: [],
        summary: {
            homeMatchupWins: 0,
            awayMatchupWins: 0,
            overallAdvantage: 'neutral'
        },
        overallAdvantage: { score: 0, probabilityImpact: 0, description: 'Neutral' }
    };
}

export default {
    analyzeMatchups
};
