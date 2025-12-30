/** Data provider for market data */
export type DataProvider = 'dome' | 'dflow';

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
  /** X (Twitter) post URLs backing the analysis (when x_search tool is used) */
  xSources?: string[];
  /** Web URLs (news, articles) backing the analysis (when web_search tool is used) */
  webSources?: string[];
}
