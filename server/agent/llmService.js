/**
 * LLM SERVICE - OpenAI GPT-4o-mini Integration
 * 
 * Connects to OpenAI API to power intelligent
 * scraping, analysis, and betting recommendations.
 * 
 * Uses GPT-4o-mini for fast, cost-effective reasoning.
 */

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';
const OPENAI_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Rate limiting state
let requestCount = 0;
let lastResetTime = Date.now();
const RPM_LIMIT = 500; // High limit for paid OpenAI tier

/**
 * Main function to generate text from a prompt
 */
export async function generateText(prompt, systemInstruction = "You are a helpful sports betting analyst.") {
    if (!API_KEY || API_KEY.length < 10) {
        console.warn('[LLM] ⚠️ No API Key provided. Returning mock response.');
        return "AI Analysis Unavailable - Please configure OpenAI API Key.";
    }

    try {
        await checkRateLimit();

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
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
            const errData = await response.json();
            throw new Error(`OpenAI API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";

    } catch (error) {
        console.error('[LLM] Generation error:', error.message);
        return `Error generating analysis: ${error.message}`;
    }
}

/**
 * Generate structured JSON from a prompt
 * forces valid JSON output
 */
export async function generateJSON(prompt, schemaDescription = "valid JSON object") {
    if (!API_KEY) return null;

    const systemPrompt = `You are a data processing assistant. You must output ONLY valid JSON matching this description: ${schemaDescription}. Do not include markdown formatting like \`\`\`json. Just the raw JSON object.`;

    try {
        const text = await generateText(prompt, systemPrompt);
        if (!text) return null;

        // Clean markdown if present
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('[LLM] JSON generation error:', error.message);
        return null;
    }
}

/**
 * Advanced Analysis for Betting
 */
export async function analyzeBettingFactors(gameData, oddsData, newsData) {
    const prompt = `
    Analyze this game for betting value:
    
    Game: ${gameData.homeTeam} vs ${gameData.awayTeam}
    Date: ${gameData.date}
    Odds: ${JSON.stringify(oddsData)}
    News: ${JSON.stringify(newsData).slice(0, 1000)}
    Stats: ${JSON.stringify(gameData.stats || {})}

    Identify the best bet (spread, moneyline, or total) and provide 3 key reasons why.
    Output JSON format:
    {
      "recommendation": "Team -5.5",
      "confidence": 85,
      "reasoning": ["Reason 1", "Reason 2", "Reason 3"],
      "riskLevel": "Medium"
    }
    `;

    return await generateJSON(prompt, "Betting recommendation object");
}

/**
 * Analyze sentiment of text for sports news
 */
export async function analyzeSentiment(text) {
    const prompt = `
    Analyze the sentiment of this sports news text for betting implications:
    "${text.substring(0, 500)}"
    
    Output JSON with sentiment score (0-100) and label.
    `;
    return await generateJSON(prompt, "{ score: number, label: string }");
}

async function checkRateLimit() {
    const now = Date.now();
    if (now - lastResetTime > 60000) {
        requestCount = 0;
        lastResetTime = now;
    }

    if (requestCount >= RPM_LIMIT) {
        const waitTime = 60000 - (now - lastResetTime);
        console.log(`[LLM] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        requestCount = 0;
        lastResetTime = Date.now();
    }

    requestCount++;
}

export default {
    generateText,
    generateJSON,
    analyzeBettingFactors,
    analyzeSentiment
};
