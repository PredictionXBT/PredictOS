/**
 * Polymarket Types for Trading Bot
 */

/**
 * Supported assets for 15-minute up/down markets
 */
export type SupportedAsset = "BTC" | "SOL" | "ETH" | "XRP";

/**
 * Market data from Gamma API
 */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  title: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: number;
  clobTokenIds: string;
  acceptingOrders: boolean;
  active: boolean;
  closed: boolean;
  endDate: string;
  startDate: string;
}

/**
 * Parsed token IDs for Up and Down outcomes
 */
export interface TokenIds {
  up: string;
  down: string;
}

/**
 * Order side type
 */
export type OrderSideType = "BUY" | "SELL";

/**
 * Order arguments for creating a new order
 */
export interface OrderArgs {
  tokenId: string;
  price: number;
  size: number;
  side: OrderSideType;
}

/**
 * Order response from the CLOB API
 */
export interface OrderResponse {
  success: boolean;
  orderId?: string;
  errorMsg?: string;
  transactionHash?: string;
  status?: string;
}

/**
 * Log entry for bot execution
 */
export interface BotLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Polymarket client configuration
 */
export interface PolymarketClientConfig {
  /** Private key for signing orders */
  privateKey: string;
  /** Proxy/funder address (shown under profile pic on Polymarket) */
  proxyAddress: string;
  /** Signature type: 0 = EOA, 1 = Magic/Email, 2 = Browser Wallet */
  signatureType?: number;
}

/**
 * Order status from CLOB API
 */
export type OrderStatus = "LIVE" | "MATCHED" | "CANCELLED" | "EXPIRED" | "FILLED" | "PARTIALLY_FILLED";

/**
 * Open order from CLOB API
 */
export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  side: OrderSideType;
  price: string;
  size_matched: string;
  original_size: string;
  status: OrderStatus;
  created_at: number;
  expiration: number;
}

/**
 * Trade/fill from CLOB API
 */
export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: OrderSideType;
  price: string;
  size: string;
  fee_rate_bps: string;
  status: string;
  match_time: number;
  owner: string;
  transaction_hash?: string;
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
