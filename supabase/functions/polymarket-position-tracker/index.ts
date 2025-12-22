/**
 * Supabase Edge Function: polymarket-position-tracker
 *
 * Fetches and calculates position data for Polymarket 15-minute up/down markets.
 * Shows filled orders, average costs, and profit lock status.
 */

import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import {
  buildMarketSlug,
  createLogEntry,
} from "../_shared/polymarket/utils.ts";
import type { SupportedAsset, BotLogEntry } from "../_shared/polymarket/types.ts";
import type {
  PositionTrackerRequest,
  PositionTrackerResponse,
} from "./types.ts";

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
 * Get the current 15-minute market timestamp
 * Returns the most recent 15-minute block (the current active market)
 */
function getCurrent15MinTimestamp(): number {
  const now = nowUtcSeconds();
  return Math.floor(now / 900) * 900;
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
        } as PositionTrackerResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: PositionTrackerRequest;
    try {
      requestBody = await req.json();
    } catch {
      logs.push(createLogEntry("ERROR", "Invalid JSON in request body"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          logs,
        } as PositionTrackerResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { asset, marketSlug: customSlug, tokenIds: customTokenIds } = requestBody;

    // Validate asset
    if (!asset || !isValidAsset(asset)) {
      logs.push(createLogEntry("ERROR", "Invalid or missing asset", { asset }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid asset. Must be one of: BTC, SOL, ETH, XRP",
          logs,
        } as PositionTrackerResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAsset = asset.toUpperCase() as SupportedAsset;

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
        } as PositionTrackerResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine market slug
    const timestamp = getCurrent15MinTimestamp();
    const marketSlug = customSlug || buildMarketSlug(normalizedAsset, timestamp);

    logs.push(createLogEntry("INFO", `Checking position for market: ${marketSlug}`));

    // Get token IDs (either from request or fetch from market)
    let tokenIds = customTokenIds;
    let marketTitle: string | undefined;

    if (!tokenIds) {
      // Fetch market to get token IDs
      const market = await client.getMarketBySlug(marketSlug);
      logs.push(...client.getLogs());
      client.clearLogs();

      if (!market) {
        logs.push(createLogEntry("WARN", "Market not found - may not be created yet"));
        return new Response(
          JSON.stringify({
            success: false,
            error: "Market not found - may not be created yet",
            logs,
          } as PositionTrackerResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      marketTitle = market.title;

      try {
        tokenIds = client.extractTokenIds(market);
        logs.push(...client.getLogs());
        client.clearLogs();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logs.push(createLogEntry("ERROR", `Failed to extract token IDs: ${errorMsg}`));
        return new Response(
          JSON.stringify({
            success: false,
            error: `Token extraction failed: ${errorMsg}`,
            logs,
          } as PositionTrackerResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get position
    const position = await client.getMarketPosition(marketSlug, tokenIds, marketTitle);
    logs.push(...client.getLogs());
    client.clearLogs();

    // Build response
    const response: PositionTrackerResponse = {
      success: true,
      data: {
        asset: normalizedAsset,
        position,
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
      } as PositionTrackerResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

