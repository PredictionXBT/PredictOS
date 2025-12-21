/**
 * Types for Polyfactual Deep Research API integration
 */

/**
 * Request body for the polyfactual-research endpoint
 */
export interface PolyfactualResearchRequest {
  /** The research query/question */
  query: string;
}

/**
 * Citation structure from Polyfactual
 */
export interface PolyfactualCitation {
  /** Source URL */
  url?: string;
  /** Source title */
  title?: string;
  /** Snippet from the source */
  snippet?: string;
}

/**
 * Response from the polyfactual-research endpoint
 */
export interface PolyfactualResearchResponse {
  /** Whether the request was successful */
  success: boolean;
  /** The research answer (only present on success) */
  answer?: string;
  /** Citation sources (only present on success) */
  citations?: PolyfactualCitation[];
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

