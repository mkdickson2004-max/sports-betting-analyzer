import { useState } from 'react';
import './Header.css';

export default function Header({ activeSport, setActiveSport, onRefresh, lastUpdated }) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const sports = [
        // Major US Sports
        { id: 'nba', name: 'NBA', emoji: '🏀' },
        { id: 'nfl', name: 'NFL', emoji: '🏈' },
        { id: 'mlb', name: 'MLB', emoji: '⚾' },
        { id: 'nhl', name: 'NHL', emoji: '🏒' },
        // College Sports
        { id: 'ncaab', name: 'NCAAB', emoji: '🎓' },
        { id: 'ncaaf', name: 'NCAAF', emoji: '🏈' },
        // Soccer
        { id: 'soccer_epl', name: 'EPL', emoji: '⚽' },
        { id: 'soccer_mls', name: 'MLS', emoji: '⚽' },
        // Combat Sports
        { id: 'mma', name: 'UFC', emoji: '🥊' },
        // Other
        { id: 'wnba', name: 'WNBA', emoji: '🏀' },
        { id: 'tennis', name: 'Tennis', emoji: '🎾' },
        { id: 'golf', name: 'Golf', emoji: '⛳' },
    ];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh?.();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'Never';
        return new Date(isoString).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-brand">
                    <div className="logo">
                        <span className="logo-icon">📊</span>
                        <div className="logo-text">
                            <span className="logo-name">Mucker</span>
                            <span className="logo-tagline">AI SPORTS INTELLIGENCE</span>
                        </div>
                    </div>
                </div>

                <nav className="sport-nav">
                    {sports.map(sport => (
                        <button
                            key={sport.id}
                            className={`sport-btn ${activeSport === sport.id ? 'active' : ''}`}
                            onClick={() => setActiveSport(sport.id)}
                        >
                            <span className="sport-emoji">{sport.emoji}</span>
                            <span className="sport-name">{sport.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="header-actions">
                    <div className="data-status">
                        <span className="status-dot"></span>
                        <span className="status-text">
                            Live Data
                            <span className="last-update">Updated: {formatTime(lastUpdated)}</span>
                        </span>
                    </div>

                    <button
                        className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <span className="refresh-icon">↻</span>
                        <span className="refresh-text">Refresh</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
