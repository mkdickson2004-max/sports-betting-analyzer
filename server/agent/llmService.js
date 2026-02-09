/**
 * LLM SERVICE - Google Gemini Integration
 * 
 * Connects to Google Gemini API to power intelligent
 * scraping, analysis, and betting recommendations.
 * 
 * Free tier: 15 RPM, 1M tokens/day
 * Get your key at: https://aistudio.google.com/apikey
 */

const API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Fast + cheap
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Rate limiting
let requestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 14; // Stay under 15 RPM limit
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Response cache to avoid duplicate LLM calls
const responseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Check if Gemini API key is configured
 */
export function isLLMConfigured() {
    return API_KEY && API_KEY.length > 10;
}

/**
 * Rate limiter - ensures we stay under free tier limits
 */
function checkRateLimit() {
    const now = Date.now();
    if (now - lastResetTime > RATE_LIMIT_WINDOW) {
        requestCount = 0;
        lastResetTime = now;
    }

    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
        const waitTime = RATE_LIMIT_WINDOW - (now - lastResetTime);
        return { allowed: false, waitMs: waitTime };
    }

    requestCount++;
    return { allowed: true, waitMs: 0 };
}

/**
 * Get cached response or null
 */
function getCachedResponse(cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.response;
    }
    responseCache.delete(cacheKey);
    return null;
}

/**
 * Store response in cache
 */
function setCachedResponse(cacheKey, response) {
    // Keep cache size reasonable
    if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }
    responseCache.set(cacheKey, { response, timestamp: Date.now() });
}

// Global 429 cooldown tracker
let rateLimitCooldownUntil = 0;

/**
 * Call Gemini API with automatic retry on 429
 */
async function callGemini(prompt, options = {}) {
    if (!isLLMConfigured()) {
        console.log('[LLM] ⚠ Gemini API key not configured. Set GEMINI_API_KEY env variable.');
        return null;
    }

    // Check if we're in a global cooldown from a previous 429
    const now = Date.now();
    if (now < rateLimitCooldownUntil) {
        const waitSec = Math.ceil((rateLimitCooldownUntil - now) / 1000);
        console.log(`[LLM] In cooldown. Waiting ${waitSec}s before retrying...`);
        await new Promise(r => setTimeout(r, rateLimitCooldownUntil - now));
    }

    // Check our internal rate limit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
        console.log(`[LLM] Internal rate limit. Waiting ${Math.ceil(rateCheck.waitMs / 1000)}s`);
        await new Promise(r => setTimeout(r, rateCheck.waitMs));
    }

    // Check cache
    const cacheKey = prompt.substring(0, 200);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
        console.log('[LLM] ✓ Cache hit');
        return cached;
    }

    const url = `${GEMINI_BASE_URL}/${options.model || GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: options.temperature || 0.3,
            maxOutputTokens: options.maxTokens || 1024,
            topP: 0.8,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    // Retry up to 2 times with exponential backoff
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30000) // 30s timeout
            });

            if (response.status === 429) {
                const errorData = await response.json().catch(() => ({}));
                // Parse retry delay from Google's response
                const retryInfo = errorData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                const retryDelaySec = parseInt(retryInfo?.retryDelay) || 60;
                const waitMs = (retryDelaySec + 5) * 1000; // Add 5s buffer

                console.log(`[LLM] 429 Rate limited. Waiting ${retryDelaySec + 5}s (attempt ${attempt + 1}/${maxRetries + 1})`);
                rateLimitCooldownUntil = Date.now() + waitMs;

                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, waitMs));
                    continue; // Retry
                }
                return null; // Give up after max retries
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[LLM] API error ${response.status}:`, errorText.substring(0, 200));
                return null;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (text) {
                setCachedResponse(cacheKey, text);
            }

            console.log(`[LLM] ✓ Response received (${text.length} chars)`);
            return text;

        } catch (error) {
            console.error(`[LLM] Error: ${error.message}`);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            return null;
        }
    }
    return null;
}

/**
 * Call Gemini with JSON response format
 */
async function callGeminiJSON(prompt, options = {}) {
    const jsonPrompt = prompt + '\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation.';
    const response = await callGemini(jsonPrompt, options);

    if (!response) return null;

    try {
        // Clean any markdown formatting
        let cleaned = response.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        return JSON.parse(cleaned);
    } catch (e) {
        console.error('[LLM] Failed to parse JSON response:', e.message);
        console.error('[LLM] Raw response:', response.substring(0, 300));
        return null;
    }
}

// ============================================================
// AGENT FUNCTIONS - Smart scraping & analysis
// ============================================================

/**
 * SMART SCRAPE: Extract structured data from raw HTML/text
 * The LLM reads messy scraped content and extracts clean data
 */
export async function smartExtractData(rawText, dataType, context = {}) {
    const prompts = {
        injuries: `You are a sports data extraction agent. Extract injury information from this text.

TEXT:
${rawText.substring(0, 3000)}

Extract ALL player injuries mentioned. Return JSON:
{
  "injuries": [
    { "player": "name", "team": "team", "status": "Out|Doubtful|Questionable|Probable|Day-to-Day", "injury": "type", "impact": "high|medium|low" }
  ]
}`,

        odds: `You are a sports odds extraction agent. Extract betting odds from this text.

TEXT:
${rawText.substring(0, 3000)}

Extract all odds mentioned. Return JSON:
{
  "odds": [
    { "team": "name", "spread": number, "moneyline": number, "total": number, "source": "sportsbook name" }
  ]
}`,

        stats: `You are a sports statistics extraction agent. Extract team statistics from this text.

TEAMS: ${context.homeTeam} vs ${context.awayTeam}
TEXT:
${rawText.substring(0, 3000)}

Extract key stats. Return JSON:
{
  "homeStats": { "ppg": 0, "oppg": 0, "pace": 0, "offRtg": 0, "defRtg": 0, "record": "" },
  "awayStats": { "ppg": 0, "oppg": 0, "pace": 0, "offRtg": 0, "defRtg": 0, "record": "" }
}`,

        news: `You are a sports news analysis agent. Analyze this news for betting impact.

TEXT:
${rawText.substring(0, 3000)}

Identify betting-relevant news. Return JSON:
{
  "articles": [
    { "headline": "", "impact": "high|medium|low", "affectedTeam": "", "bettingAngle": "description of how this affects betting" }
  ]
}`
    };

    const prompt = prompts[dataType];
    if (!prompt) return null;

    return await callGeminiJSON(prompt);
}

/**
 * INTELLIGENT ANALYSIS: Generate deep matchup analysis
 */
export async function generateLLMAnalysis(game, factors, odds, injuries) {
    const homeTeam = game.homeTeam?.name || 'Home';
    const awayTeam = game.awayTeam?.name || 'Away';
    const homeRecord = game.homeTeam?.record || 'N/A';
    const awayRecord = game.awayTeam?.record || 'N/A';

    // Build factor summary
    const factorSummary = (factors || []).map(f =>
        `- ${f.factor}: ${f.insight || 'N/A'} (Impact: ${f.impact}/10, Advantage: ${f.advantage})`
    ).join('\n');

    // Build injury summary
    const injurySummary = Object.entries(injuries || {}).map(([team, data]) => {
        if (!data?.players?.length) return `${team}: Healthy`;
        return `${team}: ${data.players.map(p => `${p.name} (${p.status})`).join(', ')}`;
    }).join('\n');

    const prompt = `You are an elite sports betting analyst. Generate a sharp, actionable analysis for this NBA game.

MATCHUP: ${awayTeam} (${awayRecord}) @ ${homeTeam} (${homeRecord})

ADVANCED FACTORS:
${factorSummary || 'No factor data available'}

INJURIES:
${injurySummary || 'No injury data available'}

ODDS: ${JSON.stringify(odds?.bookmakers?.[0]?.markets || 'N/A').substring(0, 500)}

Generate a betting analysis. Be specific, cite numbers, and give a clear recommendation. Return JSON:
{
  "narrative": "2-3 paragraph sharp analysis explaining the edge",
  "keyInsight": "One sentence summary of the most important factor",
  "sharpAngle": "The specific betting angle a sharp bettor would take",
  "confidenceRating": 1-10,
  "riskFactors": ["risk 1", "risk 2"],
  "recommendedBet": {
    "type": "spread|moneyline|total|pass",
    "side": "home|away|over|under",
    "reasoning": "why this bet"
  }
}`;

    return await callGeminiJSON(prompt, { maxTokens: 1500, temperature: 0.4 });
}

/**
 * SENTIMENT ANALYSIS: Analyze news/social media for betting sentiment
 */
export async function analyzeSentiment(newsArticles, homeTeam, awayTeam) {
    if (!newsArticles?.length) return null;

    const newsText = newsArticles.slice(0, 5).map(n =>
        `- ${n.headline}: ${n.description || ''}`
    ).join('\n');

    const prompt = `You are a sports betting sentiment analyst. Analyze these news articles for ${homeTeam} vs ${awayTeam}.

NEWS:
${newsText}

Analyze the sentiment and betting impact. Return JSON:
{
  "overallSentiment": { "home": -10 to 10, "away": -10 to 10 },
  "bettingImpact": "description of how news affects the line",
  "lineMovementPrediction": "which direction the line should move",
  "publicPerception": "what the general public thinks vs sharp reality",
  "contrarian": true/false,
  "contrarianReason": "why to go against the public if applicable"
}`;

    return await callGeminiJSON(prompt, { maxTokens: 800 });
}

/**
 * SITUATIONAL ANALYSIS: Identify non-obvious situational edges
 */
export async function analyzeSituation(game, scheduleData, factors) {
    const homeTeam = game.homeTeam?.name || 'Home';
    const awayTeam = game.awayTeam?.name || 'Away';

    const prompt = `You are a sharp sports betting situational analyst. Identify non-obvious situational edges for this game.

MATCHUP: ${awayTeam} @ ${homeTeam}
Home Record: ${game.homeTeam?.record || 'N/A'}
Away Record: ${game.awayTeam?.record || 'N/A'}

SCHEDULE CONTEXT: ${JSON.stringify(scheduleData || {}).substring(0, 800)}

KNOWN FACTORS: ${JSON.stringify((factors || []).map(f => ({ name: f.factor, advantage: f.advantage, impact: f.impact }))).substring(0, 800)}

Identify situational angles that the market might miss. Think about:
- Lookahead spots (big game coming up causing team to look ahead)
- Letdown spots (after a big win)
- Revenge games
- Travel/fatigue
- Motivation differences (playoff seeding, tanking, etc.)
- Coaching mismatches

Return JSON:
{
  "situations": [
    { "name": "angle name", "edge": "home|away|neutral", "strength": 1-10, "explanation": "why this matters" }
  ],
  "hiddenEdge": "the single best hidden angle in this game",
  "marketBlindSpot": "what the market is likely missing"
}`;

    return await callGeminiJSON(prompt, { maxTokens: 1000, temperature: 0.5 });
}

/**
 * SMART SCRAPING AGENT: Decide what to scrape and how
 */
export async function planScraping(game, existingData = {}) {
    const prompt = `You are a sports data collection agent. Given this game, decide what additional data to scrape.

GAME: ${game.awayTeam?.name} @ ${game.homeTeam?.name}
EXISTING DATA KEYS: ${Object.keys(existingData).join(', ')}

What additional data points would improve betting analysis? Return JSON:
{
  "dataPriorities": [
    { "dataType": "type", "source": "where to get it", "espnUrl": "specific ESPN URL if applicable", "importance": 1-10 }
  ],
  "missingCritical": ["list of critical missing data"],
  "dataQualityScore": 1-10
}`;

    return await callGeminiJSON(prompt, { maxTokens: 600, temperature: 0.2 });
}

/**
 * Get LLM status info
 */
export function getLLMStatus() {
    return {
        configured: isLLMConfigured(),
        model: GEMINI_MODEL,
        requestsThisMinute: requestCount,
        maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
        cacheSize: responseCache.size,
        cost: 'Free tier (Gemini 2.0 Flash)'
    };
}

export default {
    isLLMConfigured,
    callGemini,
    callGeminiJSON,
    smartExtractData,
    generateLLMAnalysis,
    analyzeSentiment,
    analyzeSituation,
    planScraping,
    getLLMStatus
};
