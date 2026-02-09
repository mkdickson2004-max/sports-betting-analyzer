import { useMemo, useState } from 'react';
import { nbaTeams } from '../data/mockData';
import { getEloTier, calculateExpectedWinProb } from '../utils/eloCalculator';
import './EloRankings.css';

export default function EloRankings() {
    const [sortBy, setSortBy] = useState('elo');
    const [showDetails, setShowDetails] = useState(false);

    const rankings = useMemo(() => {
        const teams = Object.entries(nbaTeams).map(([abbr, team]) => ({
            ...team,
            abbr,
            tier: getEloTier(team.elo),
            winPct: team.record.wins / (team.record.wins + team.record.losses),
            netRating: team.netRating
        }));

        return teams.sort((a, b) => {
            switch (sortBy) {
                case 'elo': return b.elo - a.elo;
                case 'record': return (b.record.wins - b.record.losses) - (a.record.wins - a.record.losses);
                case 'netRating': return b.netRating - a.netRating;
                case 'ats': return (b.atsRecord.wins / (b.atsRecord.wins + b.atsRecord.losses)) - (a.atsRecord.wins / (a.atsRecord.wins + a.atsRecord.losses));
                default: return b.elo - a.elo;
            }
        });
    }, [sortBy]);

    return (
        <div className="elo-rankings">
            <div className="rankings-header">
                <h2>📊 Team Power Rankings</h2>
                <p className="subtitle">ELO-based strength ratings with performance metrics</p>

                <div className="controls">
                    <div className="sort-buttons">
                        <span>Sort by:</span>
                        {[
                            { id: 'elo', label: 'ELO Rating' },
                            { id: 'record', label: 'Record' },
                            { id: 'netRating', label: 'Net Rating' },
                            { id: 'ats', label: 'ATS Record' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                className={sortBy === opt.id ? 'active' : ''}
                                onClick={() => setSortBy(opt.id)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <button
                        className={`toggle-btn ${showDetails ? 'active' : ''}`}
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails ? 'Hide' : 'Show'} Details
                    </button>
                </div>
            </div>

            <div className="rankings-table">
                <div className="table-header">
                    <span className="col-rank">#</span>
                    <span className="col-team">Team</span>
                    <span className="col-elo">ELO</span>
                    <span className="col-record">Record</span>
                    <span className="col-net">Net Rtg</span>
                    {showDetails && (
                        <>
                            <span className="col-ats">ATS</span>
                            <span className="col-form">Form</span>
                            <span className="col-tier">Tier</span>
                        </>
                    )}
                </div>

                <div className="table-body">
                    {rankings.map((team, i) => (
                        <div
                            key={team.abbr}
                            className={`table-row ${i < 3 ? 'top-3' : ''}`}
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <span className="col-rank">
                                <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                            </span>
                            <span className="col-team">
                                <span className="team-abbr">{team.abbr}</span>
                                <span className="team-name">{team.city} {team.name}</span>
                            </span>
                            <span className="col-elo">
                                <span className="elo-value" style={{ color: team.tier.color }}>
                                    {team.elo}
                                </span>
                                <span className="elo-delta">
                                    {team.elo > 1500 ? '+' : ''}{team.elo - 1500}
                                </span>
                            </span>
                            <span className="col-record">
                                <span className="record-main">{team.record.wins}-{team.record.losses}</span>
                                <span className="win-pct">({(team.winPct * 100).toFixed(0)}%)</span>
                            </span>
                            <span className={`col-net ${team.netRating > 0 ? 'positive' : 'negative'}`}>
                                {team.netRating > 0 ? '+' : ''}{team.netRating}
                            </span>
                            {showDetails && (
                                <>
                                    <span className="col-ats">
                                        {team.atsRecord.wins}-{team.atsRecord.losses}
                                        <span className="ats-pct">
                                            ({((team.atsRecord.wins / (team.atsRecord.wins + team.atsRecord.losses)) * 100).toFixed(0)}%)
                                        </span>
                                    </span>
                                    <span className="col-form">
                                        <div className="form-dots">
                                            {team.last10.slice(-5).map((result, j) => (
                                                <span
                                                    key={j}
                                                    className={`form-dot ${result === 1 ? 'win' : 'loss'}`}
                                                    title={result === 1 ? 'Win' : 'Loss'}
                                                ></span>
                                            ))}
                                        </div>
                                    </span>
                                    <span className="col-tier">
                                        <span
                                            className="tier-badge"
                                            style={{
                                                background: `${team.tier.color}20`,
                                                color: team.tier.color,
                                                borderColor: team.tier.color
                                            }}
                                        >
                                            {team.tier.emoji} {team.tier.tier}
                                        </span>
                                    </span>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="elo-legend">
                <h4>ELO Tier Legend</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#10b981' }}></span>
                        <span>Elite (1700+)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#3b82f6' }}></span>
                        <span>Strong (1600-1699)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#f59e0b' }}></span>
                        <span>Average (1500-1599)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#f97316' }}></span>
                        <span>Below Avg (1400-1499)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: '#ef4444' }}></span>
                        <span>Weak (&lt;1400)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
