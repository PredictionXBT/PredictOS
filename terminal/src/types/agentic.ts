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

export interface AnalysisAggregatorRequest {
  analyses: AgentAnalysisInput[];
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

export interface AgentConfig {
  id: string;
  model: string;
  tools?: GrokTool[];
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: MarketAnalysis;
  error?: string;
}

export interface AggregatorConfig {
  model: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: AggregatedAnalysis;
  error?: string;
}

