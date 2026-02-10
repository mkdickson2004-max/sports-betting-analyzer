/**
 * AI SCRAPING AGENT
 * 
 * LLM-powered agent that intelligently scrapes, parses,
 * and analyzes sports data for betting edges.
 * 
 * The agent uses Gemini to:
 * 1. Parse messy HTML into clean structured data
 * 2. Identify what data is missing and needs scraping
 * 3. Generate contextual betting analysis
 * 4. Find hidden situational edges
 */

import {
    isLLMConfigured,
    smartExtractData,
    generateLLMAnalysis,
    analyzeSentiment,
    analyzeSituation,
    planScraping,
    getLLMStatus
} from './llmService.js';

/**
 * AI AGENT: Run full intelligent analysis for a game
 * 
 * This is the main entry point. It:
 * 1. Checks what data we already have
 * 2. Uses LLM to extract better data from raw scrapes
 * 3. Generates deep analysis with LLM reasoning
 * 4. Returns enhanced data for the frontend
 */
export async function runAgentAnalysis(game, scrapedData, odds, injuries, news) {
    const homeTeam = game.homeTeam?.name || 'Home';
    const awayTeam = game.awayTeam?.name || 'Away';
    const gameId = game.id;

    console.log(`[AI AGENT] 🤖 Starting analysis for ${awayTeam} @ ${homeTeam}`);

    const result = {
        gameId,
        homeTeam,
        awayTeam,
        agentPowered: true,
        llmConfigured: isLLMConfigured(),
        timestamp: new Date().toISOString(),
        analysis: null,
        sentiment: null,
        situations: null,
        enhancedFactors: null,
        narrative: null,
        confidence: 0
    };

    // If LLM is not configured, return data with flag
    if (!isLLMConfigured()) {
        console.log('[AI AGENT] ⚠ LLM not configured. Running in rule-based mode.');
        result.analysis = {
            note: 'LLM not configured. Set GEMINI_API_KEY for AI-powered analysis.',
            mode: 'rule-based'
        };
        return result;
    }

    try {
        // Run LLM tasks SEQUENTIALLY to respect rate limits
        // Gemini free tier = 15 RPM, so we space out calls

        // 1. Deep matchup analysis
        try {
            const llmAnalysis = await generateLLMAnalysis(
                game,
                scrapedData?.factors || [],
                odds,
                injuries
            );
            if (llmAnalysis) {
                result.analysis = llmAnalysis;
                result.narrative = llmAnalysis.narrative || null;
                result.confidence = llmAnalysis.confidenceRating || 0;
                console.log(`[AI AGENT] ✓ Deep analysis generated (confidence: ${result.confidence}/100)`);
            }
        } catch (e) {
            console.error(`[AI AGENT] Analysis error:`, e.message);
        }

        // 2. Situational edge detection (Concurrent w/ others if possible, but sequential is safer for logic)
        try {
            const situationResult = await analyzeSituation(
                game,
                scrapedData?.schedule || {},
                scrapedData?.factors || []
            );
            if (situationResult) {
                result.situations = situationResult;
                console.log(`[AI AGENT] ✓ Situational edges identified`);
            }
        } catch (e) {
            console.error(`[AI AGENT] Situation error:`, e.message);
        }

        // 3. News sentiment analysis
        if (news?.length > 0) {
            try {
                const sentimentResult = await analyzeSentiment(news, homeTeam, awayTeam);
                if (sentimentResult) {
                    result.sentiment = sentimentResult;
                    console.log(`[AI AGENT] ✓ Sentiment analysis complete`);
                }
            } catch (e) {
                console.error(`[AI AGENT] Sentiment error:`, e.message);
            }
        }

        console.log(`[AI AGENT] ✅ Analysis complete for ${awayTeam} @ ${homeTeam}`);

    } catch (error) {
        console.error(`[AI AGENT] Error in analysis:`, error.message);
        result.error = error.message;
    }

    return result;
}

/**
 * AI AGENT: Smart data extraction from raw scraped HTML
 * 
 * When the regular scraper gets messy HTML, this agent
 * uses the LLM to clean and structure the data.
 */
export async function agentExtractData(rawHtml, dataType, context = {}) {
    if (!isLLMConfigured()) {
        return null;
    }

    console.log(`[AI AGENT] 📊 Extracting ${dataType} data with LLM...`);

    try {
        const extracted = await smartExtractData(rawHtml, dataType, context);
        if (extracted) {
            console.log(`[AI AGENT] ✓ Successfully extracted ${dataType} data`);
        }
        return extracted;
    } catch (error) {
        console.error(`[AI AGENT] Extraction error:`, error.message);
        return null;
    }
}

/**
 * AI AGENT: Plan what data to scrape next
 */
export async function agentPlanScraping(game, existingData) {
    if (!isLLMConfigured()) {
        return getDefaultScrapingPlan(game);
    }

    try {
        const plan = await planScraping(game, existingData);
        return plan || getDefaultScrapingPlan(game);
    } catch (error) {
        return getDefaultScrapingPlan(game);
    }
}

/**
 * Default scraping plan when LLM is not available
 */
function getDefaultScrapingPlan(game) {
    return {
        dataPriorities: [
            { dataType: 'schedule', source: 'ESPN', importance: 9 },
            { dataType: 'injuries', source: 'ESPN', importance: 9 },
            { dataType: 'teamStats', source: 'ESPN', importance: 8 },
            { dataType: 'headToHead', source: 'ESPN', importance: 7 },
            { dataType: 'odds', source: 'DraftKings/FanDuel', importance: 10 }
        ],
        missingCritical: [],
        dataQualityScore: 5
    };
}

/**
 * Get agent status for the frontend
 */
export function getAgentStatus() {
    const llmStatus = getLLMStatus();
    return {
        ...llmStatus,
        agentMode: llmStatus.configured ? 'ai-powered' : 'rule-based',
        capabilities: llmStatus.configured
            ? [
                'Smart data extraction',
                'Deep matchup analysis',
                'News sentiment analysis',
                'Situational edge detection',
                'Intelligent scraping planning',
                'Narrative generation'
            ]
            : [
                'Rule-based analysis',
                'Statistical calculations',
                'Basic scraping'
            ]
    };
}

export default {
    runAgentAnalysis,
    agentExtractData,
    agentPlanScraping,
    getAgentStatus
};
