/**
 * Type definitions for mapper-agent edge function
 * 
 * The Mapper Agent translates analysis output into platform-specific order parameters.
 * Currently supports Polymarket. Kalshi support coming soon.
 */

/** Supported prediction market platforms */
export type PlatformType = 'Polymarket' | 'Kalshi';

/**
 * Analysis result from the bookmaker or analysis agent
 */
export interface AnalysisResult {
  /** Recommended trading action */
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  /** Which side is predicted to win */
  predictedWinner: "YES" | "NO";
  /** Confidence in the prediction (0-100) */
  winnerConfidence: number;
  /** Current market probability (0-100) */
  marketProbability: number;
  /** Estimated actual probability (0-100) */
  estimatedActualProbability: number;
  /** Market ticker */
  ticker: string;
  /** Market title */
  title: string;
}

/**
 * Raw market data from data providers (Dome for Polymarket)
 */
export interface MarketData {
  /** Market condition ID */
  conditionId?: string;
  /** Market slug/identifier */
  slug?: string;
  /** CLOB token IDs (JSON string array) */
  clobTokenIds?: string;
  /** Outcomes (JSON string array like '["Yes", "No"]') */
  outcomes?: string;
  /** Outcome prices (JSON string array like '["0.65", "0.35"]') */
  outcomePrices?: string;
  /** Whether market is accepting orders */
  acceptingOrders?: boolean;
  /** Whether market is active */
  active?: boolean;
  /** Whether market is closed */
  closed?: boolean;
  /** Minimum tick size for orders */
  minimumTickSize?: string;
  /** Whether this is a negative risk market */
  negRisk?: boolean;
  /** Market title */
  title?: string;
  /** Market question */
  question?: string;
}

/**
 * Request body for the mapper-agent endpoint
 */
export interface MapperAgentRequest {
  /** Platform type (Polymarket or Kalshi) */
  platform: PlatformType;
  /** Analysis result from bookmaker/analysis agent */
  analysisResult: AnalysisResult;
  /** Raw market data from data provider */
  marketData: MarketData;
  /** Budget in USD for the order */
  budgetUsd: number;
}

/**
 * Polymarket-specific order parameters
 */
export interface PolymarketOrderParams {
  /** Token ID for the outcome to buy */
  tokenId: string;
  /** Order price (0-1 decimal) */
  price: number;
  /** Order side (BUY or SELL) */
  side: "BUY" | "SELL";
  /** Number of shares to buy */
  size: number;
  /** Fee rate in basis points */
  feeRateBps: number;
  /** Tick size for the market */
  tickSize: string;
  /** Whether this is a negative risk market */
  negRisk: boolean;
  /** Market condition ID */
  conditionId: string;
  /** Market slug for reference */
  marketSlug: string;
  /** Human-readable description of the order */
  orderDescription: string;
}

/**
 * Kalshi-specific order parameters (TODO: Coming soon)
 */
export interface KalshiOrderParams {
  // TODO: Implement Kalshi order parameters
  ticker: string;
  side: "yes" | "no";
  count: number;
  limitPrice: number;
}

/**
 * Response from the mapper-agent endpoint
 */
export interface MapperAgentResponse {
  success: boolean;
  data?: {
    platform: PlatformType;
    orderParams: PolymarketOrderParams | KalshiOrderParams;
    analysis: {
      recommendedAction: string;
      side: "YES" | "NO";
      confidence: number;
    };
  };
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

