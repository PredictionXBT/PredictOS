/**
 * Types for the polyfactual-research edge function
 */

/**
 * Request body for the polyfactual-research endpoint
 */
export interface PolyfactualResearchRequest {
  /** The research query/question */
  query: string;
}

/**
 * Successful response from polyfactual-research
 */
export interface PolyfactualResearchResponse {
  /** Whether the request was successful */
  success: boolean;
  /** The research answer (only present on success) */
  answer?: string;
  /** Citation sources (only present on success) */
  citations?: Array<{
    url?: string;
    title?: string;
    snippet?: string;
  }>;
  /** Raw data from Polyfactual (only present on success) */
  data?: Record<string, unknown>;
  /** Request metadata */
  metadata: {
    /** Unique identifier for this request */
    requestId: string;
    /** ISO timestamp of the response */
    timestamp: string;
    /** Original query */
    query: string;
    /** Total processing time in milliseconds */
    processingTimeMs: number;
  };
  /** Error message (only present on failure) */
  error?: string;
}

