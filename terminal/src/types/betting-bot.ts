/**
 * Types for the Limit Order Bot API
 */

/**
 * Supported assets for 15-minute up/down markets
 */
export type SupportedAsset = "BTC" | "SOL" | "ETH" | "XRP";

/**
 * Log entry from the bot
 */
export interface BotLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Order response from Polymarket
 */
export interface OrderResponse {
  success: boolean;
  orderId?: string;
  errorMsg?: string;
  transactionHash?: string;
  status?: string;
}

/**
 * Ladder betting configuration
 */
export interface LadderConfig {
  /** Enable ladder betting mode */
  enabled: boolean;
  /** Highest probability level (e.g., 49 for 49%). Default: 49 */
  maxPrice?: number;
  /** Lowest probability level (e.g., 35 for 35%). Default: 35 */
  minPrice?: number;
  /** Taper factor - higher = more aggressive taper (1.0-3.0). Default: 1.5 */
  taperFactor?: number;
}

/**
 * Result for a single ladder rung order placement
 */
export interface LadderRungResult {
  /** Price level as percentage */
  pricePercent: number;
  /** USD allocated to this rung */
  sizeUsd: number;
  /** Up order result */
  up?: OrderResponse;
  /** Down order result */
  down?: OrderResponse;
}

/**
 * Market order result from the limit order bot
 */
export interface MarketOrderResult {
  marketSlug: string;
  marketTitle?: string;
  marketStartTime: string;
  targetTimestamp: number;
  /** Orders placed for Up and Down sides (simple mode) */
  ordersPlaced?: {
    up?: OrderResponse;
    down?: OrderResponse;
  };
  /** Ladder orders placed (ladder mode) */
  ladderOrdersPlaced?: LadderRungResult[];
  /** Total orders attempted in ladder mode */
  ladderTotalOrders?: number;
  /** Successful orders in ladder mode */
  ladderSuccessfulOrders?: number;
  error?: string;
}

/**
 * Request body for the limit-order-bot endpoint
 */
export interface LimitOrderBotRequest {
  asset: SupportedAsset;
  /** Order price as a percentage (e.g., 48 for 48%). Optional, defaults to 48% - ignored if ladder.enabled */
  price?: number;
  /** Total bankroll in USD. For ladder mode, this is distributed across rungs. Defaults to $25 */
  sizeUsd?: number;
  /** Ladder betting configuration */
  ladder?: LadderConfig;
}

/**
 * Response from the limit-order-bot endpoint
 */
export interface LimitOrderBotResponse {
  success: boolean;
  data?: {
    asset: SupportedAsset;
    pricePercent: number;
    sizeUsd: number;
    /** Whether ladder mode was used */
    ladderMode?: boolean;
    market: MarketOrderResult;
  };
  logs: BotLogEntry[];
  error?: string;
}
