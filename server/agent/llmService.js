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
const RPM_LIMIT = 500; // Limit for OpenAI

/**
 * Check if OpenAI API key is configured
 */
export function isLLMConfigured() {
    return API_KEY && API_KEY.length > 10;
}

/**
 * Get LLM Status
 */
export function getLLMStatus() {
    return {
        configured: isLLMConfigured(),
        model: OPENAI_MODEL,
        provider: 'OpenAI'
    };
}

/**
 * Main function to generate text from a prompt
 */
export async function generateText(prompt, systemInstruction = "You are a helpful sports betting analyst.") {
    if (!isLLMConfigured()) {
        console.warn('[LLM] ⚠ No API Key. Skipping AI generation.');
        return null;
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
        return null;
    }
}

/**
 * Generate structured JSON from a prompt
 */
export async function generateJSON(prompt, schemaDescription = "valid JSON object") {
    if (!isLLMConfigured()) return null;

    const systemPrompt = `You are a data processing assistant. You must output ONLY valid JSON matching this description: ${schemaDescription}. Do not include markdown formatting like \`\`\`json. Just the raw JSON object.`;

    try {
        const text = await generateText(prompt, systemPrompt);
        if (!text) return null;

        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('[LLM] JSON generation error:', error.message);
        return null;
    }
}

/**
 * Advanced Analysis for Betting (Legacy alias)
 */
export async function analyzeBettingFactors(gameData, oddsData, newsData) {
    return generateLLMAnalysis(gameData, [], oddsData, []);
}

/**
 * Generate deep analysis for a game
 */
export async function generateLLMAnalysis(game, factors, odds, injuries) {
    const prompt = `
    Analyze this game deeply: ${game.awayTeam} @ ${game.homeTeam}
    Date: ${game.date}
    
    Odds: ${JSON.stringify(odds)}
    Factors: ${JSON.stringify(factors)}
    Injuries: ${JSON.stringify(injuries)}

    Output JSON logic:
    {
      "narrative": "Detailed narrative about the matchup...",
      "confidenceRating": 85 (0-100),
      "keyInsights": ["Insight 1", "Insight 2"],
      "prediction": { "winner": "Team", "spreadCover": "Team", "total": "Over/Under" }
    }
    `;
    return await generateJSON(prompt, "Deep analysis object");
}

/**
 * Situational Analysis
 */
export async function analyzeSituation(game, schedule, factors) {
    const prompt = `
    Analyze situational spots for ${game.awayTeam} @ ${game.homeTeam}.
    Schedule context: ${JSON.stringify(schedule)}
    
    Look for: Rest disadvantage, Lookahead spots, Sandwich games, Travel fatigue.
    
    Output JSON:
    {
      "situationLevel": "High/Medium/Low",
      "description": "Why this is a situational spot...",
      "advantage": "Home/Away/None"
    }
    `;
    return await generateJSON(prompt, "Situational analysis object");
}

/**
 * Sentiment Analysis
 */
export async function analyzeSentiment(news, homeTeam, awayTeam) {
    // If news is string, handle it. If array, stringify.
    const newsText = Array.isArray(news) ? JSON.stringify(news) : news;

    const prompt = `
    Analyze sentiment for ${homeTeam} vs ${awayTeam} based on this news:
    "${newsText?.substring(0, 1000)}"
    
    Output JSON:
    {
      "homeSentiment": 0-100,
      "awaySentiment": 0-100,
      "summary": "Brief summary of mood"
    }
    `;
    return await generateJSON(prompt, "Sentiment object");
}

/**
 * Smart Data Extraction
 */
export async function smartExtractData(rawHtml, dataType, context) {
    const prompt = `
    Extract "${dataType}" from this HTML snippet:
    ${rawHtml.substring(0, 2000)}
    Context: ${JSON.stringify(context)}
    
    Output valid JSON of the extracted data.
    `;
    return await generateJSON(prompt, "Extracted data object");
}

/**
 * Plan Scraping
 */
export async function planScraping(game, existingData) {
    return {
        dataPriorities: [],
        missingCritical: [],
        dataQualityScore: 8
    };
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
    isLLMConfigured,
    getLLMStatus,
    generateText,
    generateJSON,
    analyzeBettingFactors,
    generateLLMAnalysis,
    analyzeSituation,
    analyzeSentiment,
    smartExtractData,
    planScraping
};
