/** Tool types for source requirements */
type ToolType = 'x_search' | 'web_search';

/**
 * Generates prompts for analyzing event markets from any prediction market platform.
 * Accepts raw market JSON data (Kalshi, Polymarket, etc.) without normalization.
 */
export function analyzeEventMarketsPrompt(
    markets: unknown[],
    eventIdentifier: string,
    question: string,
    pmType: string,
    tools?: ToolType[]
): {
    systemPrompt: string;
    userPrompt: string;
} {
    const hasXSearch = tools?.includes('x_search');
    const hasWebSearch = tools?.includes('web_search');
    // Build tool-specific instructions for system prompt
    let toolInstructions = '';
    if (hasXSearch) {
        toolInstructions += '\nYou have access to X (Twitter) search. Use it to find the latest posts, news, and sentiment about this event. When you find relevant posts that back your analysis, include their URLs in your response.';
    }
    if (hasWebSearch) {
        toolInstructions += '\nYou have access to web search. Use it to find the latest news articles, reports, and analysis about this event. When you find relevant resources that back your analysis, include their URLs in your response.';
    }

    const systemPrompt = `You are a financial analyst expert in the field of prediction markets (posted on ${pmType}) that understands the latest news, events, and market trends.
Your expertise lies in deeply analyzing prediction markets for a specific event, identifying if there's alpha (mispricing) opportunity, and providing a clear recommendation on which side (YES or NO) is more likely to win based on your analysis.
You always provide a short analysisSummary of your findings, less than 270 characters, that is very conversational and understandable by a non-expert who just wants to understand which side it might make more sense to buy into.
${toolInstructions}
Your output is ALWAYS in JSON format and you are VERY STRICT about it. You must return valid JSON that matches the exact schema specified.`;

    const userPrompt = `# Task: Deep Analysis of an Event's Prediction Markets

You are analyzing all markets for a specific event (${eventIdentifier}) to determine:
1. Whether there is an alpha (mispricing) opportunity in any of the markets
2. Which market has the best alpha opportunity (if any)
3. Which side (YES or NO) is more likely to win for that market
4. Your confidence level in this assessment

## User's query/input/question About This Event
${question}

## Platform: ${pmType}

## Event Markets (${markets.length} market${markets.length !== 1 ? 's' : ''})

${JSON.stringify(markets, null, 2)}

## Your Analysis Process

1. **Understand the event**: Review all markets to understand the overall event and how the markets relate to each other
2. **Analyze each market**: For each market, understand the title/question, description, outcomes, and resolution rules
3. **Assess current pricing**: 
   - For Kalshi: \`last_price\` field (0-100) represents the current implied probability for YES
   - For Polymarket: \`outcomePrices\` field contains an array like ["0.21", "0.79"] where the first value is the YES probability (multiply by 100 to get percentage)
4. **Research and assess**: Use your knowledge of current events, news, trends, and fundamental factors to estimate actual probabilities
5. **Find the best opportunity**: Identify which market (if any) has the best alpha opportunity
6. **Consider context**: Take into account liquidity, volume, open interest, expiration/end dates, and market status
7. **Answer the user's question**: Address the specific question asked about this event

## What is Alpha?

Alpha in prediction markets occurs when there's a mispricing between:
- **Market Probability**: The current market price represents the market's collective assessment
- **Actual Probability**: Your assessment based on the latest information, trends, and analysis

### Example:
If the market prices an event at 30% (YES side), but your analysis suggests it should be 60%, there's a 30-point alpha opportunity in buying YES.
Conversely, if the market prices at 70% but you believe it should be 40%, there's alpha in buying NO.

## Output Format

Return your analysis in JSON format with the following fields. Focus on the SINGLE BEST market opportunity (or the most relevant market if no alpha exists):

{
  "event_ticker": "string - event ticker identifier",
  "ticker": "string - market ticker identifier for the best opportunity",
  "title": "string - market title",
  "marketProbability": number - current market probability (0-100),
  "estimatedActualProbability": number - your estimated actual probability (0-100),
  "alphaOpportunity": number - the difference (positive = buy yes, negative = buy no),
  "hasAlpha": boolean - whether you believe there is meaningful alpha (|alphaOpportunity| >= 5),
  "predictedWinner": "string - either 'YES' or 'NO' - which side you think will win",
  "winnerConfidence": number - confidence that your predicted winner will win (0-100),
  "recommendedAction": "string - either 'BUY YES', 'BUY NO', or 'NO TRADE' if no alpha",
  "reasoning": "string - detailed explanation of your analysis, including relevant trends, news, and factors. If there are multiple markets, explain why you chose this one.",
  "confidence": number - your confidence in this overall assessment (0-100),
  "keyFactors": ["string"] - array of key factors influencing your assessment,
  "risks": ["string"] - array of risks that could affect your prediction,
  "questionAnswer": "string - direct answer to the user's specific query/input/question",
  "analysisSummary": "string - brief summary of your findings under 270 characters"${hasXSearch ? `,
  "xSources": ["string"] - array of X (Twitter) post URLs that back your analysis (include 2-4 relevant posts)` : ''}${hasWebSearch ? `,
  "webSources": ["string"] - array of web URLs (news articles, reports, etc.) that back your analysis (include 2-4 relevant resources)` : ''}
}

## Important Notes

- Be thorough in your analysis - consider all markets for this event
- If there are multiple markets, explain why you selected the one you did as the best opportunity
- Consider both sides of the argument before making your recommendation
- If you don't find meaningful alpha (|alphaOpportunity| < 5) in ANY market, set hasAlpha to false and recommendedAction to "NO TRADE"
- Your predictedWinner should be the side you think will ultimately win (YES or NO), regardless of alpha
- winnerConfidence is specifically about which side wins, while confidence is about your overall analysis quality
- Be conservative with confidence scores - only assign high confidence when you have strong evidence
- Your reasoning should be specific and reference actual trends, news, or data when possible
- Address the user's query/input/question directly in the questionAnswer field
- The analysisSummary should be conversational and to-the-point, no hype or emojis${hasXSearch ? `
- IMPORTANT: Include 2-4 relevant X (Twitter) post URLs in xSources that back your analysis - these should be real posts you found via search` : ''}${hasWebSearch ? `
- IMPORTANT: Include 2-4 relevant web URLs (news articles, reports) in webSources that back your analysis - these should be real resources you found via search` : ''}

Now analyze these markets and provide your assessment. Return your response in the exact JSON format specified above.`;

    return {
        systemPrompt,
        userPrompt,
    };
}

