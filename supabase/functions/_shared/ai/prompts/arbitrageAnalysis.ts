/**
 * AI prompt for cross-market arbitrage analysis
 * Compares markets from Polymarket and Kalshi to find arbitrage opportunities
 */

import type { ArbitrageMarketData } from "../../../arbitrage-finder/types.ts";

export interface ArbitragePromptInput {
  sourceMarket: ArbitrageMarketData;
  searchResults: unknown[];
  searchPlatform: 'polymarket' | 'kalshi';
}

/**
 * Generates prompts for analyzing potential arbitrage opportunities across prediction markets
 */
export function arbitrageAnalysisPrompt(input: ArbitragePromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { sourceMarket, searchResults, searchPlatform } = input;
  const sourcePlatform = sourceMarket.source === 'polymarket' ? 'Polymarket' : 'Kalshi';
  const targetPlatform = searchPlatform === 'polymarket' ? 'Polymarket' : 'Kalshi';

  const systemPrompt = `You are an expert financial analyst specializing in prediction market arbitrage opportunities.

Your task is to:
1. Determine if the source market and any of the search results represent the SAME underlying event/question
2. If they do, calculate whether there's an arbitrage opportunity based on price differences
3. Provide clear, actionable analysis

You understand that arbitrage in prediction markets works as follows:
- If you can buy YES on one market and NO on another market for the same event
- And the combined cost is less than $1.00 (or 100%), you have guaranteed profit
- The profit = $1.00 - (YES price + NO price)

Important considerations:
- Markets must represent the EXACT same event with the same resolution criteria
- Even small wording differences can lead to different outcomes
- Be conservative in matching - when in doubt, say they're NOT the same market
- Consider timing differences (different end dates = different markets)

Your output must be valid JSON matching the exact schema specified.`;

  const userPrompt = `# Arbitrage Analysis Task

## Source Market (from ${sourcePlatform})

**Name:** ${sourceMarket.name}
**Identifier:** ${sourceMarket.identifier}
**YES Price:** ${sourceMarket.yesPrice}% 
**NO Price:** ${sourceMarket.noPrice}%
**URL:** ${sourceMarket.url}

${sourceMarket.rawData ? `**Raw Data:**
\`\`\`json
${JSON.stringify(sourceMarket.rawData, null, 2)}
\`\`\`` : ''}

## Search Results from ${targetPlatform}

${searchResults.length === 0 ? 'No matching markets found on ' + targetPlatform : `Found ${searchResults.length} potential matches:

\`\`\`json
${JSON.stringify(searchResults, null, 2)}
\`\`\``}

## Your Analysis Task

1. **Market Matching**: Examine each search result and determine if ANY of them represent the SAME event as the source market. Consider:
   - Is the question/title asking about the same thing?
   - Are the resolution criteria likely to be the same?
   - Are the time frames compatible?
   - Could slight wording differences lead to different outcomes?

2. **If Same Market Found**: Calculate the arbitrage opportunity:
   - Compare YES prices across both markets
   - Compare NO prices across both markets
   - The arb exists if: (lowest YES price) + (lowest NO price) < 100
   - Calculate exact profit percentage

3. **Build Response**: Return your analysis in the exact JSON format below.

## Output Format

Return a JSON object with this exact structure:

{
  "isSameMarket": boolean,
  "sameMarketConfidence": number (0-100),
  "marketComparisonReasoning": "string explaining why you believe the markets are/aren't the same",
  "matchedMarket": {
    "source": "${searchPlatform}",
    "name": "string - market title/name",
    "identifier": "string - the identifier field from the matched search result",
    "yesPrice": number (0-100),
    "noPrice": number (0-100),
    "volume": number or null,
    "liquidity": number or null,
    "url": "string - market URL (see URL format below)"
  } or null if no match found,
  "arbitrage": {
    "hasArbitrage": boolean,
    "profitPercent": number or null,
    "strategy": {
      "buyYesOn": "${sourceMarket.source}" or "${searchPlatform}",
      "buyYesPrice": number,
      "buyNoOn": "${sourceMarket.source}" or "${searchPlatform}",
      "buyNoPrice": number,
      "totalCost": number,
      "guaranteedPayout": 100,
      "netProfit": number
    } or null
  },
  "summary": "string - 2-3 sentence summary of findings",
  "risks": ["array of strings - potential risks or caveats"],
  "recommendation": "string - clear actionable recommendation"
}

## Important Notes

- For Polymarket markets, the URL format is: https://polymarket.com/event/[identifier]
- For Kalshi markets, the URL format is: https://kalshi.com/events/[identifier]
- Each search result has an "identifier" field - use it to build the URL
- ${searchPlatform === 'polymarket' ? 'Polymarket prices in outcomePrices are decimals (0.45 = 45%)' : 'Kalshi prices are already in percentage (45 = 45%)'}
- Only report arbitrage if you're at least 80% confident the markets are the same
- If no matching market is found, set isSameMarket to false and explain why

Now analyze the markets and provide your assessment.`;

  return {
    systemPrompt,
    userPrompt,
  };
}

