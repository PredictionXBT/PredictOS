import { NextRequest, NextResponse } from "next/server";
import type { SniperOrderRequest, SniperOrderResponse } from "@/types/betting-bot";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call the Supabase Edge Function with retry logic for cold starts
 */
async function callEdgeFunction(
  url: string,
  headers: Record<string, string>,
  body: object,
  attempt: number = 1
): Promise<{ response: Response; isRetry: boolean }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type");
  const isJsonResponse = contentType && contentType.includes("application/json");

  if (!isJsonResponse && attempt < MAX_RETRIES) {
    console.log(`Edge function returned non-JSON (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
    await delay(RETRY_DELAY_MS);
    return callEdgeFunction(url, headers, body, attempt + 1);
  }

  return { response, isRetry: attempt > 1 };
}

/**
 * Server-side API route to place single orders for dump sniper
 * Proxies to Supabase Edge Function for secure key handling
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing Supabase credentials",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: "Server configuration error: Missing Supabase credentials",
          }],
        } as SniperOrderResponse,
        { status: 500 }
      );
    }

    // Parse request body
    let body: SniperOrderRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: "Invalid JSON in request body",
          }],
        } as SniperOrderResponse,
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.tokenId || typeof body.tokenId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: tokenId",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: "Missing or invalid required field: tokenId",
          }],
        } as SniperOrderResponse,
        { status: 400 }
      );
    }

    if (typeof body.price !== "number" || body.price <= 0 || body.price >= 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid price: must be between 0 and 1 (exclusive)",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Invalid price: ${body.price}`,
          }],
        } as SniperOrderResponse,
        { status: 400 }
      );
    }

    if (typeof body.shares !== "number" || body.shares <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid shares: must be a positive number",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Invalid shares: ${body.shares}`,
          }],
        } as SniperOrderResponse,
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function for sniper orders
    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_SNIPER_ORDER
      || `${supabaseUrl}/functions/v1/polymarket-sniper-order`;

    const { response, isRetry } = await callEdgeFunction(
      edgeFunctionUrl,
      {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      {
        tokenId: body.tokenId,
        price: body.price,
        shares: body.shares,
        side: "BUY",
      }
    );

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from edge function:", text.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: `Edge function error (${response.status}): Server returned non-JSON response after ${MAX_RETRIES} attempts.`,
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Edge function returned status ${response.status} with non-JSON response`,
          }],
        } as SniperOrderResponse,
        { status: 502 }
      );
    }

    const data: SniperOrderResponse = await response.json();

    // Add retry note if applicable
    if (isRetry && data.logs) {
      data.logs.unshift({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: "Request succeeded after retry (cold start recovery)",
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in sniper-order API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        logs: [{
          timestamp: new Date().toISOString(),
          level: "ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        }],
      } as SniperOrderResponse,
      { status: 500 }
    );
  }
}
