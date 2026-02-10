/**
 * LLM SERVICE - Multi-Provider (OpenAI & Gemini)
 * 
 * Automatically detects the provider based on available API keys.
 * Supports:
 * - OpenAI (gpt-4o-mini, gpt-4)
 * - Google Gemini (gemini-2.0-flash, gemini-1.5-pro)
 */

import dotenv from 'dotenv';

dotenv.config();

// Configuration
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_API;

// Default Models
const OPENAI_MODEL = 'gpt-4o-mini';
const GEMINI_MODEL = 'gemini-1.5-flash'; // More stable free tier

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

/**
 * Determine active provider
 */
function getProvider() {
    if (GEMINI_KEY && GEMINI_KEY.length > 5) return 'gemini';
    if (OPENAI_KEY && OPENAI_KEY.length > 5) return 'openai';
    return null;
}

export function isLLMConfigured() {
    return !!getProvider();
}

export function getLLMStatus() {
    const provider = getProvider();
    return {
        configured: !!provider,
        provider: provider || 'none',
        model: provider === 'gemini' ? GEMINI_MODEL : (provider === 'openai' ? OPENAI_MODEL : 'none')
    };
}

/**
 * Generate Text (Generic)
 */
export async function generateText(prompt, systemInstruction = "You are a helpful sports betting analyst.") {
    const provider = getProvider();
    if (!provider) {
        console.warn('[LLM] ⚠ No API Key configured.');
        return null;
    }

    // Rate limit
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - (now - lastRequestTime)));
    }
    lastRequestTime = Date.now();

    try {
        if (provider === 'gemini') {
            return await callGemini(prompt, systemInstruction);
        } else {
            return await callOpenAI(prompt, systemInstruction);
        }
    } catch (e) {
        console.error(`[LLM] Error (${provider}):`, e.message);
        return null;
    }
}

/**
 * Call Google Gemini API (REST)
 */
async function callGemini(prompt, systemInstruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    // Gemini doesn't have "system" role in the same way for simple content generation,
    // but supports system_instruction in beta or just prepended text.
    // For simplicity/stability, we prepend system instruction to prompt.
    const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini API: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "";
}

/**
 * Call OpenAI API (REST)
 */
async function callOpenAI(prompt, systemInstruction) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI API: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Generate JSON (Utility)
 */
export async function generateJSON(prompt, schemaDescription) {
    const systemPrompt = `You are a data processing assistant. Output ONLY valid JSON matching this schema: ${schemaDescription}. Do not include markdown code blocks (e.g. \`\`\`json). Just the raw JSON string.`;

    try {
        let text = await generateText(prompt, systemPrompt);
        if (!text) return null;

        // Clean markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find start/end brackets if extra text exists
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }

        return JSON.parse(text);
    } catch (e) {
        console.error('[LLM] JSON Parse Error:', e.message);
        return null; // Fallback
    }
}

/**
 * Helpers for specific tasks
 */
export const analyzeBettingFactors = (g, o, n) => generateLLMAnalysis(g, [], o, [], null);

export async function generateLLMAnalysis(game, factors, odds, injuries, socialData = null, monteCarloData = null) {
    const prompt = `
    Analyze this game: ${game.awayTeam} @ ${game.homeTeam}
    Date: ${game.date || 'Today'}
    
    Odds: ${JSON.stringify(odds).substring(0, 1000)}
    Factors: ${JSON.stringify(factors).substring(0, 2000)}
    Social Sentiment: ${JSON.stringify(socialData || {}).substring(0, 500)}
    Monte Carlo (Totals Model): ${JSON.stringify(monteCarloData || "No simulation")}
    
    Goal: Identify betting edge. Use Monte Carlo specifically for Over/Under totals.
    Output JSON (No Markdown):
    {
      "narrative": "Analysis summary including social sentiment and Monte Carlo projection for total...",
      "confidenceRating": 85,
      "keyInsights": ["Point 1", "Point 2"],
      "prediction": { "winner": "Team", "spreadCover": "Team", "total": "Over/Under" },
      "enhancedFactors": { 
         "Social": { "advantage": "Home/Away/None", "insight": "Brief insight" },
         "MonteCarlo": { "projectedTotal": 220, "edge": "Over/Under/None" }
      }
    }
    `;
    return await generateJSON(prompt, "Deep analysis object");
}

export async function analyzeSituation(game, schedule, factors) {
    const prompt = `
    Analyze schedule situation for ${game.awayTeam} @ ${game.homeTeam}.
    Schedule: ${JSON.stringify(schedule).substring(0, 1000)}
    Output JSON: { "situationLevel": "High/Medium/Low", "description": "reason", "advantage": "Home/Away" }
    `;
    return await generateJSON(prompt, "Situation object");
}

/*
 * Legacy exports for compatibility
 */
export const smartExtractData = (html) => ({}); // Stub
export const analyzeSentiment = (text) => ({ score: 0 }); // Stub
export const planScraping = (g) => ([]); // Stub
