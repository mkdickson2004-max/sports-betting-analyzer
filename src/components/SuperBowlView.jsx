import { useState, useEffect } from 'react';
import DeepAnalysisPanel from './DeepAnalysisPanel';
import { useDataAgent } from '../hooks/useDataAgent';
import { generateDeepAnalysis } from '../agent/deepAnalyzer';
import './SuperBowlView.css';

export default function SuperBowlView() {
    // Use the data agent with NFL context
    const { data, refreshData, setSport } = useDataAgent('nfl');
    const [analysis, setAnalysis] = useState(null);
    const [targetGame, setTargetGame] = useState(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // Ensure we are lookijng at NFL data and auto-refresh
    useEffect(() => {
        setSport('nfl');
        refreshData();

        // Auto-refresh every 60 seconds
        const interval = setInterval(() => {
            refreshData();
        }, 60000);
        return () => clearInterval(interval);
    }, [setSport, refreshData]);

    // Find the Super Bowl game and generate analysis
    useEffect(() => {
        const findAndAnalyzeGame = async () => {
            if (!data.games || data.games.length === 0) return;

            // Look for Super Bowl or take the first available NFL game
            const sbGame = data.games.find(g =>
                g.name?.toLowerCase().includes('super bowl') ||
                g.status?.toLowerCase().includes('scheduled') ||
                g.status?.toLowerCase().includes('live')
            ) || data.games[0];

            if (sbGame) {
                setTargetGame(sbGame);

                // Only show loading if we haven't analyzed yet
                if (!analysis) {
                    setLoadingAnalysis(true);
                }

                // Find matching odds
                const gameOdds = data.odds?.find(o =>
                    o.home_team === sbGame.homeTeam.name ||
                    o.away_team === sbGame.awayTeam.name
                );

                // Generate real-time analysis
                try {
                    const analysisResult = await generateDeepAnalysis(
                        sbGame,
                        gameOdds || { bookmakers: [] },
                        data.injuries,
                        data.news,
                        data.stats,
                        sbGame.scrapedData // Pass scraped data
                    );
                    setAnalysis(analysisResult);
                } catch (err) {
                    console.error("Analysis generation failed:", err);
                } finally {
                    setLoadingAnalysis(false);
                }
            }
        };

        if (!data.isLoading) {
            findAndAnalyzeGame();
        }
    }, [data.games, data.odds, data.injuries, data.news, data.isLoading]);

    if (data.isLoading) {
        return (
            <div className="super-bowl-view loading">
                <div className="loading-spinner">🏈</div>
                <h2>Scraping Real-Time NFL Data...</h2>
                <div className="loading-steps">
                    <p>⚡ Connecting to Sportsbooks...</p>
                    <p>🌐 Searching Web for Injury News...</p>
                    <p>📊 Aggregating Advanced Stats...</p>
                </div>
            </div>
        );
    }

    if (!targetGame) {
        return (
            <div className="super-bowl-view empty">
                <div className="sb-header">
                    <div className="sb-logo">🏆</div>
                    <div className="sb-title">
                        <h1>SUPER BOWL LIVE</h1>
                    </div>
                </div>
                <div className="no-data-message">
                    <div className="pulse-loader"></div>
                    <h3>Scanning for Game Data...</h3>
                    <p>AI Agent is searching for live Super Bowl data.</p>
                    <p>System is continuously scraping reliable sources.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="super-bowl-view">
            <div className="sb-header">
                <div className="sb-logo">🏆</div>
                <div className="sb-title">
                    <h1>SUPER BOWL LIVE ANALYSIS</h1>
                    <span className="sb-date">
                        {new Date(targetGame.date).toLocaleDateString()} • {targetGame.venue}
                    </span>
                    {targetGame.broadcast && <span className="broadcast-badge">📺 {targetGame.broadcast}</span>}
                </div>
            </div>

            <div className="sb-matchup-card">
                <div className="team away">
                    {targetGame.awayTeam.logo ? (
                        <img
                            src={targetGame.awayTeam.logo}
                            alt={targetGame.awayTeam.name}
                            className="sb-team-logo"
                        />
                    ) : (
                        <div className="team-logo-placeholder">{targetGame.awayTeam.abbr}</div>
                    )}
                    <div className="team-info">
                        <span className="team-record">{targetGame.awayTeam.record}</span>
                        <h2>{targetGame.awayTeam.name}</h2>
                    </div>
                    <div className="team-score">
                        <span>{targetGame.awayTeam.score || 0}</span>
                    </div>
                </div>

                <div className="matchup-vs">
                    <span>VS</span>
                    <div className="game-status">{targetGame.statusDetail}</div>
                </div>

                <div className="team home">
                    <div className="team-score">
                        <span>{targetGame.homeTeam.score || 0}</span>
                    </div>
                    <div className="team-info">
                        <span className="team-record">{targetGame.homeTeam.record}</span>
                        <h2>{targetGame.homeTeam.name}</h2>
                    </div>
                    {targetGame.homeTeam.logo ? (
                        <img
                            src={targetGame.homeTeam.logo}
                            alt={targetGame.homeTeam.name}
                            className="sb-team-logo"
                        />
                    ) : (
                        <div className="team-logo-placeholder">{targetGame.homeTeam.abbr}</div>
                    )}
                </div>
            </div>

            <div className="sb-analysis-container">
                <div className="analysis-header">
                    <h3>🤖 EdgeFinder AI V3.0</h3>
                    <div className="status-badge">
                        <span className="analysis-pulse">●</span> ALWAYS ANALYZING
                    </div>
                    <p>Continuous Web Scraping • Real-Time Factor Updates • Live Confidence Score</p>
                </div>

                {loadingAnalysis ? (
                    <div className="analyzing-loader">
                        <div className="spinner"></div>
                        <span>Scraping web for latest data & simulating outcomes...</span>
                    </div>
                ) : analysis ? (
                    <DeepAnalysisPanel
                        game={targetGame}
                        odds={data.odds?.find(o => o.home_team === targetGame.homeTeam.name) || {}}
                        analysisData={analysis}
                        scrapedData={targetGame.scrapedData}
                        aiAnalysis={targetGame.aiAnalysis}
                    />
                ) : (
                    <div className="analysis-error">Analysis extraction failed. Only live data accepted.</div>
                )}
            </div>
        </div>
    );
}
