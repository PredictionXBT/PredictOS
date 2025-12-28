/**
 * Supabase Edge Function: mapper-agent
 * 
 * Translates analysis output from bookmaker/analysis agents into platform-specific
 * order parameters that can be used to place orders.
 * 
 * Currently supports: Polymarket
 * Coming soon: Kalshi
 */

import type {
  MapperAgentRequest,
  MapperAgentResponse,
  PolymarketOrderParams,
  MarketData,
  AnalysisResult,
} from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Budget limits
const MIN_BUDGET = 1;
const MAX_BUDGET = 100;

// Polymarket constants
const DEFAULT_TICK_SIZE = "0.01";
const DEFAULT_NEG_RISK = false;
const MIN_SHARES = 5; // Polymarket minimum

/**
 * Parse token IDs from clobTokenIds string
 * Format: '["tokenId1", "tokenId2"]'
 */
function parseTokenIds(clobTokenIds: string): [string, string] {
  try {
    const parsed = JSON.parse(clobTokenIds);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [parsed[0], parsed[1]];
    }
    throw new Error("Invalid token IDs format");
  } catch {
    throw new Error(`Failed to parse clobTokenIds: ${clobTokenIds}`);
  }
}

/**
 * Parse outcomes from outcomes string
 * Format: '["Yes", "No"]' or '["Up", "Down"]'
 */
function parseOutcomes(outcomes: string): string[] {
  try {
    return JSON.parse(outcomes);
  } catch {
    return ["Yes", "No"];
  }
}

/**
 * Parse prices from outcomePrices string
 * Format: '["0.65", "0.35"]'
 */
function parsePrices(outcomePrices: string): number[] {
  try {
    const parsed = JSON.parse(outcomePrices);
    return parsed.map((p: string) => parseFloat(p));
  } catch {
    return [0.5, 0.5];
  }
}

/**
 * Round price to valid tick size
 */
function roundToTickSize(price: number, tickSize: string): number {
  const tick = parseFloat(tickSize);
  return Math.round(price / tick) * tick;
}

/**
 * Map analysis result to Polymarket order parameters
 */
function mapToPolymarketOrder(
  analysisResult: AnalysisResult,
  marketData: MarketData,
  budgetUsd: number
): PolymarketOrderParams {
  // Validate market is tradeable
  if (marketData.closed) {
    throw new Error("Market is closed");
  }
  if (marketData.acceptingOrders === false) {
    throw new Error("Market is not accepting orders");
  }

  // Parse token IDs and outcomes
  if (!marketData.clobTokenIds) {
    throw new Error("Missing clobTokenIds in market data");
  }
  const [tokenId0, tokenId1] = parseTokenIds(marketData.clobTokenIds);
  const outcomes = parseOutcomes(marketData.outcomes || '["Yes", "No"]');
  const prices = parsePrices(marketData.outcomePrices || '["0.5", "0.5"]');

  // Determine which side to buy based on recommended action
  const buyYes = analysisResult.recommendedAction === "BUY YES";
  const side: "YES" | "NO" = buyYes ? "YES" : "NO";

  // Find the correct token ID and price for our side
  // Outcomes are typically ["Yes", "No"] or ["Up", "Down"]
  const yesIndex = outcomes.findIndex((o: string) => 
    o.toLowerCase() === "yes" || o.toLowerCase() === "up"
  );
  const noIndex = outcomes.findIndex((o: string) => 
    o.toLowerCase() === "no" || o.toLowerCase() === "down"
  );

  let tokenId: string;
  let currentPrice: number;

  if (buyYes) {
    // Buying YES side
    tokenId = yesIndex === 0 ? tokenId0 : tokenId1;
    currentPrice = prices[yesIndex >= 0 ? yesIndex : 0];
  } else {
    // Buying NO side
    tokenId = noIndex === 0 ? tokenId0 : tokenId1;
    currentPrice = prices[noIndex >= 0 ? noIndex : 1];
  }

  // Get tick size and neg risk from market data or use defaults
  const tickSize = marketData.minimumTickSize || DEFAULT_TICK_SIZE;
  const negRisk = marketData.negRisk ?? DEFAULT_NEG_RISK;

  // Round price to valid tick size
  const orderPrice = roundToTickSize(currentPrice, tickSize);

  // Calculate size (number of shares)
  // size = budget / price
  const rawSize = budgetUsd / orderPrice;
  const size = Math.floor(rawSize);

  // Validate minimum shares
  if (size < MIN_SHARES) {
    throw new Error(
      `Budget too small. At current price (${(orderPrice * 100).toFixed(1)}%), ` +
      `minimum budget is $${(MIN_SHARES * orderPrice).toFixed(2)} for ${MIN_SHARES} shares`
    );
  }

  // Build order description
  const orderDescription = 
    `BUY ${size} shares of ${side} @ ${(orderPrice * 100).toFixed(1)}% ` +
    `for ~$${(size * orderPrice).toFixed(2)} on "${marketData.title || marketData.question || 'Unknown Market'}"`;

  return {
    tokenId,
    price: orderPrice,
    side: "BUY",
    size,
    feeRateBps: 0,
    tickSize,
    negRisk,
    conditionId: marketData.conditionId || "",
    marketSlug: marketData.slug || "",
    orderDescription,
  };
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Mapper Agent - Received request:", req.method, req.url);

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: MapperAgentRequest;
    try {
      requestBody = await req.json();
      console.log("Request body received:", {
        platform: requestBody.platform,
        recommendedAction: requestBody.analysisResult?.recommendedAction,
        budgetUsd: requestBody.budgetUsd,
      });
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { platform, analysisResult, marketData, budgetUsd } = requestBody;

    // Validate platform
    if (!platform || (platform !== "Polymarket" && platform !== "Kalshi")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid platform. Must be 'Polymarket' or 'Kalshi'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate analysis result
    if (!analysisResult || !analysisResult.recommendedAction) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing analysisResult or recommendedAction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for NO TRADE recommendation
    if (analysisResult.recommendedAction === "NO TRADE") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Agents recommend NO TRADE - no order to place",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate market data
    if (!marketData) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing marketData" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate budget
    if (typeof budgetUsd !== "number" || budgetUsd < MIN_BUDGET || budgetUsd > MAX_BUDGET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid budgetUsd. Must be between $${MIN_BUDGET} and $${MAX_BUDGET}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Kalshi (TODO)
    if (platform === "Kalshi") {
      // TODO: Implement Kalshi order mapping when Kalshi autonomous mode is supported
      return new Response(
        JSON.stringify({
          success: false,
          error: "Kalshi autonomous mode coming soon! Currently only Polymarket is supported.",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map to Polymarket order parameters
    console.log("Mapping to Polymarket order...");
    const orderParams = mapToPolymarketOrder(analysisResult, marketData, budgetUsd);
    console.log("Order mapped:", {
      side: analysisResult.recommendedAction === "BUY YES" ? "YES" : "NO",
      price: orderParams.price,
      size: orderParams.size,
      tokenId: `${orderParams.tokenId.slice(0, 16)}...`,
    });

    const processingTimeMs = Date.now() - startTime;
    console.log("Mapper Agent completed in", processingTimeMs, "ms");

    const response: MapperAgentResponse = {
      success: true,
      data: {
        platform: "Polymarket",
        orderParams,
        analysis: {
          recommendedAction: analysisResult.recommendedAction,
          side: analysisResult.recommendedAction === "BUY YES" ? "YES" : "NO",
          confidence: analysisResult.winnerConfidence,
        },
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Mapper Agent error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

