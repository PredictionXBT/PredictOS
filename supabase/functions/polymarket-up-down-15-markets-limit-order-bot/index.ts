/**
 * Supabase Edge Function: polymarket-up-down-15-markets-limit-order-bot
 *
 * Automated limit order bot for Polymarket 15-minute up/down markets.
 * Places straddle orders on the closest upcoming market.
 */

import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import {
  buildMarketSlug,
  formatTimeShort,
  createLogEntry,
} from "../_shared/polymarket/utils.ts";
import type { SupportedAsset, BotLogEntry } from "../_shared/polymarket/types.ts";
import type {
  LimitOrderBotRequest,
  LimitOrderBotResponse,
  MarketOrderResult,
  LadderConfig,
  LadderRung,
  LadderRungResult,
} from "./types.ts";

// Trading configuration defaults
const DEFAULT_ORDER_PRICE = 0.48; // 48%
const DEFAULT_ORDER_SIZE_USD = 25; // $25 total

// Ladder betting defaults
const DEFAULT_LADDER_MAX_PRICE = 49;
const DEFAULT_LADDER_MIN_PRICE = 35;
const DEFAULT_LADDER_TAPER_FACTOR = 1.5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Validate that the asset is supported
 */
function isValidAsset(asset: string): asset is SupportedAsset {
  return ["BTC", "SOL", "ETH", "XRP"].includes(asset.toUpperCase());
}

/**
 * Get current UTC timestamp in seconds
 */
function nowUtcSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get the closest upcoming 15-minute timestamp.
 * Rounds UP to the next 15-minute block.
 */
function getNext15MinTimestamp(): number {
  const now = nowUtcSeconds();
  return Math.ceil(now / 900) * 900;
}

Deno.serve(async (req: Request) => {
  const logs: BotLogEntry[] = [];

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      logs.push(createLogEntry("ERROR", "Invalid request method", { method: req.method }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
          logs,
        } as LimitOrderBotResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: LimitOrderBotRequest;
    try {
      requestBody = await req.json();
    } catch {
      logs.push(createLogEntry("ERROR", "Invalid JSON in request body"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          logs,
        } as LimitOrderBotResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { asset, price, sizeUsd, ladder } = requestBody;

    // Validate asset
    if (!asset || !isValidAsset(asset)) {
      logs.push(createLogEntry("ERROR", "Invalid or missing asset", { asset }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid asset. Must be one of: BTC, SOL, ETH, XRP",
          logs,
        } as LimitOrderBotResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAsset = asset.toUpperCase() as SupportedAsset;

    // Determine if ladder mode is enabled
    const ladderMode = ladder?.enabled ?? false;

    // Get order configuration from request
    const orderPrice = price ? price / 100 : DEFAULT_ORDER_PRICE;
    const orderSizeUsd = sizeUsd || DEFAULT_ORDER_SIZE_USD;

    // Get ladder configuration (with defaults)
    const ladderConfig: LadderConfig = {
      enabled: ladderMode,
      maxPrice: ladder?.maxPrice ?? DEFAULT_LADDER_MAX_PRICE,
      minPrice: ladder?.minPrice ?? DEFAULT_LADDER_MIN_PRICE,
      taperFactor: ladder?.taperFactor ?? DEFAULT_LADDER_TAPER_FACTOR,
    };

    if (ladderMode) {
      logs.push(createLogEntry("INFO", `Ladder mode enabled`, {
        maxPrice: `${ladderConfig.maxPrice}%`,
        minPrice: `${ladderConfig.minPrice}%`,
        taperFactor: ladderConfig.taperFactor,
        totalBankroll: `$${orderSizeUsd}`,
      }));
    }

    // Get the closest upcoming 15-minute market timestamp
    const timestamp = getNext15MinTimestamp();
    const marketSlug = buildMarketSlug(normalizedAsset, timestamp);

    // Initialize the Polymarket client
    let client: PolymarketClient;
    try {
      client = createClientFromEnv();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(createLogEntry("ERROR", `Failed to initialize client: ${errorMsg}`));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Client initialization failed: ${errorMsg}`,
          logs,
        } as LimitOrderBotResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the market
    let marketResult: MarketOrderResult;

    try {
      // Fetch market data
      const market = await client.getMarketBySlug(marketSlug);
      logs.push(...client.getLogs());
      client.clearLogs();

      if (!market) {
        marketResult = {
          marketSlug,
          marketStartTime: formatTimeShort(timestamp),
          targetTimestamp: timestamp,
          error: "Market not found - may not be created yet",
        };
      } else {
        // Extract token IDs
        let tokenIds;
        try {
          tokenIds = client.extractTokenIds(market);
          logs.push(...client.getLogs());
          client.clearLogs();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logs.push(createLogEntry("ERROR", `Failed to extract token IDs: ${errorMsg}`));
          marketResult = {
            marketSlug,
            marketTitle: market.title,
            marketStartTime: formatTimeShort(timestamp),
            targetTimestamp: timestamp,
            error: `Token extraction failed: ${errorMsg}`,
          };

          return new Response(
            JSON.stringify({
              success: false,
              error: marketResult.error,
              data: {
                asset: normalizedAsset,
                pricePercent: orderPrice * 100,
                sizeUsd: orderSizeUsd,
                ladderMode,
                market: marketResult,
              },
              logs,
            } as LimitOrderBotResponse),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Place orders based on mode
        if (ladderMode) {
          // Ladder mode: place orders at multiple price levels
          const ladderResults = await client.placeLadderOrders(
            tokenIds,
            orderSizeUsd,
            ladderConfig.maxPrice!,
            ladderConfig.minPrice!,
            ladderConfig.taperFactor!
          );
          logs.push(...client.getLogs());
          client.clearLogs();

          // Convert ladder results to LadderRungResult format
          const ladderOrdersPlaced: LadderRungResult[] = ladderResults.results.map(r => ({
            pricePercent: r.pricePercent,
            sizeUsd: r.sizeUsd,
            up: r.up,
            down: r.down,
          }));

          marketResult = {
            marketSlug,
            marketTitle: market.title,
            marketStartTime: formatTimeShort(timestamp),
            targetTimestamp: timestamp,
            ladderOrdersPlaced,
            ladderTotalOrders: ladderResults.totalOrders,
            ladderSuccessfulOrders: ladderResults.successfulOrders,
          };
        } else {
          // Simple mode: single straddle order
          const orderResults = await client.placeStraddleOrders(tokenIds, orderPrice, orderSizeUsd);
          logs.push(...client.getLogs());
          client.clearLogs();

          marketResult = {
            marketSlug,
            marketTitle: market.title,
            marketStartTime: formatTimeShort(timestamp),
            targetTimestamp: timestamp,
            ordersPlaced: orderResults,
          };
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(createLogEntry("ERROR", `Error processing market ${marketSlug}: ${errorMsg}`));
      marketResult = {
        marketSlug,
        marketStartTime: formatTimeShort(timestamp),
        targetTimestamp: timestamp,
        error: errorMsg,
      };
    }

    // Build ladder rungs for response if in ladder mode
    let ladderRungs: LadderRung[] | undefined;
    if (ladderMode) {
      ladderRungs = client.calculateLadderRungs(
        orderSizeUsd,
        ladderConfig.maxPrice!,
        ladderConfig.minPrice!,
        ladderConfig.taperFactor!
      );
      client.clearLogs(); // Clear the calculation logs (we already have them)
    }

    const response: LimitOrderBotResponse = {
      success: !marketResult.error,
      data: {
        asset: normalizedAsset,
        pricePercent: orderPrice * 100,
        sizeUsd: orderSizeUsd,
        ladderMode,
        ladderConfig: ladderMode ? ladderConfig : undefined,
        ladderRungs: ladderMode ? ladderRungs : undefined,
        market: marketResult,
      },
      logs,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(createLogEntry("ERROR", `Unhandled error: ${errorMsg}`));

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        logs,
      } as LimitOrderBotResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
