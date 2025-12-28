/**
 * Type definitions for polymarket-put-order edge function
 */

/**
 * Order parameters from mapper-agent (preferred method)
 */
export interface MapperOrderParams {
  /** Token ID for the outcome to buy */
  tokenId: string;
  /** Order price (0-1 decimal) */
  price: number;
  /** Number of shares to buy */
  size: number;
  /** Tick size for the market */
  tickSize: string;
  /** Whether this is a negative risk market */
  negRisk: boolean;
  /** Market condition ID */
  conditionId: string;
  /** Market slug for reference */
  marketSlug: string;
}

/**
 * Request body for placing a Polymarket order
 * Supports two modes:
 * 1. Mapper mode (preferred): Pass orderParams from mapper-agent
 * 2. Legacy mode: Pass individual fields and let the endpoint figure out order params
 */
export interface PolymarketPutOrderRequest {
  /** Order parameters from mapper-agent (preferred) */
  orderParams?: MapperOrderParams;
  
  // Legacy mode fields (used if orderParams not provided)
  /** Market condition ID from Polymarket */
  conditionId?: string;
  /** Market slug for fetching market data */
  marketSlug?: string;
  /** Which side to buy: "YES" or "NO" */
  side?: "YES" | "NO";
  /** Budget in USD (between 1 and 100) */
  budgetUsd?: number;
  /** Optional: specific price to buy at (0-1). If not provided, uses current market price */
  price?: number;
}

/**
 * Order result details
 */
export interface OrderResult {
  success: boolean;
  orderId?: string;
  status?: string;
  errorMsg?: string;
  tokenId: string;
  side: "YES" | "NO";
  price: number;
  size: number;
  costUsd: number;
}

/**
 * Response from polymarket-put-order endpoint
 */
export interface PolymarketPutOrderResponse {
  success: boolean;
  data?: {
    order: OrderResult;
    market: {
      slug: string;
      title: string;
      conditionId: string;
    };
  };
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

