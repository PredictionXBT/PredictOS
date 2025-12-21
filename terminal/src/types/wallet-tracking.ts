/**
 * Types for the Wallet Tracking feature using Dome API
 */

/**
 * Log entry for wallet tracking events
 */
export interface WalletTrackingLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "ORDER";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Order event from Dome WebSocket
 */
export interface OrderEvent {
  token_id: string;
  side: "BUY" | "SELL";
  market_slug: string;
  condition_id: string;
  shares: string;
  shares_normalized: number;
  price: number;
  tx_hash: string;
  title: string;
  timestamp: number;
  order_hash: string;
  user: string;
}

/**
 * SSE event types
 */
export type SSEEventType = 
  | "connected"
  | "subscribed"
  | "order"
  | "error"
  | "heartbeat"
  | "disconnected";

/**
 * SSE message payload
 */
export interface SSEMessage {
  type: SSEEventType;
  data?: OrderEvent | { subscription_id?: string; message?: string; error?: string };
  timestamp: string;
}

