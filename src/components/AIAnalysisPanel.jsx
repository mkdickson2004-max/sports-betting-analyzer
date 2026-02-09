import { useMemo } from 'react';
import { generateMatchupAnalysis } from '../agent/aiAnalyzer';
import './AIAnalysisPanel.css';

export default function AIAnalysisPanel({ game, odds, injuries, news }) {
    const analysis = useMemo(() => {
        return generateMatchupAnalysis(game, odds, injuries, news);
    }, [game, odds, injuries, news]);

    if (!analysis) return null;

    const hasEdge = analysis.homeEdge > 5 || analysis.awayEdge > 5;
    const betSide = analysis.homeEdge > analysis.awayEdge ? 'home' : 'away';
    const edge = Math.max(analysis.homeEdge, analysis.awayEdge);

    return (
        <div className="ai-analysis-panel">
            {/* Header with recommendation */}
            <div className={`analysis-header ${analysis.recommendation.action?.toLowerCase()}`}>
                <div className="recommendation-badge">
                    {analysis.recommendation.action === 'STRONG BET' && '🎯'}
                    {analysis.recommendation.action === 'LEAN' && '👀'}
                    {analysis.recommendation.action === 'PASS' && '⏸️'}
                    <span>{analysis.recommendation.action}</span>
                </div>

                {analysis.recommendation.pick && (
                    <div className="pick-info">
                        <span className="pick-label">AI PICK:</span>
                        <span className="pick-team">{analysis.recommendation.pick}</span>
                        <span className="pick-odds">
                            {analysis.recommendation.odds > 0 ? '+' : ''}{analysis.recommendation.odds}
                        </span>
                        <span className="pick-book">@ {analysis.recommendation.book}</span>
                    </div>
                )}

                <div className="confidence-meter">
                    <span className="confidence-label">Confidence</span>
                    <div className="confidence-bar">
                        <div
                            className="confidence-fill"
                            style={{ width: `${analysis.confidence}%` }}
                        />
                    </div>
                    <span className="confidence-value">{analysis.confidence}%</span>
                </div>
            </div>

            {/* Main reasoning */}
            <div className="analysis-reasoning">
                <p>{analysis.recommendation.reasoning}</p>
            </div>

            {/* Why Market is Wrong */}
            {analysis.marketMispricing.length > 0 && (
                <div className="analysis-section mispricing">
                    <h4>
                        <span className="section-icon">🎯</span>
                        Why The Market May Be Wrong
                    </h4>
                    <div className="mispricing-list">
                        {analysis.marketMispricing.map((reason, i) => (
                            <div key={i} className="mispricing-item">
                                <p>{reason.explanation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Comparison */}
            <div className="analysis-section comparison">
                <h4>
                    <span className="section-icon">⚔️</span>
                    Matchup Breakdown
                </h4>

                <div className="teams-grid">
                    {/* Home Team */}
                    <div className={`team-card ${betSide === 'home' ? 'recommended' : ''}`}>
                        <div className="team-header">
                            <span className="team-name">{analysis.homeAnalysis.name}</span>
                            <span className="team-record">{analysis.homeAnalysis.record}</span>
                        </div>

                        <div className="win-prob">
                            <div className="prob-bar">
                                <div
                                    className="prob-fill home"
                                    style={{ width: `${analysis.modelHomeWinProb}%` }}
                                />
                            </div>
                            <div className="prob-labels">
                                <span>Model: {analysis.modelHomeWinProb}%</span>
                                <span className="market">Market: {analysis.marketHomeProb}%</span>
                            </div>
                        </div>

                        <div className="team-factors">
                            <div className="advantages">
                                <h5>✅ Advantages</h5>
                                {analysis.homeAnalysis.advantages.length > 0 ? (
                                    <ul>
                                        {analysis.homeAnalysis.advantages.map((adv, i) => (
                                            <li key={i}>{adv}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="none">None identified</p>
                                )}
                            </div>

                            <div className="disadvantages">
                                <h5>❌ Disadvantages</h5>
                                {analysis.homeAnalysis.disadvantages.length > 0 ? (
                                    <ul>
                                        {analysis.homeAnalysis.disadvantages.map((dis, i) => (
                                            <li key={i}>{dis}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="none">None identified</p>
                                )}
                            </div>
                        </div>

                        {betSide === 'home' && hasEdge && (
                            <div className="edge-badge">+{analysis.homeEdge}% EDGE</div>
                        )}
                    </div>

                    <div className="vs-divider">VS</div>

                    {/* Away Team */}
                    <div className={`team-card ${betSide === 'away' ? 'recommended' : ''}`}>
                        <div className="team-header">
                            <span className="team-name">{analysis.awayAnalysis.name}</span>
                            <span className="team-record">{analysis.awayAnalysis.record}</span>
                        </div>

                        <div className="win-prob">
                            <div className="prob-bar">
                                <div
                                    className="prob-fill away"
                                    style={{ width: `${analysis.modelAwayWinProb}%` }}
                                />
                            </div>
                            <div className="prob-labels">
                                <span>Model: {analysis.modelAwayWinProb}%</span>
                                <span className="market">Market: {analysis.marketAwayProb}%</span>
                            </div>
                        </div>

                        <div className="team-factors">
                            <div className="advantages">
                                <h5>✅ Advantages</h5>
                                {analysis.awayAnalysis.advantages.length > 0 ? (
                                    <ul>
                                        {analysis.awayAnalysis.advantages.map((adv, i) => (
                                            <li key={i}>{adv}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="none">None identified</p>
                                )}
                            </div>

                            <div className="disadvantages">
                                <h5>❌ Disadvantages</h5>
                                {analysis.awayAnalysis.disadvantages.length > 0 ? (
                                    <ul>
                                        {analysis.awayAnalysis.disadvantages.map((dis, i) => (
                                            <li key={i}>{dis}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="none">None identified</p>
                                )}
                            </div>
                        </div>

                        {betSide === 'away' && hasEdge && (
                            <div className="edge-badge">+{analysis.awayEdge}% EDGE</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Key Factors */}
            <div className="analysis-section factors">
                <h4>
                    <span className="section-icon">📋</span>
                    Key Factors
                </h4>
                <div className="factors-list">
                    {analysis.keyFactors.map((factor, i) => (
                        <div key={i} className={`factor-item ${factor.impact}`}>
                            <span className="factor-icon">{factor.icon}</span>
                            <div className="factor-content">
                                <span className="factor-name">{factor.factor}</span>
                                <p className="factor-detail">{factor.detail}</p>
                            </div>
                            <span className={`impact-badge ${factor.impact}`}>
                                {factor.impact === 'home' ? '🏠' : factor.impact === 'away' ? '✈️' : '⚖️'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Risk Factors */}
            {analysis.riskFactors.length > 0 && (
                <div className="analysis-section risks">
                    <h4>
                        <span className="section-icon">⚠️</span>
                        Risk Factors
                    </h4>
                    <div className="risks-list">
                        {analysis.riskFactors.map((risk, i) => (
                            <div key={i} className={`risk-item ${risk.severity}`}>
                                <span className="risk-severity">{risk.severity.toUpperCase()}</span>
                                <p>{risk.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="analysis-footer">
                <div className="stat">
                    <span className="stat-label">Model Edge</span>
                    <span className={`stat-value ${edge > 10 ? 'high' : edge > 5 ? 'medium' : ''}`}>
                        +{edge}%
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Best Odds</span>
                    <span className="stat-value">
                        {analysis.recommendation.odds > 0 ? '+' : ''}{analysis.recommendation.odds || 'N/A'}
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Book</span>
                    <span className="stat-value book">{analysis.recommendation.book || 'N/A'}</span>
                </div>
            </div>
        </div>
    );
}
