/**
 * AI prompt for generating optimized search queries
 * Takes an event/market title and extracts 1-2 most important keywords for cross-platform search
 */

export interface SearchQueryGeneratorInput {
  title: string;
  sourcePlatform: 'polymarket' | 'kalshi';
  targetPlatform: 'polymarket' | 'kalshi';
}

/**
 * Generates a prompt for the search query generator agent
 * The agent should return a 1-2 word search query
 */
export function searchQueryGeneratorPrompt(input: SearchQueryGeneratorInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { title, sourcePlatform, targetPlatform } = input;

  const systemPrompt = `You are a search query optimizer for prediction markets.

Your task is to extract the 1-2 MOST IMPORTANT keywords from an event title that would best match similar events on another platform.

Rules:
1. Return ONLY 1-2 words, no more
2. Focus on unique identifiers: names, specific events, dates, numbers
3. Remove common words like "will", "the", "be", "in", etc.
4. Prioritize proper nouns (people, companies, places)
5. If there's a person's name, that's usually the best keyword
6. For numeric targets (prices, percentages), include the key number

Examples:
- "Will Bitcoin reach $100,000 by end of 2025?" → "Bitcoin"
- "Will Elon Musk tweet about Dogecoin this week?" → "Elon Musk"
- "Jensen Huang mentions at CES 2026" → "Jensen"
- "Will the Fed cut interest rates in January?" → "Fed rates"
- "Trump wins 2024 election" → "Trump"
- "Apple stock above $200" → "Apple"

Return ONLY the search query, nothing else. No quotes, no explanation.`;

  const userPrompt = `Extract the best 1-2 word search query from this ${sourcePlatform} event title to search on ${targetPlatform}:

"${title}"

Search query:`;

  return {
    systemPrompt,
    userPrompt,
  };
}

