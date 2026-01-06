/**
 * Types for arbitrage-finder edge function
 */

/** Source market platform */
export type ArbitrageMarketSource = 'polymarket' | 'kalshi';

/** Individual market data for arbitrage comparison */
export interface ArbitrageMarketData {
  /** Source platform */
  source: ArbitrageMarketSource;
  /** Market/event name or title */
  name: string;
  /** Unique identifier (slug for Polymarket, ticker for Kalshi) */
  identifier: string;
  /** Yes price (normalized to 0-100) */
  yesPrice: number;
  /** No price (normalized to 0-100) */
  noPrice: number;
  /** Volume (if available) */
  volume?: number;
  /** Liquidity (if available) */
  liquidity?: number;
  /** Market URL */
  url: string;
  /** OkBet URL for this market */
  okbetUrl?: string;
  /** Raw market data from API */
  rawData?: unknown;
}

/** Arbitrage opportunity details */
export interface ArbitrageOpportunity {
  /** Whether an arb opportunity exists */
  hasArbitrage: boolean;
  /** Profit percentage if arb exists */
  profitPercent?: number;
  /** Recommended strategy */
  strategy?: {
    /** Which market to buy YES on */
    buyYesOn: ArbitrageMarketSource;
    /** Price to buy YES */
    buyYesPrice: number;
    /** Which market to buy NO on */
    buyNoOn: ArbitrageMarketSource;
    /** Price to buy NO */
    buyNoPrice: number;
    /** Total cost for $100 bet on each side */
    totalCost: number;
    /** Guaranteed payout ($100) */
    guaranteedPayout: number;
    /** Net profit */
    netProfit: number;
  };
}

/** AI analysis result for arbitrage */
export interface ArbitrageAnalysis {
  /** Whether the markets represent the same underlying event */
  isSameMarket: boolean;
  /** Confidence that markets are the same (0-100) */
  sameMarketConfidence: number;
  /** Explanation of why markets are/aren't the same */
  marketComparisonReasoning: string;
  /** Polymarket data (if found) */
  polymarketData?: ArbitrageMarketData;
  /** Kalshi data (if found) */
  kalshiData?: ArbitrageMarketData;
  /** Arbitrage opportunity analysis */
  arbitrage: ArbitrageOpportunity;
  /** Overall summary of findings */
  summary: string;
  /** Key risks or caveats */
  risks: string[];
  /** Recommended action */
  recommendation: string;
}

/** Request to arbitrage detection edge function */
export interface ArbitrageRequest {
  /** URL pasted by user (Polymarket or Kalshi) */
  url: string;
  /** AI model to use */
  model: string;
}

/** Response from arbitrage detection edge function */
export interface ArbitrageResponse {
  success: boolean;
  data?: ArbitrageAnalysis;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    model: string;
    tokensUsed?: number;
    sourceMarket: ArbitrageMarketSource;
    searchedMarket: ArbitrageMarketSource;
  };
}

/** Polymarket search result from Gamma API */
export interface PolymarketSearchResult {
  id: string;
  slug: string;
  title: string;
  question?: string;
  description?: string;
  outcomePrices?: string;
  outcomes?: string;
  volume?: number;
  liquidity?: number;
  active?: boolean;
  closed?: boolean;
  events?: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

/** Kalshi search result from DFlow API */
export interface KalshiSearchResult {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume?: number;
  liquidity?: number;
}

/** DFlow search response */
export interface DFlowSearchResponse {
  results: Array<{
    event_ticker: string;
    title: string;
    markets?: KalshiSearchResult[];
  }>;
}

