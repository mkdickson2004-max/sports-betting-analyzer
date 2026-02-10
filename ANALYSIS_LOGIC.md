# Betting Prediction & Analysis Logic

This document outlines the multi-layered methodology used by the Sports Betting Analyzer to generate predictions, identify value bets, and provide deep analytical insights.

## 1. Data Collection & Aggregation

The system aggregates data from three primary sources to build a comprehensive view of each matchup:

*   **Quantitative Data (Stats):**
    *   **Team Performance:** Pace (possessions/game), Offensive/Defensive Efficiency (Ortg/Drtg), Effective Field Goal % (eFG%), Comparison of Four Factors.
    *   **Rosters:** Active players, injuries, rotations.
    *   **Context:** Home/Away splits, Rest days (schedule fatigue), Head-to-Head history.
*   **Market Data (Odds):**
    *   **Real-time Odds:** Moneyline, Spread, and Totals from major sportsbooks (via The Odds API).
    *   **Implied Probability:** Converting market odds into implied win probabilities to establish the "Market Consensus".
*   **Qualitative Data (News & Sentiment):**
    *   **News Scraper:** Fetches latest articles from ESPN, CBS, Bleacher Report.
    *   **Social Sentiment:** Analyzes social media/news tone for teams and key players (Hype vs. Panic).

## 2. Statistical Modeling Engine

The core of the prediction engine relies on three distinct models, each specialized for different aspects of the game:

### A. Elo Rating System (Baseline Strength)
*   **Purpose:** Establishes a baseline "Power Ranking" for each team based on wins/losses and strength of schedule.
*   **Method:**
    *   Updates ratings after every game.
    *   Accounts for Home Court Advantage (+HCA constant).
    *   **Output:** Baseline Win Probability.

### B. Efficiency Regression Model (Spread/Margin)
*   **Purpose:** Predicts the margin of victory based on advanced efficiency metrics.
*   **Formula:** Uses a weighted regression of Four Factors (eFG%, TOV%, OREB%, FT Rate) adjusted for Pace.
*   **Output:** Projected Score Margin (e.g., Team A by +4.5 points).

### C. Monte Carlo Simulation (Totals / Over-Under)
*   **Purpose:** Specifically designed to predict the Over/Under (Total Points) and quantify variance.
*   **Methodology:**
    1.  **Input:** Team Pace, Offensive Efficiency, Defensive Efficiency, tempo-free stats.
    2.  **Simulation:** Runs **1,000 simulated games** for the specific matchup.
    3.  **Randomness:** Introduces variance based on historical standard deviation of NBA scores.
    4.  **Output:** 
        *   Projected Total Score (Mean of 1000 runs).
        *   Distribution of outcomes (e.g., "Hit Over 220 in 65% of simulations").

## 3. AI Agent Integration (The "Analyst")

The statistical output is fed into a Large Language Model (Google Gemini 2.0 / OpenAI GPT-4) which acts as a professional handicapper. 

*   **Contextual Reasoning:** The AI analyzes factors that math models miss:
    *   *Motivation:* "Revenge Game", "Must-Win for Playoffs", "Tanking".
    *   *Matchups:* "Star Center vs Weak Interior Defense".
    *   *Injuries:* Impact of a specific player absence beyond just "points missing".
*   **Sentiment Analysis:** Adjusts confidence based on team morale and public sentiment (Contrarian betting).
*   **Final Output:** A structured JSON object containing:
    *   **Narrative:** Human-readable explanation.
    *   **Confidence Rating (0-100):** How strongly the data aligns.
    *   **Risk Factors:** What could go wrong.

## 4. Value Betting & Edge Calculation

The final step is converting predictions into actionable bets by comparing against the market.

### The Edge Formula
We compare our **Model Probability** vs. the **Implied Market Probability**.

```math
Edge (%) = \frac{\text{Model Probability} - \text{Implied Probability}}{\text{Implied Probability}}
```

*   **Positive Edge (+EV):** Our model gives the team a higher chance of winning than the odds suggest.
*   **Threshold:** We typically recommend bets only when **Edge > 3%**.

### Bet Sizing (Kelly Criterion Proxy)
To manage bankroll risk, we suggest unit sizes based on the Edge and Confidence:
*   **Strong Bet (2 Units):** Edge > 8% AND High Confidence.
*   **Value Bet (1 Unit):** Edge > 5%.
*   **Lean (0.5 Units):** Edge > 3% or Qualitative Factor alignment.
*   **Pass:** No significant edge found.

## Summary of Workflow

1.  **Scrape** Data (Stats, Odds, News).
2.  **Calculate** Base Metrics (Elo, Efficiency).
3.  **Simulate** 1,000 Games (Monte Carlo for Totals).
4.  **Analyze** with AI (Context, Matchups, Risks).
5.  **Compare** vs Market (Edge Calculation).
6.  **Recommend** Pick & Sizing.
