import { useState, useMemo, useEffect } from 'react';
import { generateDeepAnalysis, MODEL_METHODOLOGY } from '../agent/deepAnalyzer';
import './DeepAnalysisPanel.css';

export default function DeepAnalysisPanel({ game, odds, injuries, news, analysisData, scrapedData, aiAnalysis }) {
    // Helper: Normalize Backend AI Schema to Frontend Schema
    const normalizeAnalysis = (data) => {
        if (!data) return null;

        // If it's already in frontend format (has recommendation), return as is
        if (data.recommendation) return data;

        // If it's Backend AI format (from LLM)
        if (data.prediction || data.narrative) {
            const betSide = data.prediction?.winner === game.homeTeam?.name ? 'home' : 'away';
            return {
                modelInfo: { name: 'Genesis AI (Server)', description: 'GPT-4o Powered Analysis' },
                recommendation: {
                    action: data.confidenceRating > 75 ? 'STRONG BET' : 'LEAN',
                    team: data.prediction?.winner || 'Unknown',
                    odds: -110, // Placeholder if not parsed
                    book: 'Best Available',
                    reasoning: data.narrative || "AI Analysis Generated"
                },
                confidence: data.confidenceRating || 0,
                homeEdge: data.modelProbability ? (betSide === 'home' ? (data.modelProbability - 0.5) * 100 : -(data.modelProbability - 0.5) * 100) : 0,
                betSizing: { units: data.confidenceRating > 80 ? 2 : 1, description: data.confidenceRating > 80 ? '2 Units' : '1 Unit' },
                summary: data.narrative || data.analysis || '', // Narrative text
                factors: (() => {
                    const baseFactors = data.factors || data.enhancedFactors || {};
                    return {
                        ...baseFactors,
                        matchups: baseFactors.matchups || { summary: {}, positions: [] },
                        teamStrength: baseFactors.teamStrength || { home: {}, away: {}, advantage: 'even' },
                        form: baseFactors.form || { home: {}, away: {}, advantage: 'even' }
                    };
                })(),
                keyInsights: data.keyInsights || [],
                risks: data.risks || data.riskFactors || []
            };
        }

        return data; // Fallback
    };

    const [analysis, setAnalysis] = useState(normalizeAnalysis(analysisData) || null);
    const [loading, setLoading] = useState(!analysisData);
    const [activeSection, setActiveSection] = useState('summary');

    useEffect(() => {
        if (analysisData) {
            setAnalysis(normalizeAnalysis(analysisData));
            setLoading(false);
            return;
        }

        async function runAnalysis() {
            setLoading(true);
            try {
                // Determine scraping needed?
                // This is frontend-side simulation fallback
                const result = await generateDeepAnalysis(game, odds, injuries, news, {}, scrapedData);
                setAnalysis(result);
            } catch (error) {
                console.error('Analysis error:', error);
            }
            setLoading(false);
        }
        runAnalysis();
    }, [game, odds, injuries, news, analysisData, scrapedData]);

    if (loading) {
        return (
            <div className="deep-analysis-loading">
                <div className="loading-spinner"></div>
                <p>AI analyzing {game.homeTeam?.name} vs {game.awayTeam?.name}...</p>
                <p className="loading-detail">Evaluating 50+ factors across team stats, player matchups, injuries, and market data</p>
            </div>
        );
    }

    if (!analysis) return null;

    const hasEdge = Math.abs(analysis?.homeEdge || 0) > 5;
    const betSide = (analysis?.homeEdge || 0) > 0 ? 'home' : 'away';

    return (
        <div className="deep-analysis-panel">
            {/* Model Info Banner */}
            <div className="model-info-banner">
                <span className="model-name">🤖 {analysis?.modelInfo?.name || 'AI Model'}</span>
                <span className="model-desc">{analysis?.modelInfo?.description || 'Advanced Analysis'}</span>
            </div>

            {/* Main Recommendation Header */}
            <div className={`recommendation-header ${analysis?.recommendation?.action?.toLowerCase().replace(' ', '-') || 'neutral'}`}>
                <div className="rec-left">
                    <div className="rec-badge">
                        {analysis?.recommendation?.action === 'STRONG BET' && '🎯'}
                        {analysis?.recommendation?.action === 'LEAN' && '👀'}
                        {analysis?.recommendation?.action === 'PASS' && '⏸️'}
                        <span>{analysis?.recommendation?.action || 'ANALYZING'}</span>
                    </div>

                    {analysis?.recommendation?.action !== 'PASS' && (
                        <div className="rec-pick">
                            <span className="pick-label">AI PICK:</span>
                            <span className="pick-team">
                                {betSide === 'home' ? analysis?.homeTeam || game.homeTeam?.abbr : analysis?.awayTeam || game.awayTeam?.abbr}
                            </span>
                            <span className="pick-odds">
                                {(analysis?.recommendation?.odds || 0) > 0 ? '+' : ''}{analysis?.recommendation?.odds || '-'}
                            </span>
                            <span className="pick-book">@ {analysis?.recommendation?.book || 'Best Line'}</span>
                        </div>
                    )}
                </div>

                <div className="rec-right">
                    <div className="confidence-display">
                        <span className="conf-label">Confidence</span>
                        <div className="conf-bar">
                            <div className="conf-fill" style={{ width: `${analysis?.confidence || 0}%` }} />
                        </div>
                        <span className="conf-value">{analysis?.confidence || 0}%</span>
                    </div>

                    <div className="edge-display">
                        <span className="edge-value">+{Math.abs((analysis?.homeEdge || 0) > 0 ? analysis?.homeEdge : analysis?.homeEdge || 0).toFixed(1)}%</span>
                        <span className="edge-label">MODEL EDGE</span>
                    </div>
                </div>
            </div>

            {/* Bet Sizing */}
            {analysis?.betSizing?.units > 0 && (
                <div className="bet-sizing-banner">
                    <span className="sizing-label">💰 Suggested Size:</span>
                    <span className="sizing-value">{analysis?.betSizing?.description || '1 Unit'}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="analysis-nav">
                {['summary', ...(aiAnalysis?.narrative ? ['ai-insights'] : []), 'advanced', 'matchups', 'factors', 'methodology'].map(section => (
                    <button
                        key={section}
                        className={activeSection === section ? 'active' : ''}
                        onClick={() => setActiveSection(section)}
                    >
                        {/* Tab Names */}
                        {section === 'summary' && '📊 Summary'}
                        {section === 'ai-insights' && '🤖 AI Insights'}
                        {section === 'advanced' && '🎯 10 Factors'}
                        {section === 'matchups' && '⚔️ Matchups'}
                        {section === 'factors' && '🔬 Base Factors'}
                        {section === 'methodology' && '🧠 How It Works'}
                    </button>
                ))}
            </div>

            {/* AI Insights Section (LLM-powered) */}
            {activeSection === 'ai-insights' && aiAnalysis && (
                <div className="analysis-section ai-insights-section">
                    <div className="ai-badge">
                        <span className="ai-icon">🤖</span>
                        <span className="ai-label">Powered by Gemini AI</span>
                        <span className="ai-model">gemini-2.0-flash</span>
                    </div>

                    {/* LLM Narrative */}
                    {aiAnalysis?.narrative && (
                        <div className="ai-narrative">
                            <h4>📝 AI Analysis</h4>
                            <p className="narrative-text">{aiAnalysis.narrative}</p>
                        </div>
                    )}

                    {/* Key Insight */}
                    {aiAnalysis?.analysis?.keyInsight && (
                        <div className="ai-key-insight">
                            <span className="insight-icon">💡</span>
                            <p>{aiAnalysis.analysis.keyInsight}</p>
                        </div>
                    )}

                    {/* Sharp Angle */}
                    {aiAnalysis?.analysis?.sharpAngle && (
                        <div className="ai-sharp-angle">
                            <h4>🎯 Sharp Angle</h4>
                            <p>{aiAnalysis.analysis.sharpAngle}</p>
                        </div>
                    )}

                    {/* AI Recommended Bet */}
                    {aiAnalysis?.analysis?.recommendedBet && (
                        <div className="ai-rec-bet">
                            <h4>💰 AI Recommended Bet</h4>
                            <div className="ai-bet-details">
                                <span className="bet-type">{aiAnalysis.analysis.recommendedBet.type?.toUpperCase()}</span>
                                <span className="bet-side">{aiAnalysis.analysis.recommendedBet.side?.toUpperCase()}</span>
                            </div>
                            <p className="bet-reasoning">{aiAnalysis.analysis.recommendedBet.reasoning}</p>
                        </div>
                    )}

                    {/* Sentiment Analysis */}
                    {aiAnalysis?.sentiment && (
                        <div className="ai-sentiment">
                            <h4>📰 News Sentiment</h4>
                            <div className="sentiment-scores">
                                <div className="sentiment-team">
                                    <span className="team-name">{game.homeTeam?.name}</span>
                                    <div className={`sentiment-bar ${aiAnalysis.sentiment.overallSentiment?.home > 0 ? 'positive' : aiAnalysis.sentiment.overallSentiment?.home < 0 ? 'negative' : 'neutral'}`}>
                                        <div className="bar-fill" style={{ width: `${Math.min(100, Math.abs(aiAnalysis.sentiment.overallSentiment?.home || 0) * 10)}%` }} />
                                    </div>
                                    <span className="score">{aiAnalysis.sentiment.overallSentiment?.home > 0 ? '+' : ''}{aiAnalysis.sentiment.overallSentiment?.home || 0}</span>
                                </div>
                                <div className="sentiment-team">
                                    <span className="team-name">{game.awayTeam?.name}</span>
                                    <div className={`sentiment-bar ${aiAnalysis.sentiment.overallSentiment?.away > 0 ? 'positive' : aiAnalysis.sentiment.overallSentiment?.away < 0 ? 'negative' : 'neutral'}`}>
                                        <div className="bar-fill" style={{ width: `${Math.min(100, Math.abs(aiAnalysis.sentiment.overallSentiment?.away || 0) * 10)}%` }} />
                                    </div>
                                    <span className="score">{aiAnalysis.sentiment.overallSentiment?.away > 0 ? '+' : ''}{aiAnalysis.sentiment.overallSentiment?.away || 0}</span>
                                </div>
                            </div>
                            {aiAnalysis.sentiment.bettingImpact && (
                                <p className="sentiment-impact">{aiAnalysis.sentiment.bettingImpact}</p>
                            )}
                            {aiAnalysis.sentiment.contrarian && (
                                <div className="contrarian-alert">
                                    <span>🔄 Contrarian Signal:</span> {aiAnalysis.sentiment.contrarianReason}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Situational Edges */}
                    {aiAnalysis.situations?.situations?.length > 0 && (
                        <div className="ai-situations">
                            <h4>🔍 Hidden Situational Edges</h4>
                            <div className="situations-list">
                                {aiAnalysis.situations.situations.map((sit, idx) => (
                                    <div key={idx} className={`situation-card ${sit.edge}`}>
                                        <div className="sit-header">
                                            <span className="sit-name">{sit.name}</span>
                                            <span className={`sit-edge ${sit.edge}`}>{sit.edge?.toUpperCase()}</span>
                                            <span className="sit-strength">Strength: {sit.strength}/10</span>
                                        </div>
                                        <p className="sit-explain">{sit.explanation}</p>
                                    </div>
                                ))}
                            </div>
                            {aiAnalysis.situations.hiddenEdge && (
                                <div className="hidden-edge">
                                    <span className="edge-icon">🎯</span>
                                    <strong>Best Hidden Edge:</strong> {aiAnalysis.situations.hiddenEdge}
                                </div>
                            )}
                            {aiAnalysis.situations.marketBlindSpot && (
                                <div className="market-blindspot">
                                    <span className="edge-icon">👁️</span>
                                    <strong>Market Blind Spot:</strong> {aiAnalysis.situations.marketBlindSpot}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Risk Factors */}
                    {aiAnalysis.analysis?.riskFactors?.length > 0 && (
                        <div className="ai-risks">
                            <h4>⚠️ Risk Factors</h4>
                            <ul>
                                {aiAnalysis.analysis.riskFactors.map((risk, idx) => (
                                    <li key={idx}>{risk}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="ai-confidence">
                        <span>AI Confidence: </span>
                        <strong>{aiAnalysis.confidence || aiAnalysis.analysis?.confidenceRating || 'N/A'}/10</strong>
                    </div>
                </div>
            )}

            {/* Summary Section */}
            {activeSection === 'summary' && (
                <div className="analysis-section summary-section">
                    {/* Reasoning Breakdown */}
                    <div className="reasoning-block">
                        <p className="reasoning-summary">
                            {typeof analysis.recommendation.reasoning === 'string'
                                ? analysis.recommendation.reasoning
                                : analysis.recommendation.reasoning.summary}
                        </p>

                        {/* Key Driving Factors */}
                        {analysis.recommendation.reasoning.keyFactors && (
                            <div className="key-drivers">
                                <h4>✅ Why to Bet</h4>
                                <div className="drivers-list">
                                    {analysis.recommendation.reasoning.keyFactors.map((factor, idx) => (
                                        <div key={idx} className="driver-item">
                                            <div className="driver-header">
                                                <span className="driver-icon">{factor.icon}</span>
                                                <span className="driver-title">{factor.title}</span>
                                            </div>
                                            <p className="driver-desc">{factor.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Key Insights */}
                    <div className="insights-grid">
                        {analysis.keyInsights.map((insight, i) => (
                            <div key={i} className="insight-card">
                                <span className="insight-icon">{insight.icon}</span>
                                <div className="insight-content">
                                    <span className="insight-cat">{insight.category}</span>
                                    <p>{insight.insight}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Probability Comparison */}
                    <div className="prob-comparison">
                        <h4>Model vs Market</h4>
                        <div className="prob-bars">
                            <div className="prob-team">
                                <span className="team-name">{analysis.homeTeam}</span>
                                <div className="dual-bars">
                                    <div className="bar-container">
                                        <div className="bar model" style={{ width: `${analysis.modelHomeWinProb}%` }}>
                                            <span>{analysis.modelHomeWinProb}%</span>
                                        </div>
                                        <span className="bar-label">Model</span>
                                    </div>
                                    <div className="bar-container">
                                        <div className="bar market" style={{ width: `${analysis.marketHomeProb}%` }}>
                                            <span>{analysis.marketHomeProb}%</span>
                                        </div>
                                        <span className="bar-label">Market</span>
                                    </div>
                                </div>
                            </div>
                            <div className="prob-team">
                                <span className="team-name">{analysis.awayTeam}</span>
                                <div className="dual-bars">
                                    <div className="bar-container">
                                        <div className="bar model away" style={{ width: `${analysis.modelAwayWinProb}%` }}>
                                            <span>{analysis.modelAwayWinProb}%</span>
                                        </div>
                                        <span className="bar-label">Model</span>
                                    </div>
                                    <div className="bar-container">
                                        <div className="bar market away" style={{ width: `${analysis.marketAwayProb}%` }}>
                                            <span>{analysis.marketAwayProb}%</span>
                                        </div>
                                        <span className="bar-label">Market</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risks */}
                    {analysis.risks.length > 0 && (
                        <div className="risks-section">
                            <h4>⚠️ Risk Factors</h4>
                            <div className="risks-list">
                                {analysis.risks.map((risk, i) => (
                                    <div key={i} className={`risk-item ${risk.severity}`}>
                                        <span className="risk-badge">{risk.severity.toUpperCase()}</span>
                                        <p>{risk.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totals Analysis */}
                    {analysis.totalsAnalysis && (
                        <div className="totals-section">
                            <h4>📈 Totals Analysis</h4>
                            <div className="totals-content">
                                <div className="totals-lean">
                                    <span className={`totals-badge ${analysis.totalsAnalysis.lean.toLowerCase()}`}>
                                        {analysis.totalsAnalysis.lean}
                                    </span>
                                    <span className="totals-confidence">
                                        ({analysis.totalsAnalysis.confidence} confidence)
                                    </span>
                                </div>
                                <p className="projected-total">
                                    Projected Total: <strong>{analysis.totalsAnalysis.projectedTotal}</strong>
                                </p>
                                {analysis.totalsAnalysis.paceInsight && (
                                    <p className="totals-insight">{analysis.totalsAnalysis.paceInsight}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Advanced 10 Factors Section */}
            {activeSection === 'advanced' && (
                <div className="analysis-section advanced-section">
                    {/* Summary Stats */}
                    <div className="advanced-summary">
                        <div className="summary-stat">
                            <span className="stat-value">{analysis.advancedSummary?.totalFactors || 0}</span>
                            <span className="stat-label">Factors Analyzed</span>
                        </div>
                        <div className="summary-stat home">
                            <span className="stat-value">{analysis.advancedSummary?.homeAdvantages || 0}</span>
                            <span className="stat-label">Home Edges</span>
                        </div>
                        <div className="summary-stat away">
                            <span className="stat-value">{analysis.advancedSummary?.awayAdvantages || 0}</span>
                            <span className="stat-label">Away Edges</span>
                        </div>
                        <div className="summary-stat over">
                            <span className="stat-value">{analysis.advancedSummary?.overAdvantages || 0}</span>
                            <span className="stat-label">Over Edges</span>
                        </div>
                        <div className="summary-stat under">
                            <span className="stat-value">{analysis.advancedSummary?.underAdvantages || 0}</span>
                            <span className="stat-label">Under Edges</span>
                        </div>
                        <div className="summary-stat">
                            <span className={`stat-value ${(analysis.advancedSummary?.totalProbAdjustment || 0) >= 0 ? 'positive' : 'negative'}`}>
                                {(analysis.advancedSummary?.totalProbAdjustment || 0) >= 0 ? '+' : ''}
                                {analysis.advancedSummary?.totalProbAdjustment || 0}%
                            </span>
                            <span className="stat-label">Prob Adjustment</span>
                        </div>
                    </div>

                    {/* Data Status Notice */}
                    <div className={`data-source-warning ${(analysis.advancedSummary?.totalFactors || 0) >= 10 ? 'full-data' : ''}`}>
                        <span className="warning-icon">
                            {(analysis.advancedSummary?.totalFactors || 0) >= 10 ? '🟢' :
                                (analysis.advancedSummary?.totalFactors || 0) >= 6 ? '🟢' : '🟡'}
                        </span>
                        <span className="warning-text">
                            {(analysis.advancedSummary?.totalFactors || 0) >= 10 ? (
                                <>
                                    <strong>✓ Full Data Scraped:</strong> All {analysis.advancedSummary?.totalFactors} factors analyzed from ESPN & public sources. No APIs required.
                                </>
                            ) : (analysis.advancedSummary?.totalFactors || 0) >= 6 ? (
                                <>
                                    <strong>✓ Data Available:</strong> {analysis.advancedSummary?.totalFactors} of 12 factors scraped from public sources.
                                </>
                            ) : (
                                <>
                                    <strong>Loading Data:</strong> Scraping {analysis.advancedSummary?.totalFactors || 0} factors from public sources...
                                </>
                            )}
                        </span>
                    </div>

                    {/* All Advanced Factors */}
                    <div className="advanced-factors-grid">
                        {(analysis.advancedFactors || []).map((factor, i) => (
                            <div key={i} className={`advanced-factor-card ${factor.advantage}`}>
                                <div className="af-header">
                                    <span className="af-icon">{factor.icon}</span>
                                    <span className="af-title">{factor.factor}</span>
                                    <span className="af-weight">{Math.round(factor.weight * 100)}%</span>
                                </div>

                                <div className="af-insight">
                                    <p>{factor.insight}</p>
                                </div>

                                <div className="af-footer">
                                    <span className={`af-advantage ${factor.advantage}`}>
                                        {factor.advantage === 'home' ? '🏠 Home Edge' :
                                            factor.advantage === 'away' ? '✈️ Away Edge' :
                                                factor.advantage === 'over' ? '📈 OVER' :
                                                    factor.advantage === 'under' ? '📉 UNDER' :
                                                        '⚖️ Neutral'}
                                    </span>
                                    <span className="af-impact">
                                        Impact: {Math.round(factor.impact)}/10
                                    </span>
                                </div>

                                {/* Factor-specific data */}
                                {factor.factor === 'Head-to-Head History' && factor.data && (
                                    <div className="af-data">
                                        <span>Series: {factor.data.homeWins}-{factor.data.awayWins}</span>
                                        <span>Last 5: {factor.data.last5HomeWins}-{5 - factor.data.last5HomeWins}</span>
                                        <span>Streak: {factor.data.streak}</span>
                                    </div>
                                )}

                                {factor.factor === 'Against the Spread (ATS)' && factor.data && (
                                    <div className="af-data">
                                        <span>Home ATS: {factor.data.home?.overall?.wins}-{factor.data.home?.overall?.losses}</span>
                                        <span>Away ATS: {factor.data.away?.overall?.wins}-{factor.data.away?.overall?.losses}</span>
                                    </div>
                                )}

                                {factor.factor === 'Line Movement' && factor.data && (
                                    <div className="af-data">
                                        <span>Open: {factor.data.spreadOpen}</span>
                                        <span>Current: {factor.data.spreadCurrent}</span>
                                        <span className={factor.data.spreadMovement !== 0 ? 'movement' : ''}>
                                            Move: {factor.data.spreadMovement > 0 ? '+' : ''}{factor.data.spreadMovement}
                                        </span>
                                        {factor.hasRLM && <span className="rlm-alert">⚠️ RLM DETECTED</span>}
                                    </div>
                                )}

                                {factor.factor === 'Public Betting' && factor.data && (
                                    <div className="af-data">
                                        <span>Home: {factor.data.spreadBets?.home}%</span>
                                        <span>Away: {factor.data.spreadBets?.away}%</span>
                                        {factor.fadeCandidate && (
                                            <span className="fade-alert">🔄 FADE CANDIDATE</span>
                                        )}
                                    </div>
                                )}

                                {factor.factor === 'Rest & Schedule' && factor.data && (
                                    <div className="af-data">
                                        <span>Home Rest: {factor.data.home?.restDays}d</span>
                                        <span>Away Rest: {factor.data.away?.restDays}d</span>
                                        {factor.data.home?.backToBack && <span className="b2b-alert">🔴 Home B2B</span>}
                                        {factor.data.away?.backToBack && <span className="b2b-alert">🔴 Away B2B</span>}
                                    </div>
                                )}

                                {factor.factor === 'Referee Tendencies' && factor.data && (
                                    <div className="af-data">
                                        <span>O/U Tendency: {factor.data.avgOUTendency > 0 ? '+' : ''}{factor.data.avgOUTendency}</span>
                                        <span>Crew: {factor.data.crew?.[0]?.name}</span>
                                    </div>
                                )}

                                {factor.factor === 'Clutch Performance' && factor.data && (
                                    <div className="af-data">
                                        <span>Home Close: {factor.data.home?.closeGameRecord}</span>
                                        <span>Away Close: {factor.data.away?.closeGameRecord}</span>
                                    </div>
                                )}

                                {factor.factor === 'Pace of Play' && factor.data && (
                                    <div className="af-data">
                                        <span>Home Pace: {factor.data.homePace}</span>
                                        <span>Away Pace: {factor.data.awayPace}</span>
                                        <span>Expected Total: {factor.data.expectedTotal}</span>
                                    </div>
                                )}

                                {factor.factor === 'Motivation & Situations' && factor.data?.situations && (
                                    <div className="af-data">
                                        {factor.data.situations.revengeGame && (
                                            <span className="situation-tag revenge">🔥 Revenge</span>
                                        )}
                                        {factor.data.situations.letdownSpot && (
                                            <span className="situation-tag letdown">⚠️ Letdown</span>
                                        )}
                                        {factor.data.situations.trapGame && (
                                            <span className="situation-tag trap">🪤 Trap</span>
                                        )}
                                        {factor.data.situations.divisional && (
                                            <span className="situation-tag">Division</span>
                                        )}
                                    </div>
                                )}

                                {/* Advanced Analytics - Net Rating, ORtg, DRtg, eFG%, etc */}
                                {factor.factor === 'Advanced Analytics' && factor.data && (
                                    <div className="af-data advanced-stats">
                                        <div className="stats-grid">
                                            <div className="stat-row">
                                                <span className="stat-name">Net Rating</span>
                                                <span className={`stat-diff ${factor.data.differentials?.netRating > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.netRating > 0 ? '+' : ''}{factor.data.differentials?.netRating}
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">ORtg</span>
                                                <span className={`stat-diff ${factor.data.differentials?.ortg > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.ortg > 0 ? '+' : ''}{factor.data.differentials?.ortg}
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">DRtg</span>
                                                <span className={`stat-diff ${factor.data.differentials?.drtg > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.drtg > 0 ? '+' : ''}{factor.data.differentials?.drtg}
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">eFG%</span>
                                                <span className={`stat-diff ${factor.data.differentials?.efgPct > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.efgPct > 0 ? '+' : ''}{factor.data.differentials?.efgPct}%
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">TOV%</span>
                                                <span className={`stat-diff ${factor.data.differentials?.tovPct > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.tovPct > 0 ? '+' : ''}{factor.data.differentials?.tovPct}%
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">OREB%</span>
                                                <span className={`stat-diff ${factor.data.differentials?.orebPct > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.orebPct > 0 ? '+' : ''}{factor.data.differentials?.orebPct}%
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">FT Rate</span>
                                                <span className={`stat-diff ${factor.data.differentials?.ftRate > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.ftRate > 0 ? '+' : ''}{factor.data.differentials?.ftRate}%
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span className="stat-name">Ast Ratio</span>
                                                <span className={`stat-diff ${factor.data.differentials?.astRatio > 0 ? 'positive' : 'negative'}`}>
                                                    {factor.data.differentials?.astRatio > 0 ? '+' : ''}{factor.data.differentials?.astRatio}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Social Media & Sentiment */}
                                {factor.factor === 'Social Media & Sentiment' && factor.data && (
                                    <div className="af-data social-media">
                                        <div className="sentiment-scores">
                                            <div className="score-item">
                                                <span className="score-label">Home Sentiment</span>
                                                <span className={`score-value ${factor.data.sentimentScores?.home > 70 ? 'positive' : factor.data.sentimentScores?.home < 50 ? 'negative' : ''}`}>
                                                    {factor.data.sentimentScores?.home}/100
                                                </span>
                                            </div>
                                            <div className="score-item">
                                                <span className="score-label">Away Sentiment</span>
                                                <span className={`score-value ${factor.data.sentimentScores?.away > 70 ? 'positive' : factor.data.sentimentScores?.away < 50 ? 'negative' : ''}`}>
                                                    {factor.data.sentimentScores?.away}/100
                                                </span>
                                            </div>
                                        </div>

                                        {/* Player Alerts */}
                                        {factor.alerts && factor.alerts.length > 0 && (
                                            <div className="social-alerts">
                                                {factor.alerts.slice(0, 4).map((alert, idx) => (
                                                    <div key={idx} className={`social-alert ${alert.severity}`}>
                                                        <span className="alert-player">{alert.player || alert.team}</span>
                                                        <span className="alert-message">{alert.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Team Morale */}
                                        <div className="morale-comparison">
                                            <div className="morale-item">
                                                <span>Home Morale:</span>
                                                <span className={factor.data.home?.teamMorale?.trend === 'improving' ? 'trend-up' : factor.data.home?.teamMorale?.trend === 'declining' ? 'trend-down' : ''}>
                                                    {factor.data.home?.teamMorale?.level}%
                                                    {factor.data.home?.teamMorale?.trend === 'improving' && '📈'}
                                                    {factor.data.home?.teamMorale?.trend === 'declining' && '📉'}
                                                </span>
                                            </div>
                                            <div className="morale-item">
                                                <span>Away Morale:</span>
                                                <span className={factor.data.away?.teamMorale?.trend === 'improving' ? 'trend-up' : factor.data.away?.teamMorale?.trend === 'declining' ? 'trend-down' : ''}>
                                                    {factor.data.away?.teamMorale?.level}%
                                                    {factor.data.away?.teamMorale?.trend === 'improving' && '📈'}
                                                    {factor.data.away?.teamMorale?.trend === 'declining' && '📉'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Matchups Section */}
            {activeSection === 'matchups' && (
                <div className="analysis-section matchups-section">
                    <div className="matchups-summary">
                        <div className="matchup-score">
                            <span className="home-wins">{analysis.factors.matchups.summary.homeWins}</span>
                            <span className="vs">-</span>
                            <span className="away-wins">{analysis.factors.matchups.summary.awayWins}</span>
                        </div>
                        <p className="matchup-advantage">{analysis.factors.matchups.overallAdvantage}</p>

                        <div className="per-comparison">
                            <div className="per-item">
                                <span className="per-label">Home PER Total</span>
                                <span className="per-value">{analysis.factors.matchups.perDifferential.home}</span>
                            </div>
                            <div className="per-item">
                                <span className="per-label">Away PER Total</span>
                                <span className="per-value">{analysis.factors.matchups.perDifferential.away}</span>
                            </div>
                            <div className="per-item diff">
                                <span className="per-label">Differential</span>
                                <span className={`per-value ${analysis.factors.matchups.perDifferential.diff > 0 ? 'positive' : 'negative'}`}>
                                    {analysis.factors.matchups.perDifferential.diff > 0 ? '+' : ''}{analysis.factors.matchups.perDifferential.diff}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Position-by-Position */}
                    <div className="position-matchups">
                        {analysis.factors.matchups.positions.map((pos, i) => (
                            <div key={i} className={`position-card ${pos.advantage}`}>
                                <div className="position-header">
                                    <span className="position-name">{pos.position}</span>
                                    <span className={`matchup-score ${pos.advantage}`}>
                                        {pos.score > 0 ? '+' : ''}{pos.score}
                                    </span>
                                </div>

                                <div className="players-comparison">
                                    <div className="player home">
                                        <span className="player-name">{pos.homeName}</span>
                                        <span className="player-stats">{pos.homeStats}</span>
                                        <span className="player-per">PER: {pos.homePER}</span>
                                    </div>
                                    <span className="vs-text">VS</span>
                                    <div className="player away">
                                        <span className="player-name">{pos.awayName}</span>
                                        <span className="player-stats">{pos.awayStats}</span>
                                        <span className="player-per">PER: {pos.awayPER}</span>
                                    </div>
                                </div>

                                <p className="matchup-analysis">{pos.analysis}</p>

                                {pos.keyFactors.length > 0 && (
                                    <div className="key-factors">
                                        {pos.keyFactors.map((f, j) => (
                                            <span key={j} className={`factor-tag ${f.advantage} ${f.impact}`}>
                                                {f.stat}: {f.value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Factors Section */}
            {activeSection === 'factors' && (
                <div className="analysis-section factors-section">
                    {/* Team Strength */}
                    <FactorCard
                        title="Team Strength"
                        icon="📊"
                        weight="20%"
                        advantage={analysis.factors.teamStrength.advantage}
                    >
                        <div className="factor-teams">
                            <div className="factor-team">
                                <span className="team-name">{analysis.homeTeam}</span>
                                <span className="team-record">{analysis.factors.teamStrength.home.record}</span>
                                <span className="team-tier">{analysis.factors.teamStrength.home.tier}</span>
                                <span className="team-winpct">{analysis.factors.teamStrength.home.winPct}% Win Rate</span>
                            </div>
                            <div className="factor-team">
                                <span className="team-name">{analysis.awayTeam}</span>
                                <span className="team-record">{analysis.factors.teamStrength.away.record}</span>
                                <span className="team-tier">{analysis.factors.teamStrength.away.tier}</span>
                                <span className="team-winpct">{analysis.factors.teamStrength.away.winPct}% Win Rate</span>
                            </div>
                        </div>
                    </FactorCard>

                    {/* Recent Form */}
                    <FactorCard
                        title="Recent Form"
                        icon="🔥"
                        weight="15%"
                        advantage={analysis.factors.form.advantage}
                    >
                        <div className="factor-teams">
                            <div className="factor-team">
                                <span className="team-name">{analysis.homeTeam}</span>
                                <span className={`trend-badge ${analysis.factors.form.home.trend}`}>
                                    {analysis.factors.form.home.trend.toUpperCase()}
                                </span>
                                <span>L5: {analysis.factors.form.home.last5Record}</span>
                                <span>+/- {analysis.factors.form.home.pointDiffL5}</span>
                            </div>
                            <div className="factor-team">
                                <span className="team-name">{analysis.awayTeam}</span>
                                <span className={`trend-badge ${analysis.factors.form.away.trend}`}>
                                    {analysis.factors.form.away.trend.toUpperCase()}
                                </span>
                                <span>L5: {analysis.factors.form.away.last5Record}</span>
                                <span>+/- {analysis.factors.form.away.pointDiffL5}</span>
                            </div>
                        </div>
                    </FactorCard>

                    {/* Injuries */}
                    <FactorCard
                        title="Injury Impact"
                        icon="🏥"
                        weight="15%"
                        advantage={analysis.factors.injuries.advantage}
                    >
                        <div className="factor-teams">
                            <div className="factor-team">
                                <span className="team-name">{analysis.homeTeam}</span>
                                <span className="health-rating">Health: {analysis.factors.injuries.home.healthRating}%</span>
                                {analysis.factors.injuries.home.out.length > 0 && (
                                    <div className="injury-list">
                                        <span className="injury-label">OUT:</span>
                                        {analysis.factors.injuries.home.out.map((p, i) => (
                                            <span key={i} className="out-player">{p.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="factor-team">
                                <span className="team-name">{analysis.awayTeam}</span>
                                <span className="health-rating">Health: {analysis.factors.injuries.away.healthRating}%</span>
                                {analysis.factors.injuries.away.out.length > 0 && (
                                    <div className="injury-list">
                                        <span className="injury-label">OUT:</span>
                                        {analysis.factors.injuries.away.out.map((p, i) => (
                                            <span key={i} className="out-player">{p.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </FactorCard>

                    {/* Situational */}
                    <FactorCard
                        title="Situational Factors"
                        icon="🏠"
                        weight="10%"
                        advantage={analysis.factors.situational.advantage}
                    >
                        <div className="situational-details">
                            <div className="sit-item">
                                <span className="sit-label">Home Court Value</span>
                                <span className="sit-value">{analysis.factors.situational.homeCourtValue}</span>
                            </div>
                            <div className="sit-item">
                                <span className="sit-label">Home Rest</span>
                                <span className="sit-value">{analysis.factors.situational.home.restDays} days</span>
                            </div>
                            <div className="sit-item">
                                <span className="sit-label">Away Rest</span>
                                <span className="sit-value">{analysis.factors.situational.away.restDays} days</span>
                            </div>
                            <div className="sit-item total">
                                <span className="sit-label">Situational Edge</span>
                                <span className="sit-value">+{analysis.factors.situational.totalAdvantagePoints} pts</span>
                            </div>
                        </div>
                    </FactorCard>

                    {/* Market */}
                    <FactorCard
                        title="Market Analysis"
                        icon="📈"
                        weight="15%"
                        advantage="neutral"
                    >
                        <div className="market-details">
                            <div className="market-row">
                                <span>Books Analyzed</span>
                                <span>{analysis.factors.market.booksAnalyzed}</span>
                            </div>
                            <div className="market-row">
                                <span>Best Home ML</span>
                                <span>{analysis.factors.market.homeML > 0 ? '+' : ''}{analysis.factors.market.homeML} @ {analysis.factors.market.bestHomeBook}</span>
                            </div>
                            <div className="market-row">
                                <span>Best Away ML</span>
                                <span>{analysis.factors.market.awayML > 0 ? '+' : ''}{analysis.factors.market.awayML} @ {analysis.factors.market.bestAwayBook}</span>
                            </div>
                            <div className="market-row">
                                <span>Spread</span>
                                <span>{analysis.factors.market.spread}</span>
                            </div>
                            <div className="market-row">
                                <span>Market Vig</span>
                                <span>{analysis.factors.market.vig}%</span>
                            </div>
                        </div>
                    </FactorCard>
                </div>
            )}

            {/* Methodology Section */}
            {activeSection === 'methodology' && (
                <div className="analysis-section methodology-section">
                    <h3>How EdgeFinder AI Calculates Predictions</h3>

                    <div className="methodology-intro">
                        <p>
                            Our model evaluates <strong>50+ factors</strong> across 6 major categories,
                            each weighted based on historical predictive power. Here's exactly what we analyze:
                        </p>
                    </div>

                    <div className="factors-breakdown">
                        {MODEL_METHODOLOGY.factors.map((factor, i) => (
                            <div key={i} className="methodology-factor">
                                <div className="factor-header">
                                    <span className="factor-name">{factor.category}</span>
                                    <span className="factor-weight">{Math.round(factor.weight * 100)}% Weight</span>
                                </div>
                                <ul className="factor-components">
                                    {factor.components.map((comp, j) => (
                                        <li key={j}>{comp}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="formula-section">
                        <h4>Probability Calculation</h4>
                        <pre className="formula">{MODEL_METHODOLOGY.calculation}</pre>
                    </div>

                    <div className="data-sources">
                        <h4>Data Sources</h4>
                        <ul>
                            <li>📊 ESPN API - Team/player stats, schedules, injuries</li>
                            <li>💰 The Odds API - Live odds from 10+ sportsbooks</li>
                            <li>📰 ESPN News - Breaking news and injury updates</li>
                            <li>🏀 NBA Stats - Advanced metrics (PER, TS%, BPM)</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

function FactorCard({ title, icon, weight, advantage, children }) {
    return (
        <div className={`factor-card ${advantage}`}>
            <div className="factor-header">
                <div className="factor-title">
                    <span className="factor-icon">{icon}</span>
                    <span>{title}</span>
                </div>
                <div className="factor-meta">
                    <span className="factor-weight">{weight}</span>
                    <span className={`advantage-badge ${advantage}`}>
                        {advantage === 'home' ? '🏠 Home' : advantage === 'away' ? '✈️ Away' : '⚖️ Even'}
                    </span>
                </div>
            </div>
            <div className="factor-content">
                {children}
            </div>
        </div>
    );
}
