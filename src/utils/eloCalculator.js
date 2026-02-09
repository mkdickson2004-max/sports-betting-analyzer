/**
 * ELO Rating Calculator
 * Chess-style ELO system adapted for sports betting
 */

// K-factor determines how much a single game affects the rating
const K_FACTOR = 32;
const BASE_ELO = 1500;

/**
 * Calculate expected win probability based on ELO ratings
 * @param {number} teamElo - Team's ELO rating
 * @param {number} opponentElo - Opponent's ELO rating
 * @returns {number} Expected win probability (0-1)
 */
export function calculateExpectedWinProb(teamElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - teamElo) / 400));
}

/**
 * Update ELO rating based on game result
 * @param {number} currentElo - Current ELO rating
 * @param {number} expectedWin - Expected win probability
 * @param {number} actualResult - 1 for win, 0 for loss, 0.5 for draw
 * @returns {number} New ELO rating
 */
export function updateEloRating(currentElo, expectedWin, actualResult) {
  return Math.round(currentElo + K_FACTOR * (actualResult - expectedWin));
}

/**
 * Calculate ELO ratings for a team based on their game history
 * @param {Array} games - Array of game results {opponent: string, opponentElo: number, won: boolean}
 * @param {number} startingElo - Starting ELO rating
 * @returns {number} Final ELO rating
 */
export function calculateTeamElo(games, startingElo = BASE_ELO) {
  let elo = startingElo;
  
  games.forEach(game => {
    const expectedWin = calculateExpectedWinProb(elo, game.opponentElo || BASE_ELO);
    const result = game.won ? 1 : 0;
    elo = updateEloRating(elo, expectedWin, result);
  });
  
  return elo;
}

/**
 * Get ELO tier/rank description
 * @param {number} elo - ELO rating
 * @returns {object} Tier info with name and color
 */
export function getEloTier(elo) {
  if (elo >= 1700) return { tier: 'Elite', color: '#10b981', emoji: '🏆' };
  if (elo >= 1600) return { tier: 'Strong', color: '#3b82f6', emoji: '⭐' };
  if (elo >= 1500) return { tier: 'Average', color: '#f59e0b', emoji: '📊' };
  if (elo >= 1400) return { tier: 'Below Average', color: '#f97316', emoji: '📉' };
  return { tier: 'Weak', color: '#ef4444', emoji: '⚠️' };
}

/**
 * Calculate win probability between two teams using their ELO
 * @param {number} teamAElo - Team A ELO
 * @param {number} teamBElo - Team B ELO
 * @returns {object} Win probabilities for both teams
 */
export function getMatchupProbabilities(teamAElo, teamBElo) {
  const teamAProb = calculateExpectedWinProb(teamAElo, teamBElo);
  const teamBProb = 1 - teamAProb;
  
  return {
    teamA: teamAProb,
    teamB: teamBProb,
    teamAPercent: Math.round(teamAProb * 100),
    teamBPercent: Math.round(teamBProb * 100),
    favorite: teamAProb > 0.5 ? 'A' : 'B',
    edge: Math.abs(teamAProb - 0.5) * 100
  };
}
