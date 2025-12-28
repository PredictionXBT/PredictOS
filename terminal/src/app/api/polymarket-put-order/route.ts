import { NextRequest, NextResponse } from "next/server";

/**
 * Order parameters from mapper-agent
 */
interface MapperOrderParams {
  tokenId: string;
  price: number;
  size: number;
  tickSize: string;
  negRisk: boolean;
  conditionId: string;
  marketSlug: string;
}

/**
 * Request body for placing a Polymarket order
 * Supports two modes:
 * 1. Mapper mode (preferred): Pass orderParams from mapper-agent
 * 2. Legacy mode: Pass individual fields
 */
interface PolymarketPutOrderRequest {
  orderParams?: MapperOrderParams;
  // Legacy mode fields
  conditionId?: string;
  marketSlug?: string;
  side?: "YES" | "NO";
  budgetUsd?: number;
  price?: number;
}

/**
 * Server-side API route to proxy requests to the polymarket-put-order Edge Function.
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

    const body: PolymarketPutOrderRequest = await request.json();

    // Check if using mapper mode
    if (body.orderParams) {
      // Mapper mode - validate orderParams
      if (!body.orderParams.tokenId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required field: orderParams.tokenId",
          },
          { status: 400 }
        );
      }
    } else {
      // Legacy mode - validate required fields
      if (!body.conditionId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required field: conditionId or orderParams",
          },
          { status: 400 }
        );
      }

      if (!body.marketSlug) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required field: marketSlug",
          },
          { status: 400 }
        );
      }

      if (!body.side || (body.side !== "YES" && body.side !== "NO")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid field: side must be 'YES' or 'NO'",
          },
          { status: 400 }
        );
      }

      if (typeof body.budgetUsd !== "number" || body.budgetUsd < 1 || body.budgetUsd > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid field: budgetUsd must be between $1 and $100",
          },
          { status: 400 }
        );
      }
    }

    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_POLYMARKET_PUT_ORDER 
      || `${supabaseUrl}/functions/v1/polymarket-put-order`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body.orderParams ? { orderParams: body.orderParams } : {
        conditionId: body.conditionId,
        marketSlug: body.marketSlug,
        side: body.side,
        budgetUsd: body.budgetUsd,
        price: body.price,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in polymarket-put-order API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
