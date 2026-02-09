# 🏀 Sports Betting AI Analyzer

A powerful, autonomous sports betting analysis tool that uses AI to predict game outcomes, identify value bets, and provide deep insights into matchups.

## 🏗️ Architecture

This application uses a modern **Client-Server** architecture to provide real-time data and analysis:

### 1. The Frontend (Hosted on Vercel)
- **Role**: The "Face" of the application.
- **Tech**: React, Vite, CSS.
- **Function**: This is what you see in your browser. It renders the UI, charts, and interactive elements.
- **Why Vercel?**: Vercel is optimized for delivering static websites instantly to users around the world.

### 2. The Backend (Hosted on Render)
- **Role**: The "Brain" of the application.
- **Tech**: Node.js, Express.
- **Function**: This server runs 24/7. It autonomously scrapes data from ESPN, Odds APIs, and news sources. It processes this raw data and runs the AI models.
- **Why Render?**: Unlike Vercel, Render allows us to run a continuous server that can perform heavy tasks like scraping and data processing without timing out.

### 🔗 How They Connect
The Frontend (Vercel) sends invisible background requests to the Backend (Render) using the API URL we configured (`VITE_API_URL`).
- **User visits website** -> **Frontend loads** -> **Frontend asks Backend for data** -> **Backend scrapes & replies** -> **Frontend shows data**.

## 🚀 Features
- **Live Odds Scraping**: Real-time odds from multiple bookmakers.
- **AI Deep Analysis**: Advanced matchup prowess using simulated historical data models.
- **Value Bet Finder**: Identifies positive EV (Expected Value) betting opportunities.
- **Backtesting Engine**: Verifies model accuracy against historical playoff games.

## 🛠️ Local Development
To run the full stack locally:
```bash
npm run dev:full
```
This starts both the React app (Client) and the Node server (API) simultaneously.
