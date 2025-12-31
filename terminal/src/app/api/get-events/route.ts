import { NextRequest, NextResponse } from "next/server";
import type { GetEventsRequest, GetEventsResponse } from "@/types/agentic";

/**
 * Server-side API route to proxy requests to the get-events Edge Function.
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
        },
        { status: 500 }
      );
    }

    const body: GetEventsRequest = await request.json();

    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: url",
        },
        { status: 400 }
      );
    }

    // Determine data provider based on URL: Kalshi/Jupiter → dflow, Polymarket → dome
    // Jupiter prediction markets are based on Kalshi events
    const lowerUrl = body.url.toLowerCase();
    const isKalshiBased = lowerUrl.includes("kalshi") || lowerUrl.includes("jup.ag/prediction");
    const dataProvider = isKalshiBased ? "dflow" : "dome";

    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_GET_EVENTS 
      || `${supabaseUrl}/functions/v1/get-events`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        url: body.url,
        dataProvider,
      }),
    });

    const data: GetEventsResponse = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in get-events API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

