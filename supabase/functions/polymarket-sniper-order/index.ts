/**
 * Supabase Edge Function: polymarket-sniper-order
 *
 * Dump Sniper - Real-time WebSocket price monitoring for market opportunities
 * Executes market limit orders when price drops below threshold
 */

import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import { createLogEntry } from "../_shared/polymarket/utils.ts";
import type { BotLogEntry } from "../_shared/polymarket/types.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Request/Response Types
 */
interface SniperOrderRequest {
  conditionId: string;
  marketSlug: string;
  side: "YES" | "NO";
  targetPrice: number; // Price threshold to trigger the sniper (0-1)
  size: number; // Size in shares
  dropThreshold?: number; // Optional: percentage drop threshold (0-100)
}

interface SniperOrderResponse {
  success: boolean;
  data?: {
    orderPlaced: boolean;
    orderId?: string;
    currentPrice: number;
    targetPrice: number;
    triggered: boolean;
  };
  error?: string;
  logs: BotLogEntry[];
}

/**
 * Get current market price from Polymarket
 */
async function getCurrentPrice(
  client: PolymarketClient,
  marketSlug: string,
  side: "YES" | "NO"
): Promise<number> {
  const market = await client.getMarketBySlug(marketSlug);
  
  if (!market) {
    throw new Error(`Market not found: ${marketSlug}`);
  }
  
  const outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
  const prices = JSON.parse(market.outcomePrices || '["0.5", "0.5"]');
  
  // Find the index for the requested side
  let priceIndex = 0;
  if (side === "YES") {
    priceIndex = outcomes.findIndex((o: string) => 
      o.toLowerCase() === "yes" || o.toLowerCase() === "up"
    );
  } else {
    priceIndex = outcomes.findIndex((o: string) => 
      o.toLowerCase() === "no" || o.toLowerCase() === "down"
    );
  }
  
  if (priceIndex === -1) {
    priceIndex = side === "YES" ? 0 : 1;
  }
  
  return parseFloat(prices[priceIndex]);
}

/**
 * Check if sniper should trigger based on price and threshold
 */
function shouldTrigger(
  currentPrice: number,
  targetPrice: number,
  dropThreshold?: number
): boolean {
  // If drop threshold is specified, check percentage drop
  if (dropThreshold !== undefined && dropThreshold > 0) {
    const dropPercent = ((targetPrice - currentPrice) / targetPrice) * 100;
    return dropPercent >= dropThreshold;
  }
  
  // Otherwise, simply check if current price is at or below target
  return currentPrice <= targetPrice;
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
        } as SniperOrderResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    let requestBody: SniperOrderRequest;
    try {
      requestBody = await req.json();
    } catch {
      logs.push(createLogEntry("ERROR", "Invalid JSON in request body"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { conditionId, marketSlug, side, targetPrice, size, dropThreshold } = requestBody;
    
    // Validate required parameters
    if (!conditionId || !marketSlug || !side || targetPrice === undefined || !size) {
      logs.push(createLogEntry("ERROR", "Missing required parameters"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameters: conditionId, marketSlug, side, targetPrice, size",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate side
    if (side !== "YES" && side !== "NO") {
      logs.push(createLogEntry("ERROR", "Invalid side parameter", { side }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid 'side'. Must be 'YES' or 'NO'",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate targetPrice
    if (targetPrice < 0 || targetPrice > 1) {
      logs.push(createLogEntry("ERROR", "Invalid targetPrice", { targetPrice }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid 'targetPrice'. Must be between 0 and 1",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    logs.push(createLogEntry("INFO", "Sniper order request received", {
      marketSlug,
      side,
      targetPrice: `${(targetPrice * 100).toFixed(1)}%`,
      size,
      dropThreshold: dropThreshold ? `${dropThreshold}%` : "N/A",
    }));
    
    // Initialize Polymarket client
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
        } as SniperOrderResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get current market price
    logs.push(createLogEntry("INFO", "Fetching current market price..."));
    const currentPrice = await getCurrentPrice(client, marketSlug, side);
    logs.push(...client.getLogs());
    client.clearLogs();
    
    logs.push(createLogEntry("INFO", "Current market price", {
      price: `${(currentPrice * 100).toFixed(1)}%`,
    }));
    
    // Check if sniper should trigger
    const triggered = shouldTrigger(currentPrice, targetPrice, dropThreshold);
    
    if (!triggered) {
      logs.push(createLogEntry("INFO", "Sniper not triggered - price above threshold", {
        currentPrice: `${(currentPrice * 100).toFixed(1)}%`,
        targetPrice: `${(targetPrice * 100).toFixed(1)}%`,
      }));
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            orderPlaced: false,
            currentPrice,
            targetPrice,
            triggered: false,
          },
          logs,
        } as SniperOrderResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Sniper triggered - place the order
    logs.push(createLogEntry("SUCCESS", "Sniper triggered! Placing order..."));
    
    // Fetch market to get token IDs
    const market = await client.getMarketBySlug(marketSlug);
    if (!market) {
      logs.push(createLogEntry("ERROR", "Market not found"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Market not found",
          logs,
        } as SniperOrderResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract token IDs
    const tokenIds = client.extractTokenIds(market);
    logs.push(...client.getLogs());
    client.clearLogs();
    
    // Determine which token to buy based on side
    const outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
    let tokenId: string;
    
    if (side === "YES") {
      const yesIndex = outcomes.findIndex((o: string) => 
        o.toLowerCase() === "yes" || o.toLowerCase() === "up"
      );
      tokenId = yesIndex === 0 ? tokenIds.up : tokenIds.down;
    } else {
      const noIndex = outcomes.findIndex((o: string) => 
        o.toLowerCase() === "no" || o.toLowerCase() === "down"
      );
      tokenId = noIndex === 0 ? tokenIds.up : tokenIds.down;
    }
    
    // Place the order at current price (market order)
    const orderResult = await client.placeOrder({
      tokenId,
      price: currentPrice,
      size,
      side: "BUY",
    });
    
    logs.push(...client.getLogs());
    client.clearLogs();
    
    if (!orderResult.success) {
      logs.push(createLogEntry("ERROR", "Failed to place order", {
        error: orderResult.errorMsg,
      }));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: orderResult.errorMsg || "Failed to place order",
          logs,
        } as SniperOrderResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    logs.push(createLogEntry("SUCCESS", "Sniper order placed successfully", {
      orderId: orderResult.orderId,
      price: `${(currentPrice * 100).toFixed(1)}%`,
      size,
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderPlaced: true,
          orderId: orderResult.orderId,
          currentPrice,
          targetPrice,
          triggered: true,
        },
        logs,
      } as SniperOrderResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(createLogEntry("ERROR", `Unhandled error: ${errorMsg}`));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        logs,
      } as SniperOrderResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
