/**
 * Matchup Analyzer
 * 
 * Analyzes position-by-position matchups between starters
 * Calculates individual matchup advantages and overall team impact
 */

/**
 * Analyze position-by-position matchups
 */
export async function analyzeMatchups(homeTeam, awayTeam, injuries = {}) {
    // Fallback to simulated/general matchups until real lineup API is integrated
    return generateSimulatedMatchups(homeTeam, awayTeam);
}

/**
 * Analyze a single position matchup
 */
function analyzePositionMatchup(homePlayer, awayPlayer, position) {
    const homeStats = homePlayer.stats;
    const awayStats = awayPlayer.stats;

    // Position-specific factors
    const factors = getPositionFactors(position);

    // Calculate advantages in each category
    const offensiveAdvantage = calculateOffensiveAdvantage(homeStats, awayStats, factors);
    const defensiveAdvantage = calculateDefensiveAdvantage(homeStats, awayStats, factors);
    const efficiencyAdvantage = calculateEfficiencyAdvantage(homeStats, awayStats);
    const recentFormAdvantage = calculateRecentFormAdvantage(homeStats, awayStats);

    // Overall matchup score (-100 to +100, positive = home advantage)
    const overallScore = Math.round(
        (offensiveAdvantage * 0.35) +
        (defensiveAdvantage * 0.25) +
        (efficiencyAdvantage * 0.25) +
        (recentFormAdvantage * 0.15)
    );

    // Determine winner
    const winner = overallScore > 5 ? 'home' : overallScore < -5 ? 'away' : 'even';
    const winnerPlayer = winner === 'home' ? homePlayer : winner === 'away' ? awayPlayer : null;

    return {
        position,
        homePlayer: {
            name: homePlayer.name,
            jersey: homePlayer.jersey,
            stats: formatPlayerStats(homeStats)
        },
        awayPlayer: {
            name: awayPlayer.name,
            jersey: awayPlayer.jersey,
            stats: formatPlayerStats(awayStats)
        },
        advantages: {
            offensive: offensiveAdvantage,
            defensive: defensiveAdvantage,
            efficiency: efficiencyAdvantage,
            recentForm: recentFormAdvantage
        },
        overallScore,
        winner,
        winnerName: winnerPlayer?.name || 'Even matchup',
        analysis: generateMatchupAnalysis(homePlayer, awayPlayer, overallScore, factors),
        keyFactors: identifyKeyFactors(homeStats, awayStats, position)
    };
}

/**
 * Get position-specific importance factors
 */
function getPositionFactors(position) {
    const factors = {
        'PG': {
            offensive: ['apg', 'ppg', 'fg3Pct', 'usagePct'],
            defensive: ['spg', 'drtg'],
            keyStats: ['assists', 'turnovers', 'court vision'],
            description: 'floor general, playmaking, perimeter defense'
        },
        'SG': {
            offensive: ['ppg', 'fg3Pct', 'fgPct', 'usagePct'],
            defensive: ['spg', 'drtg'],
            keyStats: ['three-point shooting', 'scoring', 'perimeter D'],
            description: 'scoring, three-point shooting, wing defense'
        },
        'SF': {
            offensive: ['ppg', 'rpg', 'fg3Pct'],
            defensive: ['spg', 'bpg', 'drtg'],
            keyStats: ['versatility', 'two-way play', 'rebounding'],
            description: 'versatility, two-way play, wing scoring'
        },
        'PF': {
            offensive: ['ppg', 'rpg', 'fgPct'],
            defensive: ['rpg', 'bpg', 'drtg'],
            keyStats: ['rebounding', 'rim protection', 'post scoring'],
            description: 'interior scoring, rebounding, help defense'
        },
        'C': {
            offensive: ['ppg', 'fgPct', 'rpg'],
            defensive: ['rpg', 'bpg', 'drtg'],
            keyStats: ['rim protection', 'rebounding', 'interior scoring'],
            description: 'rim protection, rebounding, paint presence'
        }
    };

    return factors[position] || factors['SF'];
}

/**
 * Calculate offensive advantage
 */
function calculateOffensiveAdvantage(homeStats, awayStats, factors) {
    let advantage = 0;

    // Points per game
    advantage += (homeStats.ppg - awayStats.ppg) * 2;

    // True shooting percentage
    advantage += (homeStats.tsPct - awayStats.tsPct) * 1.5;

    // Usage rate impact
    advantage += (homeStats.usagePct - awayStats.usagePct) * 0.5;

    // Assists (especially for guards)
    if (factors.offensive.includes('apg')) {
        advantage += (homeStats.apg - awayStats.apg) * 2;
    }

    // Offensive rating
    advantage += (homeStats.ortg - awayStats.ortg) * 0.3;

    return Math.max(-50, Math.min(50, advantage));
}

/**
 * Calculate defensive advantage
 */
function calculateDefensiveAdvantage(homeStats, awayStats, factors) {
    let advantage = 0;

    // Defensive rating (lower is better)
    advantage -= (homeStats.drtg - awayStats.drtg) * 0.5;

    // Steals
    advantage += (homeStats.spg - awayStats.spg) * 3;

    // Blocks (especially for bigs)
    if (factors.defensive.includes('bpg')) {
        advantage += (homeStats.bpg - awayStats.bpg) * 4;
    }

    // Defensive rebounds
    advantage += (homeStats.rpg - awayStats.rpg) * 0.5;

    return Math.max(-50, Math.min(50, advantage));
}

/**
 * Calculate efficiency advantage
 */
function calculateEfficiencyAdvantage(homeStats, awayStats) {
    let advantage = 0;

    // PER (Player Efficiency Rating)
    advantage += (homeStats.per - awayStats.per) * 2;

    // BPM (Box Plus/Minus)
    advantage += (homeStats.bpm - awayStats.bpm) * 3;

    // VORP
    advantage += (homeStats.vorp - awayStats.vorp) * 5;

    return Math.max(-50, Math.min(50, advantage));
}

/**
 * Calculate recent form advantage
 */
function calculateRecentFormAdvantage(homeStats, awayStats) {
    let advantage = 0;

    if (homeStats.last5 && awayStats.last5) {
        // Recent PPG
        advantage += (homeStats.last5.ppg - awayStats.last5.ppg) * 1.5;

        // Plus/minus
        advantage += (homeStats.last5.plusMinus - awayStats.last5.plusMinus) * 2;

        // Win percentage
        advantage += (homeStats.last5.winPct - awayStats.last5.winPct) * 0.3;
    }

    return Math.max(-50, Math.min(50, advantage));
}

/**
 * Format player stats for display
 */
function formatPlayerStats(stats) {
    return {
        ppg: stats.ppg,
        rpg: stats.rpg,
        apg: stats.apg,
        spg: stats.spg,
        bpg: stats.bpg,
        mpg: stats.mpg,
        fgPct: stats.fgPct,
        fg3Pct: stats.fg3Pct,
        ftPct: stats.ftPct,
        per: stats.per,
        tsPct: stats.tsPct,
        usagePct: stats.usagePct,
        ortg: stats.ortg,
        drtg: stats.drtg,
        bpm: stats.bpm,
        vorp: stats.vorp,
        last5: stats.last5
    };
}

/**
 * Generate analysis text for a matchup
 */
function generateMatchupAnalysis(homePlayer, awayPlayer, score, factors) {
    const homeStats = homePlayer.stats;
    const awayStats = awayPlayer.stats;
    const absScore = Math.abs(score);

    let analysis = '';

    if (absScore < 5) {
        analysis = `This is an evenly matched battle. ${homePlayer.name} (${homeStats.ppg}/${homeStats.rpg}/${homeStats.apg}) and ${awayPlayer.name} (${awayStats.ppg}/${awayStats.rpg}/${awayStats.apg}) have similar production. Expect this matchup to be a push.`;
    } else if (absScore < 15) {
        const winner = score > 0 ? homePlayer : awayPlayer;
        const loser = score > 0 ? awayPlayer : homePlayer;
        const winnerStats = score > 0 ? homeStats : awayStats;
        analysis = `${winner.name} has a slight edge with ${winnerStats.ppg} PPG and ${winnerStats.per} PER. ${loser.name} will need to step up defensively to neutralize this advantage.`;
    } else if (absScore < 30) {
        const winner = score > 0 ? homePlayer : awayPlayer;
        const loser = score > 0 ? awayPlayer : homePlayer;
        const winnerStats = score > 0 ? homeStats : awayStats;
        analysis = `${winner.name} holds a significant advantage in this matchup. With ${winnerStats.ppg}/${winnerStats.rpg}/${winnerStats.apg} and a ${winnerStats.tsPct}% TS%, ${winner.name} should dominate the ${factors.description}.`;
    } else {
        const winner = score > 0 ? homePlayer : awayPlayer;
        const winnerStats = score > 0 ? homeStats : awayStats;
        analysis = `This is a mismatch. ${winner.name} is the clear superior player with ${winnerStats.ppg} PPG, ${winnerStats.per} PER, and ${winnerStats.bpm} BPM. This position heavily favors ${score > 0 ? 'home' : 'away'}.`;
    }

    return analysis;
}

/**
 * Identify key factors in a matchup
 */
function identifyKeyFactors(homeStats, awayStats, position) {
    const factors = [];

    // Check major stat differentials
    const ppgDiff = homeStats.ppg - awayStats.ppg;
    if (Math.abs(ppgDiff) > 5) {
        factors.push({
            stat: 'Scoring',
            advantage: ppgDiff > 0 ? 'home' : 'away',
            value: `${Math.abs(ppgDiff).toFixed(1)} PPG difference`,
            impact: ppgDiff > 10 ? 'major' : 'moderate'
        });
    }

    const perDiff = homeStats.per - awayStats.per;
    if (Math.abs(perDiff) > 3) {
        factors.push({
            stat: 'Efficiency',
            advantage: perDiff > 0 ? 'home' : 'away',
            value: `${Math.abs(perDiff).toFixed(1)} PER difference`,
            impact: perDiff > 6 ? 'major' : 'moderate'
        });
    }

    // Position-specific factors
    if (['PG', 'SG'].includes(position)) {
        const apgDiff = homeStats.apg - awayStats.apg;
        if (Math.abs(apgDiff) > 3) {
            factors.push({
                stat: 'Playmaking',
                advantage: apgDiff > 0 ? 'home' : 'away',
                value: `${Math.abs(apgDiff).toFixed(1)} APG difference`,
                impact: 'moderate'
            });
        }
    }

    if (['PF', 'C'].includes(position)) {
        const rpgDiff = homeStats.rpg - awayStats.rpg;
        if (Math.abs(rpgDiff) > 3) {
            factors.push({
                stat: 'Rebounding',
                advantage: rpgDiff > 0 ? 'home' : 'away',
                value: `${Math.abs(rpgDiff).toFixed(1)} RPG difference`,
                impact: 'moderate'
            });
        }

        const bpgDiff = homeStats.bpg - awayStats.bpg;
        if (Math.abs(bpgDiff) > 1) {
            factors.push({
                stat: 'Rim Protection',
                advantage: bpgDiff > 0 ? 'home' : 'away',
                value: `${Math.abs(bpgDiff).toFixed(1)} BPG difference`,
                impact: 'moderate'
            });
        }
    }

    // Recent form
    if (homeStats.last5 && awayStats.last5) {
        const formDiff = homeStats.last5.plusMinus - awayStats.last5.plusMinus;
        if (Math.abs(formDiff) > 5) {
            factors.push({
                stat: 'Recent Form',
                advantage: formDiff > 0 ? 'home' : 'away',
                value: `${formDiff > 0 ? '+' : ''}${formDiff.toFixed(1)} +/- L5`,
                impact: Math.abs(formDiff) > 10 ? 'major' : 'moderate'
            });
        }
    }

    return factors;
}

/**
 * Generate overall matchup summary
 */
function generateMatchupSummary(matchups) {
    const homeWins = matchups.filter(m => m.winner === 'home').length;
    const awayWins = matchups.filter(m => m.winner === 'away').length;
    const evenMatchups = matchups.filter(m => m.winner === 'even').length;

    const totalScore = matchups.reduce((sum, m) => sum + m.overallScore, 0);
    const avgScore = totalScore / matchups.length;

    // Find key matchups
    const keyMatchups = matchups
        .filter(m => Math.abs(m.overallScore) > 15)
        .map(m => ({
            position: m.position,
            winner: m.winnerName,
            advantage: m.winner,
            score: Math.abs(m.overallScore)
        }));

    return {
        homeMatchupWins: homeWins,
        awayMatchupWins: awayWins,
        evenMatchups,
        averageScore: Math.round(avgScore * 10) / 10,
        keyMatchups,
        overallAdvantage: homeWins > awayWins ? 'home' : awayWins > homeWins ? 'away' : 'even'
    };
}

/**
 * Calculate overall advantage from matchups
 */
function calculateOverallAdvantage(matchups) {
    const totalScore = matchups.reduce((sum, m) => sum + m.overallScore, 0);

    // Convert to probability impact (-30 to +30 percentage points)
    const probabilityImpact = Math.max(-30, Math.min(30, totalScore / 5));

    return {
        score: totalScore,
        probabilityImpact,
        description: getAdvantageDescription(totalScore)
    };
}

function getAdvantageDescription(score) {
    if (score > 50) return 'Dominant matchup advantage for home team';
    if (score > 25) return 'Significant starter advantage for home team';
    if (score > 10) return 'Slight matchup edge for home team';
    if (score > -10) return 'Evenly matched starters';
    if (score > -25) return 'Slight matchup edge for away team';
    if (score > -50) return 'Significant starter advantage for away team';
    return 'Dominant matchup advantage for away team';
}

/**
 * Generate placeholder matchups when no roster data available
 */
function generateSimulatedMatchups(homeTeam, awayTeam) {
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

    // Minimal placeholder stats to prevent crashes
    const getPlaceholderStats = () => ({
        ppg: 10, rpg: 4, apg: 2, spg: 0.8, bpg: 0.4, mpg: 25,
        fgPct: 45, fg3Pct: 35, ftPct: 75, per: 15, tsPct: 55,
        usagePct: 20, ortg: 105, drtg: 105, bpm: 0, vorp: 0,
        last5: { ppg: 10, plusMinus: 0, winPct: 50 }
    });

    const matchups = positions.map(pos => {
        const homePlayer = { name: `${homeTeam?.abbr || 'Home'} ${pos}`, position: pos, stats: getPlaceholderStats() };
        const awayPlayer = { name: `${awayTeam?.abbr || 'Away'} ${pos}`, position: pos, stats: getPlaceholderStats() };

        return {
            ...analyzePositionMatchup(homePlayer, awayPlayer, pos),
            winner: 'even',
            winnerName: 'Even',
            overallScore: 0,
            analysis: 'Roster data unavailable for detailed matchup analysis.'
        };
    });

    return {
        matchups,
        homeLineup: positions.map(pos => ({ name: `${homeTeam?.abbr || 'Home'} ${pos}`, position: pos, stats: getPlaceholderStats() })),
        awayLineup: positions.map(pos => ({ name: `${awayTeam?.abbr || 'Away'} ${pos}`, position: pos, stats: getPlaceholderStats() })),
        summary: {
            homeMatchupWins: 0,
            awayMatchupWins: 0,
            evenMatchups: 5,
            averageScore: 0,
            keyMatchups: [],
            overallAdvantage: 'neutral'
        },
        overallAdvantage: {
            score: 0,
            probabilityImpact: 0,
            description: 'Data Unavailable'
        }
    };
}

export default {
    analyzeMatchups
};
