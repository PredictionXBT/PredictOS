/**
 * x402 Types for PredictOS Terminal
 * 
 * Frontend types for x402 bazaar integration.
 */

/** Simplified seller info for display */
export interface X402SellerInfo {
  /** Unique identifier (resource URL) */
  id: string;
  /** Display name */
  name: string;
  /** Description of the service */
  description?: string;
  /** Resource URL */
  resourceUrl: string;
  /** Price per call in USDC */
  priceUsdc: string;
  /** Supported networks */
  networks: string[];
  /** Last updated */
  lastUpdated: string;
  /** Input description */
  inputDescription?: string;
}

/** Response from listing sellers */
export interface ListSellersResponse {
  success: boolean;
  sellers?: X402SellerInfo[];
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    total: number;
  };
}

/** Response from calling a seller */
export interface CallSellerResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    paymentTxId?: string;
    costUsdc?: string;
    network: string;
  };
}

/** x402 network info */
export interface X402Network {
  id: string;
  name: string;
  type: "solana" | "evm";
}

/** Available x402 networks (mainnet only) */
export const X402_NETWORKS: X402Network[] = [
  { id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", name: "Solana", type: "solana" },
  { id: "solana", name: "Solana", type: "solana" }, // Legacy format used by some sellers
  { id: "eip155:8453", name: "Base", type: "evm" },
  { id: "base", name: "Base", type: "evm" }, // Legacy format used by some sellers
];

/** Default network for x402 - the client auto-detects based on seller */
export const DEFAULT_X402_NETWORK = "base";

/** x402 agent result type */
export interface X402AgentResult {
  /** The response from the PayAI seller */
  response: unknown;
  /** Payment metadata */
  payment?: {
    txId?: string;
    cost?: string;
    network: string;
  };
  /** The query that was sent */
  query: string;
  /** The seller info */
  seller: X402SellerInfo;
}

