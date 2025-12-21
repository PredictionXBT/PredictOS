import { NextRequest, NextResponse } from "next/server";
import type { PolyfactualResearchRequest, PolyfactualResearchResponse } from "@/types/polyfactual";

/**
 * Server-side API route to proxy requests to the Polyfactual Supabase Edge Function.
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
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: PolyfactualResearchRequest = await request.json();

    // Validate required fields
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: query",
        },
        { status: 400 }
      );
    }

    const trimmedQuery = body.query.trim();
    if (!trimmedQuery) {
      return NextResponse.json(
        {
          success: false,
          error: "Query cannot be empty",
        },
        { status: 400 }
      );
    }

    // Validate query length (Polyfactual limit is 1000 characters)
    if (trimmedQuery.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Query exceeds maximum length of 1000 characters",
        },
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function
    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_POLYFACTUAL_RESEARCH 
      || `${supabaseUrl}/functions/v1/polyfactual-research`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        query: trimmedQuery,
      }),
    });

    const data: PolyfactualResearchResponse = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in polyfactual-research API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

