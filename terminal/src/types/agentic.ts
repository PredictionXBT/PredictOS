/**
 * Types for the agentic market analysis architecture
 */

import type { DataProvider } from "./api";

/** Prediction market type */
export type PmType = 'Kalshi' | 'Polymarket';

// ============================================================================
// Get Events Types
// ============================================================================

export interface GetEventsRequest {
  url: string;
  dataProvider?: DataProvider;
}

export interface GetEventsResponse {
  success: boolean;
  eventIdentifier?: string;
  /** Event ID (for Polymarket - used for OkBet links) */
  eventId?: string;
  pmType?: PmType;
  markets?: unknown[];
  marketsCount?: number;
  dataProvider?: DataProvider;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

// ============================================================================
// Event Analysis Agent Types
// ============================================================================

export interface EventAnalysisAgentRequest {
  markets: unknown[];
  eventIdentifier: string;
  pmType: PmType;
  model: string;
  question?: string;
  tools?: ('x_search' | 'web_search')[];
  /** Optional user command to prioritize in the analysis */
  userCommand?: string;
}

export interface MarketAnalysis {
  event_ticker: string;
  ticker: string;
  title: string;
  marketProbability: number;
  estimatedActualProbability: number;
  alphaOpportunity: number;
  hasAlpha: boolean;
  predictedWinner: "YES" | "NO";
  winnerConfidence: number;
  recommendedAction: "BUY YES" | "BUY NO" | "NO TRADE";
  reasoning: string;
  confidence: number;
  keyFactors: string[];
  risks: string[];
  questionAnswer: string;
  analysisSummary: string;
  /** X (Twitter) post URLs backing the analysis (when x_search tool is used) */
  xSources?: string[];
  /** Web URLs (news, articles) backing the analysis (when web_search tool is used) */
  webSources?: string[];
}

export interface EventAnalysisAgentResponse {
  success: boolean;
  data?: MarketAnalysis;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    model: string;
    tokensUsed?: number;
  };
}

// ============================================================================
// Analysis Aggregator Agent Types
// ============================================================================

export interface AgentAnalysisInput {
  agentId: string;
  model: string;
  analysis: MarketAnalysis;
}

export interface AgentConsensus {
  agreementLevel: "high" | "medium" | "low";
  majorityRecommendation: string;
  dissenting: string[];
}

export interface AggregatedAnalysis extends MarketAnalysis {
  agentConsensus: AgentConsensus;
}

/** PayAI seller result for bookmaker aggregation */
export interface X402ResultInput {
  /** Agent identifier that used this seller */
  agentId: string;
  /** Name of the PayAI seller */
  seller: string;
  /** Query sent to the seller */
  query: string;
  /** Response from the seller (truncated) */
  response: string;
}

export interface AnalysisAggregatorRequest {
  analyses?: AgentAnalysisInput[];
  x402Results?: X402ResultInput[];
  eventIdentifier: string;
  pmType: PmType;
  model: string;
}

export interface AnalysisAggregatorResponse {
  success: boolean;
  data?: AggregatedAnalysis;
  error?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    model: string;
    tokensUsed?: number;
    agentsAggregated: number;
  };
}

// ============================================================================
// Frontend Agent State Types
// ============================================================================

/** Tool types available for Grok models */
export type GrokTool = 'x_search' | 'web_search';

/** Tool types available for all agents (includes non-Grok tools) */
export type AgentTool = GrokTool | 'polyfactual' | 'x402';

/** PayAI seller info for agent configuration */
export interface X402SellerConfig {
  /** Seller ID (resource URL) */
  id: string;
  /** Seller display name */
  name: string;
  /** Price per call */
  priceUsdc: string;
  /** Network to use */
  network: string;
}

/** Polyfactual research result to be appended to analysis */
export interface PolyfactualResearchResult {
  answer: string;
  citations: {
    url?: string;
    title?: string;
    snippet?: string;
  }[];
  query: string;
}

/** Irys upload status for verifiable analysis */
export interface IrysUploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  transactionId?: string;
  gatewayUrl?: string;
  error?: string;
}

/** Individual agent data for combined Irys upload */
export interface IrysAgentData {
  name: string;
  type: 'predict-agent' | 'bookmaker-agent' | 'mapper-agent' | 'execution' | 'x402-agent';
  model?: string;
  tools?: AgentTool[];
  userCommand?: string;
  analysis?: MarketAnalysis | AggregatedAnalysis;
  polyfactualResearch?: PolyfactualResearchResult;
  /** For x402 agents */
  x402Result?: {
    seller: X402SellerConfig;
    query: string;
    response: unknown;
    payment?: {
      txId?: string;
      cost?: string;
      network: string;
    };
  };
  /** For mapper agent */
  orderParams?: Record<string, unknown>;
  /** For execution */
  executionResult?: {
    status: 'success' | 'error' | 'skipped';
    orderId?: string;
    side?: string;
    size?: number;
    price?: number;
    costUsd?: number;
    errorMsg?: string;
  };
}

/** Combined Irys upload payload for all agents */
export interface IrysCombinedUploadPayload {
  requestId: string;
  timestamp: string;
  pmType: PmType;
  eventIdentifier: string;
  eventId?: string;
  analysisMode: 'supervised' | 'autonomous';
  agentsData: IrysAgentData[];
  schemaVersion: string;
}

export interface AgentConfig {
  id: string;
  model: string;
  tools?: AgentTool[];
  /** Optional user command to prioritize in the analysis */
  userCommand?: string;
  /** PayAI seller configuration (when x402 tool is selected) */
  x402Seller?: X402SellerConfig;
  /** x402 response data */
  x402Result?: {
    response: unknown;
    query: string;
    payment?: {
      txId?: string;
      cost?: string;
      network: string;
    };
  };
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: MarketAnalysis;
  polyfactualResearch?: PolyfactualResearchResult;
  error?: string;
}

export interface AggregatorConfig {
  model: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: AggregatedAnalysis;
  error?: string;
}

