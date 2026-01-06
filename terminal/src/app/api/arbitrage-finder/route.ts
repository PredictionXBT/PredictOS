import { NextRequest, NextResponse } from "next/server";
import type { ArbitrageRequest, ArbitrageResponse } from "@/types/arbitrage";

/**
 * Server-side API route to proxy requests to the arbitrage-finder Edge Function.
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

    const body: ArbitrageRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: url",
        },
        { status: 400 }
      );
    }

    if (!body.model) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: model",
        },
        { status: 400 }
      );
    }

    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_ARBITRAGE_FINDER 
      || `${supabaseUrl}/functions/v1/arbitrage-finder`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        url: body.url,
        model: body.model,
      }),
    });

    const data: ArbitrageResponse = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in arbitrage-finder API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

