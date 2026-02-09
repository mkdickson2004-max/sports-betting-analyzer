// ESPN API Endpoints
const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

/**
 * Fetch detailed team statistics for any sport
 */
export async function fetchDetailedTeamStats(sport, teamId) {
    try {
        const sportPath = sport === 'nba' ? 'basketball/nba' : 'football/nfl';
        const url = `${API_BASE}/${sportPath}/teams/${teamId}/statistics`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();

        // Parse categories if available
        if (data.results?.stats?.categories) {
            return parseStatsCategories(data.results.stats.categories);
        } else if (data.statistics?.splits?.categories) {
            return {
                offense: parseTeamStatCategory(data.statistics.splits.categories, 'offensive'),
                defense: parseTeamStatCategory(data.statistics.splits.categories, 'defensive'),
                general: parseTeamStatCategory(data.statistics.splits.categories, 'general'),
            };
        }

        return null; // No stats found
    } catch (error) {
        console.error(`[STATS] Error fetching ${sport} stats for team ${teamId}:`, error);
        return null;
    }
}

/**
 * Helper to parse stat categories
 */
function parseStatsCategories(categories) {
    const parsed = {};
    categories.forEach(cat => {
        parsed[cat.name] = {};
        cat.stats?.forEach(stat => {
            parsed[cat.name][stat.name] = {
                value: stat.value,
                displayValue: stat.displayValue,
                rank: stat.rank,
                description: stat.description
            };
        });
    });
    return parsed;
}

function parseTeamStatCategory(categories, type) {
    if (!categories) return {};
    const category = categories.find(c => c.name?.toLowerCase().includes(type));
    if (!category) return {};

    const stats = {};
    category.stats?.forEach(stat => {
        stats[stat.name] = {
            value: stat.value,
            displayValue: stat.displayValue,
            rank: stat.rank
        };
    });
    return stats;
}

/**
 * Fetch team roster
 */
export async function fetchRoster(sport, teamId) {
    try {
        const sportPath = sport === 'nba' ? 'basketball/nba' : 'football/nfl';
        const url = `${API_BASE}/${sportPath}/teams/${teamId}/roster`;

        const response = await fetch(url);
        const data = await response.json();

        return data.athletes?.map(player => ({
            id: player.id,
            name: player.displayName,
            position: player.position?.abbreviation,
            status: player.status?.type,
            injuries: player.injuries || []
        })) || [];
    } catch (error) {
        console.error(`[ROSTER] Error fetching roster:`, error);
        return [];
    }
}

// Export specific functions
export default {
    fetchDetailedTeamStats,
    fetchRoster
};
