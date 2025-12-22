/**
 * Types for the Position Tracker API
 */

import type { SupportedAsset, BotLogEntry } from "./betting-bot";

/**
 * Token IDs for Up and Down outcomes
 */
export interface TokenIds {
  up: string;
  down: string;
}

/**
 * Position for a single side (YES or NO)
 */
export interface SidePosition {
  /** Total shares filled */
  shares: number;
  /** Total cost in USD */
  costUsd: number;
  /** Average price per share */
  avgPrice: number;
  /** Number of orders placed */
  ordersPlaced: number;
  /** Number of orders filled (partially or fully) */
  ordersFilled: number;
  /** Pending shares (orders placed but not filled) */
  pendingShares: number;
}

/**
 * Pair position status
 */
export type PairStatus =
  | "PROFIT_LOCKED"     // Both sides filled, avg_YES + avg_NO < 1.00
  | "BREAK_EVEN"        // Both sides filled, avg_YES + avg_NO = 1.00
  | "LOSS_RISK"         // Both sides filled, avg_YES + avg_NO > 1.00
  | "DIRECTIONAL_YES"   // Only YES filled - directional risk
  | "DIRECTIONAL_NO"    // Only NO filled - directional risk
  | "PENDING"           // Orders placed but neither side filled yet
  | "NO_POSITION";      // No orders placed

/**
 * Combined position for a market
 */
export interface MarketPosition {
  /** Market slug identifier */
  marketSlug: string;
  /** Market title */
  marketTitle?: string;
  /** Token IDs */
  tokenIds: TokenIds;
  /** YES side position */
  yes: SidePosition;
  /** NO side position */
  no: SidePosition;
  /** Combined pair cost (avgYes + avgNo) - only valid when both sides have shares */
  pairCost: number | null;
  /** Position status */
  status: PairStatus;
  /** Minimum shares between YES and NO (determines guaranteed payout) */
  minShares: number;
  /** Guaranteed payout (minShares * $1.00) */
  guaranteedPayout: number;
  /** Total cost for matched pairs */
  totalCost: number;
  /** Guaranteed profit for matched pairs */
  guaranteedProfit: number;
  /** Return percentage for matched pairs */
  returnPercent: number;
  /** Timestamp of last update */
  lastUpdated: string;
}

/**
 * Request body for the position tracker endpoint
 */
export interface PositionTrackerRequest {
  /** Asset to check positions for (BTC, SOL, ETH, XRP) */
  asset: SupportedAsset;
  /** Market slug to check (optional - if not provided, checks latest 15-min market) */
  marketSlug?: string;
  /** Token IDs for the market (optional - required if marketSlug is custom) */
  tokenIds?: TokenIds;
}

/**
 * Response from the position tracker endpoint
 */
export interface PositionTrackerResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Position data (only present on success) */
  data?: {
    /** Asset checked */
    asset: SupportedAsset;
    /** Position for the market */
    position: MarketPosition;
  };
  /** Log entries from the execution */
  logs: BotLogEntry[];
  /** Error message (only present on failure) */
  error?: string;
}

