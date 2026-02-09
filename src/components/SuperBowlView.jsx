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

    // Ensure we are looking at NFL data
    useEffect(() => {
        setSport('nfl');
        refreshData();
    }, [setSport, refreshData]);

    // Find the Super Bowl game and generate analysis
    useEffect(() => {
        const findAndAnalyzeGame = async () => {
            if (!data.games || data.games.length === 0) return;

            // Look for Super Bowl or take the first available NFL game (likely the only one in playoffs/SB week)
            const sbGame = data.games.find(g =>
                g.name?.toLowerCase().includes('super bowl') ||
                g.status?.toLowerCase().includes('scheduled') ||
                g.status?.toLowerCase().includes('live')
            ) || data.games[0];

            if (sbGame) {
                setTargetGame(sbGame);
                setLoadingAnalysis(true);

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
                        data.stats
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
                <p>Connecting to Sportsbooks & Stats APIs...</p>
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
                    <h3>No Live Game Data Found</h3>
                    <p>Unable to retrieve real-time data for the Super Bowl.</p>
                    <p>This may be due to the off-season or API connectivity issues.</p>
                    <button onClick={() => refreshData()} className="refresh-btn">
                        Retry Connection
                    </button>
                    <div className="debug-info">
                        <small>Source: ESPN API (NFL)</small>
                    </div>
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
                    <h3>🤖 EdgeFinder AI Analysis</h3>
                    <p>Real-Time Betting Intelligence • Powered by Live Data</p>
                </div>

                {loadingAnalysis ? (
                    <div className="analyzing-loader">Generating deep analysis...</div>
                ) : analysis ? (
                    <DeepAnalysisPanel
                        game={targetGame}
                        odds={data.odds?.find(o => o.home_team === targetGame.homeTeam.name) || {}}
                        analysisData={analysis}
                    />
                ) : (
                    <div className="analysis-error">Analysis extraction failed.</div>
                )}
            </div>
        </div>
    );
}
