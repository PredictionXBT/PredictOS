/**
 * Supabase Edge Function: x402-seller
 * 
 * Provides two actions:
 * 1. list - List available PayAI sellers from the bazaar
 * 2. call - Call an PayAI seller with a query (requires payment)
 * 
 * Supports both Solana and EVM (Base) networks.
 */

import {
  listBazaarSellers,
  callX402Seller,
  checkX402Health,
  NETWORKS,
} from "../_shared/x402/client.ts";
import type {
  ListSellersRequest,
  ListSellersResponse,
  X402CallSellerRequest,
  X402CallSellerResponse,
} from "../_shared/x402/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[x402-seller] Received request:", req.method, req.url);

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: { action: string } & (ListSellersRequest | X402CallSellerRequest);
    try {
      requestBody = await req.json();
      console.log("[x402-seller] Action:", requestBody.action);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = requestBody;

    // Route to appropriate handler
    switch (action) {
      case "health": {
        const isHealthy = await checkX402Health();
        
        // Include config debug info
        const discoveryUrl = Deno.env.get("X402_DISCOVERY_URL");
        const preferredNetwork = Deno.env.get("X402_PREFERRED_NETWORK");
        
        return new Response(
          JSON.stringify({
            success: true,
            healthy: isHealthy,
            config: {
              discoveryUrl,
              preferredNetwork,
            },
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const listRequest = requestBody as ListSellersRequest & { action: string };
        
        try {
          const sellers = await listBazaarSellers({
            network: listRequest.network,
            type: listRequest.type || "http",
            limit: listRequest.limit,
            offset: listRequest.offset,
          });

          const response: ListSellersResponse = {
            success: true,
            sellers,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              total: sellers.length,
            },
          };

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[x402-seller] Error listing sellers:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "Failed to list sellers",
              metadata: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime,
                total: 0,
              },
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "call": {
        const callRequest = requestBody as X402CallSellerRequest & { action: string };

        // Validate required parameters
        if (!callRequest.resourceUrl) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required parameter: 'resourceUrl'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!callRequest.query) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required parameter: 'query'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Default to Solana mainnet if not specified
        const network = callRequest.network || NETWORKS.SOLANA_MAINNET;

        // TEMP: Hardcoded seller URL for testing -- for testing purposes only
        // since a lot of the sellers don't follow the x402 protocol, but biznews does
        // const testSellerUrl = "https://biznews.x402.bot/news";
        // console.log(`[x402-seller] Using hardcoded test seller: ${testSellerUrl} (original: ${callRequest.resourceUrl})`);

        try {
          const result = await callX402Seller(
            callRequest.resourceUrl,
            callRequest.query,
            network
          );

          const response: X402CallSellerResponse = {
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              paymentTxId: result.paymentInfo?.txId,
              costUsdc: result.paymentInfo?.cost,
              network,
            },
          };

          return new Response(JSON.stringify(response), {
            status: result.success ? 200 : 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[x402-seller] Error calling seller:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "Failed to call seller",
              metadata: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime,
                network,
              },
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "networks": {
        // Return available networks
        return new Response(
          JSON.stringify({
            success: true,
            networks: [
              { id: NETWORKS.SOLANA_MAINNET, name: "Solana Mainnet", type: "solana" },
              { id: NETWORKS.SOLANA_DEVNET, name: "Solana Devnet", type: "solana" },
              { id: NETWORKS.BASE_MAINNET, name: "Base Mainnet", type: "evm" },
              { id: NETWORKS.BASE_SEPOLIA, name: "Base Sepolia", type: "evm" },
            ],
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: '${action}'. Valid actions: 'list', 'call', 'health', 'networks'`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[x402-seller] Unhandled error:", error);
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

