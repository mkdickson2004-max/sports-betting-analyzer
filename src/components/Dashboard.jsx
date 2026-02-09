import { useMemo } from 'react';
import { nbaTeams, todaysGames, sportsbooks } from '../data/mockData';
import { analyzeMatchup } from '../utils/modelPredictor';
import { americanToImpliedProb, calculateEdge } from '../utils/oddsConverter';
import './Dashboard.css';

export default function Dashboard() {
    // Calculate overall stats
    const stats = useMemo(() => {
        let valueOpps = 0;
        let totalEdge = 0;
        let gamesWithEdge = [];

        todaysGames.forEach(game => {
            const homeTeam = nbaTeams[game.homeTeam];
            const awayTeam = nbaTeams[game.awayTeam];
            const analysis = analyzeMatchup(homeTeam, awayTeam);

            const homeProb = analysis.homeWinProb / 100;
            const awayProb = analysis.awayWinProb / 100;

            // Get best odds for each side
            const homeBestML = Math.max(...sportsbooks.map(b => game.odds.home[b.id]?.moneyline || -999));
            const awayBestML = Math.max(...sportsbooks.map(b => game.odds.away[b.id]?.moneyline || -999));

            const homeMarketProb = americanToImpliedProb(homeBestML);
            const awayMarketProb = americanToImpliedProb(awayBestML);

            const homeEdge = calculateEdge(homeProb, homeMarketProb);
            const awayEdge = calculateEdge(awayProb, awayMarketProb);

            if (homeEdge > 3) {
                valueOpps++;
                totalEdge += homeEdge;
                gamesWithEdge.push({
                    team: homeTeam.name,
                    edge: homeEdge,
                    prob: analysis.homeWinProb
                });
            }
            if (awayEdge > 3) {
                valueOpps++;
                totalEdge += awayEdge;
                gamesWithEdge.push({
                    team: awayTeam.name,
                    edge: awayEdge,
                    prob: analysis.awayWinProb
                });
            }
        });

        return {
            totalGames: todaysGames.length,
            valueOpps,
            avgEdge: valueOpps > 0 ? (totalEdge / valueOpps).toFixed(1) : 0,
            topPicks: gamesWithEdge.sort((a, b) => b.edge - a.edge).slice(0, 3),
            booksTracked: sportsbooks.length
        };
    }, []);

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Today's Edge Analysis</h2>
                <span className="date">{new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}</span>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏀</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalGames}</span>
                        <span className="stat-label">Games Today</span>
                    </div>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.valueOpps}</span>
                        <span className="stat-label">+EV Opportunities</span>
                    </div>
                    <div className="stat-glow"></div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <span className="stat-value">+{stats.avgEdge}%</span>
                        <span className="stat-label">Avg Edge</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.booksTracked}</span>
                        <span className="stat-label">Books Compared</span>
                    </div>
                </div>
            </div>

            {stats.topPicks.length > 0 && (
                <div className="top-picks">
                    <h3>🔥 Top Value Picks</h3>
                    <div className="picks-list">
                        {stats.topPicks.map((pick, i) => (
                            <div key={i} className="pick-item">
                                <span className="pick-rank">#{i + 1}</span>
                                <span className="pick-team">{pick.team}</span>
                                <span className="pick-prob">{pick.prob}% Win</span>
                                <span className="pick-edge">+{pick.edge.toFixed(1)}% Edge</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="sportsbooks-row">
                <span className="sb-label">Odds from:</span>
                <div className="sb-list">
                    {sportsbooks.map(book => (
                        <span key={book.id} className="sb-badge">
                            {book.logo} {book.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
