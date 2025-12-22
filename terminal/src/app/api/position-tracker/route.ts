import { NextRequest, NextResponse } from "next/server";
import type { PositionTrackerRequest, PositionTrackerResponse } from "@/types/position-tracker";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

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

  // Check if we got a non-JSON response (likely a timeout/error page)
  const contentType = response.headers.get("content-type");
  const isJsonResponse = contentType && contentType.includes("application/json");

  // If non-JSON response and we have retries left, retry (handles cold start timeouts)
  if (!isJsonResponse && attempt < MAX_RETRIES) {
    console.log(`Edge function returned non-JSON (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
    await delay(RETRY_DELAY_MS);
    return callEdgeFunction(url, headers, body, attempt + 1);
  }

  return { response, isRetry: attempt > 1 };
}

/**
 * Server-side API route to proxy requests to the Supabase Edge Function (polymarket-position-tracker).
 * This keeps the Supabase URL and keys secure on the server.
 */
export async function POST(request: NextRequest) {
  try {
    // Read environment variables server-side
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
        } as PositionTrackerResponse,
        { status: 500 }
      );
    }

    // Parse request body
    let body: PositionTrackerRequest;
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
        } as PositionTrackerResponse,
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.asset) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: asset",
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: "Missing required field: asset",
          }],
        } as PositionTrackerResponse,
        { status: 400 }
      );
    }

    // Validate asset value
    const validAssets = ["BTC", "SOL", "ETH", "XRP"];
    if (!validAssets.includes(body.asset.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid asset. Must be one of: ${validAssets.join(", ")}`,
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Invalid asset: ${body.asset}`,
          }],
        } as PositionTrackerResponse,
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function with retry logic
    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_POSITION_TRACKER
      || `${supabaseUrl}/functions/v1/polymarket-position-tracker`;

    const { response, isRetry } = await callEdgeFunction(
      edgeFunctionUrl,
      {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      {
        asset: body.asset.toUpperCase(),
        marketSlug: body.marketSlug,
        tokenIds: body.tokenIds,
      }
    );

    // Check if response is JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from edge function after retries:", text.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: `Edge function error (${response.status}): Server returned non-JSON response after ${MAX_RETRIES} attempts.`,
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Edge function returned status ${response.status} with non-JSON response`,
          }],
        } as PositionTrackerResponse,
        { status: 502 }
      );
    }

    const data: PositionTrackerResponse = await response.json();

    // Add a note if we had to retry
    if (isRetry && data.logs) {
      data.logs.unshift({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: "Request succeeded after retry (cold start recovery)",
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in position-tracker API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        logs: [{
          timestamp: new Date().toISOString(),
          level: "ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        }],
      } as PositionTrackerResponse,
      { status: 500 }
    );
  }
}

