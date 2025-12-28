import { NextRequest, NextResponse } from "next/server";

/**
 * Analysis result from bookmaker/analysis agent
 */
interface AnalysisResult {
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  predictedWinner: "YES" | "NO";
  winnerConfidence: number;
  marketProbability: number;
  estimatedActualProbability: number;
  ticker: string;
  title: string;
}

/**
 * Raw market data from data providers
 */
interface MarketData {
  conditionId?: string;
  slug?: string;
  clobTokenIds?: string;
  outcomes?: string;
  outcomePrices?: string;
  acceptingOrders?: boolean;
  active?: boolean;
  closed?: boolean;
  minimumTickSize?: string;
  negRisk?: boolean;
  title?: string;
  question?: string;
}

/**
 * Request body for the mapper-agent endpoint
 */
interface MapperAgentRequest {
  platform: "Polymarket" | "Kalshi";
  analysisResult: AnalysisResult;
  marketData: MarketData;
  budgetUsd: number;
}

/**
 * Server-side API route to proxy requests to the mapper-agent Edge Function.
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

    const body: MapperAgentRequest = await request.json();

    // Validate required fields
    if (!body.platform || (body.platform !== "Polymarket" && body.platform !== "Kalshi")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid platform. Must be 'Polymarket' or 'Kalshi'",
        },
        { status: 400 }
      );
    }

    if (!body.analysisResult || !body.analysisResult.recommendedAction) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing analysisResult or recommendedAction",
        },
        { status: 400 }
      );
    }

    if (!body.marketData) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing marketData",
        },
        { status: 400 }
      );
    }

    if (typeof body.budgetUsd !== "number" || body.budgetUsd < 1 || body.budgetUsd > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid budgetUsd. Must be between $1 and $100",
        },
        { status: 400 }
      );
    }

    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_MAPPER_AGENT 
      || `${supabaseUrl}/functions/v1/mapper-agent`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        platform: body.platform,
        analysisResult: body.analysisResult,
        marketData: body.marketData,
        budgetUsd: body.budgetUsd,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in mapper-agent API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

