/**
 * Type definitions for polymarket-position-tracker edge function
 */

import type { SupportedAsset, BotLogEntry, MarketPosition, TokenIds } from "../_shared/polymarket/types.ts";

/**
 * Request body for the position tracker
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
 * Response from the position tracker
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

