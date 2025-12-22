/**
 * Type definitions for polymarket-up-down-15-markets-limit-order-bot edge function
 */

import type { SupportedAsset, BotLogEntry } from "../_shared/polymarket/types.ts";

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
 * Request body for the limit order bot
 */
export interface LimitOrderBotRequest {
  /** Asset to trade (BTC, SOL, ETH, XRP) */
  asset: SupportedAsset;
  /** Order price as percentage (e.g., 48 for 48%). Defaults to 48% - ignored if ladder.enabled */
  price?: number;
  /** Total bankroll in USD. For ladder mode, this is distributed across rungs. Defaults to $25 */
  sizeUsd?: number;
  /** Ladder betting configuration */
  ladder?: LadderConfig;
}

/**
 * Order placement result for a single side
 */
export interface OrderPlacementResult {
  success: boolean;
  orderId?: string;
  errorMsg?: string;
  status?: string;
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
  up?: OrderPlacementResult;
  /** Down order result */
  down?: OrderPlacementResult;
}

/**
 * Result for a single market's order placement
 */
export interface MarketOrderResult {
  /** Market slug identifier */
  marketSlug: string;
  /** Market title/question */
  marketTitle?: string;
  /** Market start time (formatted) */
  marketStartTime: string;
  /** Unix timestamp of market start */
  targetTimestamp: number;
  /** Orders placed for Up and Down sides (simple mode) */
  ordersPlaced?: {
    up?: OrderPlacementResult;
    down?: OrderPlacementResult;
  };
  /** Ladder orders placed (ladder mode) */
  ladderOrdersPlaced?: LadderRungResult[];
  /** Total orders attempted in ladder mode */
  ladderTotalOrders?: number;
  /** Successful orders in ladder mode */
  ladderSuccessfulOrders?: number;
  /** Error message if market processing failed */
  error?: string;
}

/**
 * Response from the limit order bot
 */
export interface LimitOrderBotResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (only present on success) */
  data?: {
    /** Asset traded */
    asset: SupportedAsset;
    /** Order price as percentage (simple mode) */
    pricePercent: number;
    /** Total bankroll in USD */
    sizeUsd: number;
    /** Whether ladder mode was used */
    ladderMode: boolean;
    /** Result for the market */
    market: MarketOrderResult;
  };
  /** Log entries from the bot execution */
  logs: BotLogEntry[];
  /** Error message (only present on failure) */
  error?: string;
}
