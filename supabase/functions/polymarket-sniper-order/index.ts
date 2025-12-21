/**
 * Supabase Edge Function: polymarket-sniper-order
 *
 * Places single limit orders by token ID for the dump sniper strategy.
 * Accepts tokenId, price, and shares directly.
 */

import { createClientFromEnv } from "../_shared/polymarket/client.ts";
import { createLogEntry } from "../_shared/polymarket/utils.ts";
import type { BotLogEntry } from "../_shared/polymarket/types.ts";
import type { SniperOrderRequest, SniperOrderResponse } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const { tokenId, price, shares, side } = requestBody;

    // Validate tokenId
    if (!tokenId || typeof tokenId !== "string") {
      logs.push(createLogEntry("ERROR", "Missing or invalid tokenId"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing or invalid tokenId",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate price
    if (typeof price !== "number" || price <= 0 || price >= 1) {
      logs.push(createLogEntry("ERROR", "Invalid price - must be between 0 and 1", { price }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid price - must be between 0 and 1 (exclusive)",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate shares
    if (typeof shares !== "number" || shares < 5) {
      logs.push(createLogEntry("ERROR", "Invalid shares - minimum 5 required", { shares }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid shares - minimum 5 shares required",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate side (should always be BUY for sniper)
    if (side !== "BUY") {
      logs.push(createLogEntry("ERROR", "Invalid side - must be BUY", { side }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid side - sniper only supports BUY orders",
          logs,
        } as SniperOrderResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logs.push(createLogEntry("INFO", "Sniper order request received", {
      tokenId: `${tokenId.slice(0, 16)}...`,
      price: `${(price * 100).toFixed(1)}%`,
      shares,
    }));

    // Initialize the Polymarket client
    let client;
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

    // Place the order using FOK (Fill-Or-Kill) for immediate execution confirmation
    const orderResult = await client.placeOrder({
      tokenId,
      price,
      size: shares,
      side: "BUY",
    }, true); // useFOK = true

    logs.push(...client.getLogs());

    if (orderResult.success) {
      logs.push(createLogEntry("SUCCESS", "Order placed successfully", {
        orderId: orderResult.orderId,
        status: orderResult.status,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          orderId: orderResult.orderId,
          logs,
        } as SniperOrderResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      logs.push(createLogEntry("ERROR", `Order failed: ${orderResult.errorMsg}`));

      return new Response(
        JSON.stringify({
          success: false,
          error: orderResult.errorMsg || "Order placement failed",
          logs,
        } as SniperOrderResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
