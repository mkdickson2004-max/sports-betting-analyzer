/**
 * ELO RATING ENGINE
 * 
 * Calculates and maintains ELO ratings based on real game results.
 * Uses chess-style ELO adapted for sports with home advantage adjustments.
 */

const BASE_ELO = 1500;
const K_FACTOR = 20; // How much a single game affects rating
const HOME_ADVANTAGE = 100; // ELO points equivalent of home court

// Store ELO history for all teams
const eloHistory = new Map();

/**
 * Initialize ELO ratings for all teams
 */
export function initializeEloRatings(teams) {
    teams.forEach(team => {
        if (!eloHistory.has(team.abbr)) {
            eloHistory.set(team.abbr, {
                current: BASE_ELO,
                history: [{ date: 'initial', elo: BASE_ELO }],
                games: 0,
                wins: 0,
                losses: 0
            });
        }
    });

    return Object.fromEntries(eloHistory);
}

/**
 * Calculate expected win probability
 */
export function expectedWinProbability(teamElo, opponentElo, isHome = false) {
    const adjustedElo = isHome ? teamElo + HOME_ADVANTAGE : teamElo;
    const adjustedOppElo = isHome ? opponentElo : opponentElo + HOME_ADVANTAGE;

    return 1 / (1 + Math.pow(10, (adjustedOppElo - adjustedElo) / 400));
}

/**
 * Update ELO after a game result
 */
export function updateElo(team, opponent, won, isHome, gameDate) {
    const teamData = eloHistory.get(team) || { current: BASE_ELO, history: [], games: 0, wins: 0, losses: 0 };
    const oppData = eloHistory.get(opponent) || { current: BASE_ELO, history: [], games: 0, wins: 0, losses: 0 };

    const expectedWin = expectedWinProbability(teamData.current, oppData.current, isHome);
    const actualResult = won ? 1 : 0;

    // Calculate new ELO
    const change = Math.round(K_FACTOR * (actualResult - expectedWin));
    const newElo = teamData.current + change;

    // Update team data
    teamData.current = newElo;
    teamData.games++;
    if (won) teamData.wins++;
    else teamData.losses++;
    teamData.history.push({
        date: gameDate,
        elo: newElo,
        change,
        opponent,
        won
    });

    eloHistory.set(team, teamData);

    return {
        team,
        previousElo: newElo - change,
        newElo,
        change,
        expectedWin: Math.round(expectedWin * 100)
    };
}

/**
 * Process a batch of historical games to build ELO ratings
 */
export function processHistoricalGames(games) {
    console.log(`[ELO ENGINE] Processing ${games.length} historical games...`);

    // Sort games by date
    const sortedGames = [...games].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    sortedGames.forEach(game => {
        const homeWon = parseInt(game.homeScore) > parseInt(game.awayScore);

        // Update home team
        updateElo(
            game.homeTeam,
            game.awayTeam,
            homeWon,
            true,
            game.date
        );

        // Update away team
        updateElo(
            game.awayTeam,
            game.homeTeam,
            !homeWon,
            false,
            game.date
        );
    });

    console.log(`[ELO ENGINE] ✓ Processed ${games.length} games`);
    return getEloRankings();
}

/**
 * Get current ELO rankings (sorted)
 */
export function getEloRankings() {
    const rankings = [];

    eloHistory.forEach((data, team) => {
        rankings.push({
            team,
            elo: data.current,
            games: data.games,
            wins: data.wins,
            losses: data.losses,
            winPct: data.games > 0 ? (data.wins / data.games * 100).toFixed(1) : 0,
            recentTrend: getRecentTrend(data.history)
        });
    });

    return rankings.sort((a, b) => b.elo - a.elo);
}

/**
 * Calculate recent ELO trend (last 5 games)
 */
function getRecentTrend(history) {
    if (history.length < 2) return 0;

    const recent = history.slice(-6); // Last 5 changes + current
    if (recent.length < 2) return 0;

    const oldElo = recent[0].elo;
    const newElo = recent[recent.length - 1].elo;

    return newElo - oldElo;
}

/**
 * Get ELO tier description
 */
export function getEloTier(elo) {
    if (elo >= 1700) return { tier: 'Elite', color: '#10b981', emoji: '🏆' };
    if (elo >= 1600) return { tier: 'Strong', color: '#3b82f6', emoji: '⭐' };
    if (elo >= 1500) return { tier: 'Average', color: '#f59e0b', emoji: '📊' };
    if (elo >= 1400) return { tier: 'Below Average', color: '#f97316', emoji: '📉' };
    return { tier: 'Weak', color: '#ef4444', emoji: '⚠️' };
}

/**
 * Predict matchup outcome
 */
export function predictMatchup(homeTeam, awayTeam) {
    const homeData = eloHistory.get(homeTeam);
    const awayData = eloHistory.get(awayTeam);

    if (!homeData || !awayData) {
        return { error: 'Team not found' };
    }

    const homeWinProb = expectedWinProbability(homeData.current, awayData.current, true);

    return {
        homeTeam,
        awayTeam,
        homeElo: homeData.current,
        awayElo: awayData.current,
        eloDiff: homeData.current - awayData.current,
        homeWinProb: Math.round(homeWinProb * 100),
        awayWinProb: Math.round((1 - homeWinProb) * 100),
        favoredTeam: homeWinProb > 0.5 ? homeTeam : awayTeam,
        homeRecord: `${homeData.wins}-${homeData.losses}`,
        awayRecord: `${awayData.wins}-${awayData.losses}`
    };
}

/**
 * Export all ELO data
 */
export function exportEloData() {
    return {
        rankings: getEloRankings(),
        history: Object.fromEntries(eloHistory),
        metadata: {
            kFactor: K_FACTOR,
            homeAdvantage: HOME_ADVANTAGE,
            baseElo: BASE_ELO
        }
    };
}

export default {
    initializeEloRatings,
    updateElo,
    processHistoricalGames,
    getEloRankings,
    getEloTier,
    predictMatchup,
    expectedWinProbability,
    exportEloData
};
