import { useState, useEffect } from 'react';
import { runBacktest } from '../agent/backtestEngine'; // Does not export generateDeepAnalysis from here, but from the file
import './BacktestView.css';

export default function BacktestView() {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function run() {
            try {
                const res = await runBacktest();
                setResults(res);
            } catch (err) {
                console.error("Backtest failed:", err);
            } finally {
                setLoading(false);
            }
        }
        run();
    }, []);

    if (loading) {
        return (
            <div className="backtest-loading">
                <div className="spinner"></div>
                <h2>Running Historical Backtest...</h2>
                <p>Simulating past NFL Playoff games through current AI model...</p>
            </div>
        );
    }

    if (!results) return <div className="error">Failed to run backtest.</div>;

    return (
        <div className="backtest-view">
            <h1>Create History with AI Backtesting</h1>

            <div className="backtest-summary">
                <div className="summary-card">
                    <span className="label">Total Games</span>
                    <span className="value">{results.summary.totalGames}</span>
                </div>
                <div className="summary-card">
                    <span className="label">Model Bets</span>
                    <span className="value">{results.summary.totalBets}</span>
                </div>
                <div className="summary-card win-rate">
                    <span className="label">Win Rate</span>
                    <span className="value">{results.summary.winRate}</span>
                </div>
                <div className="summary-card">
                    <span className="label">Record</span>
                    <span className="value">{results.summary.wins}-{results.summary.losses}</span>
                </div>
            </div>

            <table className="backtest-table">
                <thead>
                    <tr>
                        <th>Game</th>
                        <th>Score</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {results.games.map((game, i) => (
                        <tr key={i} className={game.result.toLowerCase()}>
                            <td>{game.game}</td>
                            <td>{game.score}</td>
                            <td>
                                {game.prediction.toUpperCase()}
                                {game.edge > 0 && <span className="edge-tag">+{game.edge.toFixed(1)}%</span>}
                            </td>
                            <td>{game.confidence}%</td>
                            <td className="result-cell">{game.result}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
