# Deployment Guide

This project consists of two parts:
1. **Frontend**: React (Vite) application
2. **Backend**: Node.js (Express) server

## Local Development

To run both frontend and backend concurrently:

```bash
npm run dev:full
```

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:3001`

## Deployment Strategy

Since this app requires a backend to scrape data and proxy requests (avoiding CORS), you need to deploy both parts.

### Option 1: Separate Hosting (Recommended)

1. **Deploy Backend (Server)**
   - Use a service like **Render**, **Railway**, or **Heroku**.
   - Root directory: `./server` (or set Build Command to `cd server && npm install` and Start Command to `node index.js`).
   - Note the URL (e.g., `https://my-betting-api.onrender.com`).

2. **Deploy Frontend (Client)**
   - Use **Vercel** or **Netlify**.
   - Root directory: `./` (project root).
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **Environment Variables**:
     - Add `VITE_API_URL` and set it to your Backend URL (e.g., `https://my-betting-api.onrender.com`).

### Option 2: Unified Deployment (Advanced)

You can serve the React build artifacts from the Express server.
1. Run `npm run build` in root.
2. Copy `dist` folder to `server/public`.
3. In `server/index.js`, add:
   ```javascript
   app.use(express.static('public'));
   app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
   ```
4. Deploy the whole repo to Render/Heroku.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default 3001) |
| `ODDS_API_KEY` | Optional: API Key for The Odds API if you want real sportsbook odds |
