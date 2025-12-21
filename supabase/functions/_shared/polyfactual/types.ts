/**
 * Polyfactual Deep Research API Types
 * 
 * API Base URL: https://deep-research-api.thekid-solana.workers.dev/
 */

/**
 * Request payload for the /answer endpoint
 */
export interface PolyfactualAnswerRequest {
  /** The research query (max 1000 characters) */
  query: string;
  /** Whether to return text output (default: true) */
  text?: boolean;
}

/**
 * Success response from the Polyfactual API
 */
export interface PolyfactualSuccessResponse {
  success: true;
  /** The generated answer and metadata */
  data: PolyfactualAnswerData;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Error response from the Polyfactual API
 */
export interface PolyfactualErrorResponse {
  success: false;
  /** Error message */
  error: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Union type for Polyfactual API responses
 */
export type PolyfactualResponse = PolyfactualSuccessResponse | PolyfactualErrorResponse;

/**
 * Answer data structure from Polyfactual
 */
export interface PolyfactualAnswerData {
  /** The generated answer text */
  answer?: string;
  /** Citation sources */
  citations?: PolyfactualCitation[];
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Citation structure
 */
export interface PolyfactualCitation {
  /** Source URL */
  url?: string;
  /** Source title */
  title?: string;
  /** Snippet from the source */
  snippet?: string;
}

