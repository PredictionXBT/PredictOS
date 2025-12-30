/**
 * Type definitions for bookmaker-agent edge function
 */

/** Prediction market type */
export type PmType = 'Kalshi' | 'Polymarket';

/**
 * Individual agent's analysis input
 */
export interface AgentAnalysisInput {
  /** Unique agent identifier */
  agentId: string;
  /** Model used by this agent */
  model: string;
  /** The analysis result from this agent */
  analysis: MarketAnalysis;
}

/**
 * AI analysis result for an event's markets
 */
export interface MarketAnalysis {
  /** Event ticker identifier */
  event_ticker: string;
  /** Market ticker with the best alpha opportunity (if any) */
  ticker: string;
  /** Market title/question */
  title: string;
  /** Current market probability (0-100) */
  marketProbability: number;
  /** AI's estimated actual probability (0-100) */
  estimatedActualProbability: number;
  /** Difference between estimated and market probability (positive = buy yes, negative = buy no) */
  alphaOpportunity: number;
  /** Whether there is meaningful alpha opportunity */
  hasAlpha: boolean;
  /** Which side the AI predicts will win */
  predictedWinner: "YES" | "NO";
  /** Confidence that the predicted winner will win (0-100) */
  winnerConfidence: number;
  /** Recommended trading action */
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  /** Detailed explanation of the analysis */
  reasoning: string;
  /** AI's confidence in this overall assessment (0-100) */
  confidence: number;
  /** Key factors influencing the assessment */
  keyFactors: string[];
  /** Risks that could affect the prediction */
  risks: string[];
  /** Direct answer to the user's specific question */
  questionAnswer: string;
  /** Brief summary of the analysis findings (under 270 characters) */
  analysisSummary: string;
}

/**
 * Agent consensus information
 */
export interface AgentConsensus {
  /** Level of agreement among agents */
  agreementLevel: "high" | "medium" | "low";
  /** What most agents recommended */
  majorityRecommendation: string;
  /** Dissenting opinions summarized */
  dissenting: string[];
}

/**
 * Aggregated analysis result
 */
export interface AggregatedAnalysis extends MarketAnalysis {
  /** Information about agent consensus */
  agentConsensus: AgentConsensus;
}

/**
 * PayAI seller result input
 */
export interface X402ResultInput {
  /** Agent identifier that used this seller */
  agentId: string;
  /** Name of the PayAI seller */
  seller: string;
  /** Query sent to the seller */
  query: string;
  /** Response from the seller (truncated to 3000 chars) */
  response: string;
}

/**
 * Request body for the bookmaker-agent endpoint
 */
export interface AnalysisAggregatorRequest {
  /** List of all agent analyses to aggregate */
  analyses: AgentAnalysisInput[];
  /** List of PayAI seller results to include */
  x402Results?: X402ResultInput[];
  /** Event identifier (ticker for Kalshi, slug for Polymarket) */
  eventIdentifier: string;
  /** Prediction market type */
  pmType: PmType;
  /** AI model to use for aggregation */
  model: string;
}

/**
 * Response from the bookmaker-agent endpoint
 */
export interface AnalysisAggregatorResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Aggregated analysis result (only present on success) */
  data?: AggregatedAnalysis;
  /** Error message (only present on failure) */
  error?: string;
  /** Request metadata */
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    model: string;
    tokensUsed?: number;
    agentsAggregated: number;
  };
}

