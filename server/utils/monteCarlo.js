
/**
 * Monte Carlo Simulation for NBA Totals (Over/Under)
 * Simulates 1000 games based on Team Stats (Pace, Efficiency).
 */
export function runMonteCarloSimulation(homeStats, awayStats, iterations = 1000) {
    // Default stats if missing
    const hPace = homeStats.pace || 98.0;
    const aPace = awayStats.pace || 98.0;
    const hOffRtg = (homeStats.avgPoints / hPace) * 100 || 112.0;
    const aOffRtg = (awayStats.avgPoints / aPace) * 100 || 112.0;
    const hDefRtg = homeStats.defRtg || 112.0; // If available, else infer?
    const aDefRtg = awayStats.defRtg || 112.0;

    // Estimate Game Pace (Average of both)
    const gamePaceMean = (hPace + aPace) / 2;
    const gamePaceStd = 4.0; // Standard Deviation for Pace

    // Estimate Efficiency (Offense meets Defense)
    // Home score roughly: (Home OffRtg + Away DefRtg) / 2 * Pace / 100
    // But we simpler uses PPG variance.
    // Let's use PPG directly for simplicity as 'base' but adjust for matchup pace.

    // Adjusted PPG = TeamPPG * (GamePace / TeamPace)
    const hAdjPPG = (homeStats.avgPoints || 112) * (gamePaceMean / hPace);
    const aAdjPPG = (awayStats.avgPoints || 112) * (gamePaceMean / aPace);

    const scoreStd = 12.0; // Standard Deviation for Score

    let totalPoints = 0;
    let homeTotal = 0;
    let awayTotal = 0;
    let overs = 0; // Count games over a hypothetical line (we calculate distribution)

    // Store all totals to calculate probabilities later if needed
    // For now we return average projected total

    for (let i = 0; i < iterations; i++) {
        // Box-Muller for Normal Distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        // Simulate Scores
        const hScore = hAdjPPG + 3 + (z1 * scoreStd); // +3 Home Advantage
        const aScore = aAdjPPG + (z2 * scoreStd);

        homeTotal += hScore;
        awayTotal += aScore;
        totalPoints += (hScore + aScore);
    }

    const avgHome = homeTotal / iterations;
    const avgAway = awayTotal / iterations;
    const avgTotal = avgHome + avgAway;

    return {
        homeScore: Math.round(avgHome),
        awayScore: Math.round(avgAway),
        totalScore: Math.round(avgTotal),
        details: `Simulated ${iterations} games based on pace-adjusted efficiency.`
    };
}
