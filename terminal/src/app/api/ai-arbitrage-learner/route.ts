import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side API route to proxy requests to the ai-arbitrage-learner Edge Function.
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

    const body = await request.json();

    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: action",
        },
        { status: 400 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-arbitrage-learner`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in ai-arbitrage-learner API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
