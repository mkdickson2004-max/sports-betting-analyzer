/**
 * Odds Conversion and Edge Detection Utilities
 */

/**
 * Convert American odds to implied probability
 * @param {number} americanOdds - American odds (e.g., -110, +150)
 * @returns {number} Implied probability (0-1)
 */
export function americanToImpliedProb(americanOdds) {
    if (americanOdds < 0) {
        return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
    return 100 / (americanOdds + 100);
}

/**
 * Convert implied probability to American odds
 * @param {number} probability - Probability (0-1)
 * @returns {number} American odds
 */
export function impliedProbToAmerican(probability) {
    if (probability >= 0.5) {
        return Math.round(-100 * probability / (1 - probability));
    }
    return Math.round(100 * (1 - probability) / probability);
}

/**
 * Convert American odds to decimal odds
 * @param {number} americanOdds - American odds
 * @returns {number} Decimal odds
 */
export function americanToDecimal(americanOdds) {
    if (americanOdds < 0) {
        return 1 + (100 / Math.abs(americanOdds));
    }
    return 1 + (americanOdds / 100);
}

/**
 * Calculate edge/value percentage
 * @param {number} modelProb - Model's predicted probability (0-1)
 * @param {number} marketProb - Market implied probability (0-1)
 * @returns {number} Edge percentage (positive = value bet)
 */
export function calculateEdge(modelProb, marketProb) {
    return ((modelProb - marketProb) / marketProb) * 100;
}

/**
 * Calculate expected value of a bet
 * @param {number} americanOdds - American odds
 * @param {number} modelProb - Model's predicted probability (0-1)
 * @param {number} stake - Amount to bet
 * @returns {object} EV details
 */
export function calculateExpectedValue(americanOdds, modelProb, stake = 100) {
    const decimalOdds = americanToDecimal(americanOdds);
    const payout = stake * decimalOdds;
    const profit = payout - stake;

    const ev = (modelProb * profit) - ((1 - modelProb) * stake);
    const evPercent = (ev / stake) * 100;

    return {
        ev: Math.round(ev * 100) / 100,
        evPercent: Math.round(evPercent * 100) / 100,
        payout: Math.round(payout * 100) / 100,
        profit,
        isPositiveEV: ev > 0
    };
}

/**
 * Format American odds for display
 * @param {number} odds - American odds
 * @returns {string} Formatted odds string
 */
export function formatOdds(odds) {
    return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Find best odds across multiple sportsbooks
 * @param {Array} oddsArray - Array of {book: string, odds: number}
 * @returns {object} Best odds info
 */
export function findBestOdds(oddsArray) {
    if (!oddsArray || oddsArray.length === 0) return null;

    const sorted = [...oddsArray].sort((a, b) => {
        // Higher odds = better value
        const decimalA = americanToDecimal(a.odds);
        const decimalB = americanToDecimal(b.odds);
        return decimalB - decimalA;
    });

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const bestDecimal = americanToDecimal(best.odds);
    const worstDecimal = americanToDecimal(worst.odds);
    const edgeOverWorst = ((bestDecimal - worstDecimal) / worstDecimal) * 100;

    return {
        best,
        worst,
        sorted,
        edgeOverWorst: Math.round(edgeOverWorst * 100) / 100
    };
}

/**
 * Calculate juice/vig from a two-way market
 * @param {number} odds1 - First side odds
 * @param {number} odds2 - Second side odds
 * @returns {number} Juice percentage
 */
export function calculateJuice(odds1, odds2) {
    const prob1 = americanToImpliedProb(odds1);
    const prob2 = americanToImpliedProb(odds2);
    const totalProb = prob1 + prob2;
    return ((totalProb - 1) * 100);
}
