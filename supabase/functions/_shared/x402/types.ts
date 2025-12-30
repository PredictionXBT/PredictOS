/**
 * x402 Bazaar Types for PredictOS
 * 
 * Types for interacting with x402 bazaar discovery layer and sellers.
 */

/** Payment requirements from PayAI seller */
export interface X402PaymentRequirements {
  /** Asset contract address (e.g., USDC) */
  asset: string;
  /** Description of what's being paid for */
  description?: string;
  /** Extra metadata like token name and version */
  extra?: {
    name?: string;
    version?: string;
  };
  /** Maximum amount required in atomic units */
  maxAmountRequired: string;
  /** Maximum timeout in seconds */
  maxTimeoutSeconds: number;
  /** MIME type of the output */
  mimeType?: string;
  /** Network identifier (CAIP-2 format, e.g., "eip155:8453" or "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") */
  network: string;
  /** Input/output schema information */
  outputSchema?: {
    input?: {
      method: string;
      type: string;
      queryParams?: Record<string, {
        type: string;
        description?: string;
        required?: boolean;
      }>;
      bodyParams?: Record<string, {
        type: string;
        description?: string;
        required?: boolean;
      }>;
    };
    output?: Record<string, unknown> | null;
  };
  /** Address to pay to */
  payTo: string;
  /** Resource URL */
  resource: string;
  /** Payment scheme (e.g., "exact") */
  scheme: string;
}

/** x402 Bazaar resource (seller) */
export interface X402BazaarSeller {
  /** List of payment options accepted by this seller */
  accepts: X402PaymentRequirements[];
  /** Last updated timestamp */
  lastUpdated: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Resource URL */
  resource: string;
  /** Protocol type (e.g., "http") */
  type: string;
  /** x402 version */
  x402Version: number;
}

/** Response from listing bazaar resources */
export interface X402BazaarListResponse {
  /** List of discovered sellers */
  items: X402BazaarSeller[];
  /** Total count of sellers */
  total?: number;
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/** Request to call an PayAI seller */
export interface X402CallSellerRequest {
  /** The seller's resource URL */
  resourceUrl: string;
  /** Query/input to send to the seller */
  query: string;
  /** Network to use for payment (CAIP-2 format) */
  network: string;
  /** Optional specific method (GET/POST) */
  method?: string;
}

/** Response from calling an PayAI seller */
export interface X402CallSellerResponse {
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

/** Simplified seller info for frontend display */
export interface X402SellerInfo {
  /** Unique identifier (resource URL) */
  id: string;
  /** Display name extracted from metadata or URL */
  name: string;
  /** Description of the service */
  description?: string;
  /** Resource URL */
  resourceUrl: string;
  /** Price per call in USDC (human readable) */
  priceUsdc: string;
  /** Supported networks */
  networks: string[];
  /** Last updated */
  lastUpdated: string;
  /** Input schema description */
  inputDescription?: string;
}

/** API request for listing sellers */
export interface ListSellersRequest {
  /** Filter by network */
  network?: string;
  /** Protocol type filter */
  type?: string;
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/** API response for listing sellers */
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

