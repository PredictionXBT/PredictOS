import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callEdgeFunction(
  url: string,
  headers: Record<string, string>,
  attempt: number = 1
): Promise<{ response: Response; isRetry: boolean }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  });

  const contentType = response.headers.get("content-type");
  const isJsonResponse = contentType && contentType.includes("application/json");

  if (!isJsonResponse && attempt < MAX_RETRIES) {
    console.log(`Auto-claim edge function returned non-JSON (attempt ${attempt}/${MAX_RETRIES}), retrying...`);
    await delay(RETRY_DELAY_MS);
    return callEdgeFunction(url, headers, attempt + 1);
  }

  return { response, isRetry: attempt > 1 };
}

/**
 * POST /api/auto-claim
 * Check for redeemable positions and claim them
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
          claims: [],
          logs: [{
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: "Missing Supabase credentials",
          }],
        },
        { status: 500 }
      );
    }

    // Build Edge Function URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auto-claim`;

    const { response, isRetry } = await callEdgeFunction(
      edgeFunctionUrl,
      {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      }
    );

    if (isRetry) {
      console.log("Auto-claim request succeeded after retry (cold start handled)");
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("Auto-claim error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        claims: [],
        logs: [{
          timestamp: new Date().toISOString(),
          level: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        }],
      },
      { status: 500 }
    );
  }
}
