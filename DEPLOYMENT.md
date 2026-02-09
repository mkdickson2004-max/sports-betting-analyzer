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

## Final Step: Deploy to Vercel

Your backend is already live at: `https://sports-betting-analyzer-yec3.onrender.com`

1. Go to **[Vercel.com](https://vercel.com/)** and sign up/login.
2. Click **"Add New..."** -> **"Project"**.
3. Import your `sports-betting-analyzer` repository.
4. **Environment Variables**:
   - I have included a `.env.production` file which automatically sets the API URL.
   - You can just click **"Deploy"**.
   
   *(If deployment fails or data doesn't load, add this manually in Vercel settings:)*
   - Key: `VITE_API_URL`
   - Value: `https://sports-betting-analyzer-yec3.onrender.com`

5. Once deployed, Vercel will give you a live URL (e.g., `https://sports-betting-analyzer.vercel.app`).
   - Open it and go to the **"Backtest Model"** tab to verify!

## Troubleshooting

- If the app says "Offline / Server Error", the Render backend might be sleeping (it spins down on free tier).
- Just refresh the page after 30-60 seconds and it will wake up.
