/**
 * Supabase Edge Function: polymarket-put-order
 * 
 * Places a buy order on Polymarket for the specified side (YES/NO).
 * Used by the autonomous mode to execute trades based on agent analysis.
 * 
 * Supports two modes:
 * 1. Mapper mode (preferred): Pass orderParams from mapper-agent with pre-calculated values
 * 2. Legacy mode: Pass individual fields and let the endpoint figure out order params
 */

import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import type {
  PolymarketPutOrderRequest,
  PolymarketPutOrderResponse,
  OrderResult,
} from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Budget limits (for legacy mode)
const MIN_BUDGET = 1;
const MAX_BUDGET = 100;

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Received request:", req.method, req.url);

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: PolymarketPutOrderRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Polymarket client
    let client: PolymarketClient;
    try {
      client = createClientFromEnv();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to initialize Polymarket client: ${errorMsg}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tokenId: string;
    let orderPrice: number;
    let size: number;
    let side: "YES" | "NO";
    let conditionId: string;
    let marketSlug: string;
    let marketTitle: string = "";
    let tickSize: string = "0.01";
    let negRisk: boolean = false;

    // Check if using mapper mode (orderParams provided)
    if (requestBody.orderParams) {
      console.log("Using mapper mode with pre-calculated order params");
      const params = requestBody.orderParams;

      // Validate mapper params
      if (!params.tokenId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing orderParams.tokenId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      tokenId = params.tokenId;
      orderPrice = params.price;
      size = params.size;
      tickSize = params.tickSize || "0.01";
      negRisk = params.negRisk ?? false;
      conditionId = params.conditionId;
      marketSlug = params.marketSlug;

      // Determine side from the fact that we're always buying
      // The mapper already selected the correct token for the recommended side
      side = "YES"; // This is just for logging - the tokenId determines what we're actually buying

      console.log("Mapper order params:", {
        tokenId: `${tokenId.slice(0, 16)}...`,
        price: orderPrice,
        size,
        tickSize,
        negRisk,
      });

    } else {
      // Legacy mode - figure out order params from individual fields
      console.log("Using legacy mode - calculating order params");
      
      const { conditionId: legacyConditionId, marketSlug: legacyMarketSlug, side: legacySide, budgetUsd, price: requestedPrice } = requestBody;

      // Validate legacy parameters
      if (!legacyConditionId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required parameter: 'conditionId' or 'orderParams'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!legacyMarketSlug) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required parameter: 'marketSlug'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!legacySide || (legacySide !== "YES" && legacySide !== "NO")) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid 'side'. Must be 'YES' or 'NO'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof budgetUsd !== "number" || budgetUsd < MIN_BUDGET || budgetUsd > MAX_BUDGET) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid 'budgetUsd'. Must be between $${MIN_BUDGET} and $${MAX_BUDGET}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conditionId = legacyConditionId;
      marketSlug = legacyMarketSlug;
      side = legacySide;

      // Fetch market data
      console.log("Fetching market data for:", marketSlug);
      const market = await client.getMarketBySlug(marketSlug);

      if (!market) {
        return new Response(
          JSON.stringify({ success: false, error: `Market not found: ${marketSlug}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!market.acceptingOrders) {
        return new Response(
          JSON.stringify({ success: false, error: "Market is not accepting orders" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (market.closed) {
        return new Response(
          JSON.stringify({ success: false, error: "Market is closed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      marketTitle = market.title;

      // Extract token IDs
      const tokenIds = client.extractTokenIds(market);

      // Determine which token to buy based on side
      const outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
      const prices = JSON.parse(market.outcomePrices || '["0.5", "0.5"]');
      
      const yesIndex = outcomes.findIndex((o: string) => 
        o.toLowerCase() === "yes" || o.toLowerCase() === "up"
      );
      const noIndex = outcomes.findIndex((o: string) => 
        o.toLowerCase() === "no" || o.toLowerCase() === "down"
      );

      let currentPrice: number;
      if (side === "YES") {
        tokenId = yesIndex === 0 ? tokenIds.up : tokenIds.down;
        currentPrice = parseFloat(prices[yesIndex >= 0 ? yesIndex : 0]);
      } else {
        tokenId = noIndex === 0 ? tokenIds.up : tokenIds.down;
        currentPrice = parseFloat(prices[noIndex >= 0 ? noIndex : 1]);
      }

      orderPrice = requestedPrice ?? currentPrice;
      size = budgetUsd! / orderPrice;

      // Validate minimum shares
      if (Math.floor(size) < 5) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Budget too small. At current price (${(orderPrice * 100).toFixed(1)}%), minimum budget is $${(5 * orderPrice).toFixed(2)}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Placing order:", {
      side,
      tokenId: `${tokenId.slice(0, 16)}...`,
      price: orderPrice,
      size: Math.floor(size),
    });

    // Place the order
    const orderResponse = await client.placeOrder({
      tokenId,
      price: orderPrice,
      size,
      side: "BUY",
    });

    const orderResult: OrderResult = {
      success: orderResponse.success,
      orderId: orderResponse.orderId,
      status: orderResponse.status,
      errorMsg: orderResponse.errorMsg,
      tokenId,
      side,
      price: orderPrice,
      size: Math.floor(size),
      costUsd: Math.round(size * orderPrice * 100) / 100,
    };

    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    if (!orderResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: orderResponse.errorMsg || "Order placement failed",
          data: { order: orderResult },
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response: PolymarketPutOrderResponse = {
      success: true,
      data: {
        order: orderResult,
        market: {
          slug: marketSlug,
          title: marketTitle,
          conditionId,
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
    console.error("Unhandled error:", error);
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
