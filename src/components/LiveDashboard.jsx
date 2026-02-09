import { useMemo } from 'react';
import './LiveDashboard.css';

export default function LiveDashboard({ data }) {
    const stats = useMemo(() => {
        const totalGames = data.games?.length || 0;

        // Only count bets with meaningful edge (>5% is strong value)
        const allValueBets = data.valueBets || [];
        const strongBets = allValueBets.filter(b => b.edge >= 5); // 5%+ edge = strong value
        const moderateBets = allValueBets.filter(b => b.edge >= 3 && b.edge < 5); // 3-5% = moderate

        const valueOpps = strongBets.length; // Only show strong value bets as "worth betting"
        const avgEdge = valueOpps > 0
            ? (strongBets.reduce((sum, b) => sum + b.edge, 0) / valueOpps).toFixed(1)
            : 0;
        const alertsCount = data.alerts?.length || 0;
        const oddsCount = data.odds?.length || 0;

        // Count unique sportsbooks
        const books = new Set();
        data.odds?.forEach(game => {
            game.bookmakers?.forEach(book => books.add(book.key));
        });

        return {
            totalGames,
            valueOpps, // Strong value bets only
            moderateBets: moderateBets.length,
            totalOpps: allValueBets.length,
            avgEdge,
            alertsCount,
            booksTracked: books.size,
            topPick: strongBets[0] || null, // Show strongest pick
        };
    }, [data]);

    return (
        <div className="live-dashboard">
            <div className="dashboard-header">
                <h2>🎯 Live Edge Analysis</h2>
                <div className="header-badges">
                    {/* Odds Source Indicator */}
                    <div className={`odds-source ${data.oddsSource ? 'active' : 'none'}`}>
                        {data.oddsSource === 'multi-book' && `📊 ${data.scrapedBooks?.length || 0} Sportsbooks`}
                        {data.oddsSource === 'espn' && '📺 ESPN/Caesars'}
                        {(!data.oddsSource || data.oddsSource === 'none') && '⏳ Scraping odds...'}
                    </div>
                    {data.scrapedBooks?.length > 0 && (
                        <div className="scraped-books">
                            {data.scrapedBooks.slice(0, 4).join(' • ')}
                            {data.scrapedBooks.length > 4 && ` +${data.scrapedBooks.length - 4} more`}
                        </div>
                    )}
                    <div className="live-indicator">
                        <span className="live-dot pulse"></span>
                        <span>LIVE</span>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏀</div>
                    <div className="stat-value">{stats.totalGames}</div>
                    <div className="stat-label">Games Today</div>
                </div>

                <div className={`stat-card ${stats.valueOpps > 0 ? 'highlight' : ''}`}>
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">{stats.valueOpps}</div>
                    <div className="stat-label">Value Bets Found</div>
                    {stats.valueOpps > 0 && (
                        <div className="stat-sublabel">5%+ edge</div>
                    )}
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-value">{stats.avgEdge > 0 ? `+${stats.avgEdge}%` : '—'}</div>
                    <div className="stat-label">Avg Edge</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-value">{stats.booksTracked}</div>
                    <div className="stat-label">Sportsbooks</div>
                </div>

                <div className="stat-card alert">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-value">{stats.alertsCount}</div>
                    <div className="stat-label">News Alerts</div>
                </div>
            </div>

            {stats.valueOpps === 0 && stats.totalGames > 0 && (
                <div className="no-value-bets-banner">
                    <span className="no-bets-icon">🔍</span>
                    <div className="no-bets-text">
                        <strong>No Strong Value Bets Found</strong>
                        <span>Current odds are fairly priced. {stats.moderateBets > 0 ? `${stats.moderateBets} moderate opportunities (3-5% edge) available.` : 'Check back closer to game time.'}</span>
                    </div>
                </div>
            )}

            {stats.topPick && (
                <div className="top-pick-banner">
                    <div className="pick-label">
                        <span className="trophy">🏆</span>
                        TOP VALUE PICK
                    </div>
                    <div className="pick-details">
                        <span className="pick-team">{stats.topPick.pick}</span>
                        <span className="pick-matchup">{stats.topPick.matchup}</span>
                    </div>
                    <div className="pick-stats">
                        <span className="pick-edge">+{stats.topPick.edge}% Edge</span>
                        <span className="pick-odds">
                            {stats.topPick.bestOdds > 0 ? '+' : ''}{stats.topPick.bestOdds}
                        </span>
                        <span className="pick-book">@ {stats.topPick.bestBook}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
