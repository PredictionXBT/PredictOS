/**
 * Types for the Sniper Order Edge Function
 */

import type { BotLogEntry } from "../_shared/polymarket/types.ts";

/**
 * Request body for the sniper-order endpoint
 */
export interface SniperOrderRequest {
  /** The specific token ID to buy (UP or DOWN token) */
  tokenId: string;
  /** Price to buy at as decimal (e.g., 0.35 for 35 cents) */
  price: number;
  /** Number of shares to buy (minimum 5) */
  shares: number;
  /** Always "BUY" for sniper strategy */
  side: "BUY";
}

/**
 * Response from the sniper-order endpoint
 */
export interface SniperOrderResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  logs: BotLogEntry[];
}
