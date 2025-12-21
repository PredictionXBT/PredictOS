"use client";

import { useState } from "react";
import Image from "next/image";
import TerminalInput, { type AIModel } from "./TerminalInput";
import PolyfactualInput from "./PolyfactualInput";
import AnalysisOutput from "./AnalysisOutput";
import PolyfactualOutput from "./PolyfactualOutput";
import type { MarketAnalysis, AnalyzeMarketResponse } from "@/types/api";
import type { PolyfactualResearchResponse, PolyfactualCitation } from "@/types/polyfactual";

type TabType = "markets" | "polyfactual";

interface AnalysisResult {
  id: string;
  analysis: MarketAnalysis;
  timestamp: Date;
  marketUrl?: string;
}

interface PolyfactualResult {
  id: string;
  answer: string;
  citations?: PolyfactualCitation[];
  timestamp: Date;
  query: string;
}

/**
 * Validate that the URL is a supported prediction market URL (Kalshi or Polymarket)
 */
function isPredictionMarketUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes("kalshi") || urlObj.hostname.includes("polymarket");
  } catch {
    return false;
  }
}

const Terminal = () => {
  const [activeTab, setActiveTab] = useState<TabType>("markets");
  
  // Market analysis state
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [shouldClearMarketInput, setShouldClearMarketInput] = useState(false);

  // Polyfactual state
  const [polyfactualResults, setPolyfactualResults] = useState<PolyfactualResult[]>([]);
  const [isPolyfactualLoading, setIsPolyfactualLoading] = useState(false);
  const [polyfactualError, setPolyfactualError] = useState<string | null>(null);
  const [shouldClearPolyfactualInput, setShouldClearPolyfactualInput] = useState(false);

  const handleMarketSubmit = async (url: string, model: AIModel) => {
    setIsMarketLoading(true);
    setMarketError(null);
    setShouldClearMarketInput(false);
    
    try {
      // Validate the URL
      if (!isPredictionMarketUrl(url)) {
        throw new Error("Invalid URL. Please paste a valid Kalshi or Polymarket URL.");
      }

      // Call our server-side API
      const response = await fetch("/api/analyze-event-markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          question: "What is the best trading opportunity in this market? Analyze the probability and provide a recommendation.",
          model,
        }),
      });

      const data: AnalyzeMarketResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to analyze market");
      }

      const result: AnalysisResult = {
        id: data.metadata.requestId,
        analysis: data.data,
        timestamp: new Date(data.metadata.timestamp),
        marketUrl: data["pm-market-url"],
      };

      setAnalyses(prev => [result, ...prev]);
      setShouldClearMarketInput(true);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsMarketLoading(false);
    }
  };

  const handlePolyfactualSubmit = async (query: string) => {
    setIsPolyfactualLoading(true);
    setPolyfactualError(null);
    setShouldClearPolyfactualInput(false);
    
    try {
      // Call our server-side API
      const response = await fetch("/api/polyfactual-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data: PolyfactualResearchResponse = await response.json();

      if (!data.success || !data.answer) {
        throw new Error(data.error || "Failed to get research answer");
      }

      const result: PolyfactualResult = {
        id: data.metadata.requestId,
        answer: data.answer,
        citations: data.citations,
        timestamp: new Date(data.metadata.timestamp),
        query: data.metadata.query,
      };

      setPolyfactualResults(prev => [result, ...prev]);
      setShouldClearPolyfactualInput(true);
    } catch (err) {
      setPolyfactualError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsPolyfactualLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header - Always visible */}
          <div className="text-center py-8 fade-in">
            {/* AI Market Analysis Title */}
            <h2 className="font-display text-xl md:text-2xl font-bold text-primary text-glow mb-6">
              AI Market Analysis
            </h2>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-1 mb-6">
              <button
                onClick={() => setActiveTab("markets")}
                className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${
                  activeTab === "markets"
                    ? "bg-primary/20 text-primary border border-primary/50"
                    : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                }`}
              >
                Kalshi/Polymarket
              </button>
              <button
                onClick={() => setActiveTab("polyfactual")}
                className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${
                  activeTab === "polyfactual"
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/50"
                    : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                }`}
              >
                Polyfactual
              </button>
            </div>

            {/* Description */}
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              {activeTab === "markets" 
                ? "Paste a Kalshi or Polymarket URL to get instant AI-powered analysis with probability estimates and alpha opportunities."
                : "Ask any research question and get comprehensive AI-powered answers with citations."
              }
            </p>

            {/* Powered by */}
            <div>
              {activeTab === "markets" ? (
                <a 
                  href="https://domeapi.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <Image 
                    src="/dome-icon-light.svg" 
                    alt="Dome" 
                    width={16} 
                    height={16} 
                    className="w-4 h-4"
                  />
                  <span>Powered by Dome</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs text-violet-400">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span>Powered by Polyfactual Deep Research</span>
                </span>
              )}
            </div>
          </div>

          {/* Market Analysis Tab Content */}
          {activeTab === "markets" && (
            <>
              {/* Error Display */}
              {marketError && (
                <div className="border border-destructive/50 rounded-lg bg-destructive/10 p-4 fade-in">
                  <p className="text-destructive text-sm font-mono">{`> Error: ${marketError}`}</p>
                </div>
              )}

              {/* Input */}
              <TerminalInput onSubmit={handleMarketSubmit} isLoading={isMarketLoading} shouldClear={shouldClearMarketInput} />

              {/* Analysis Results */}
              <div className="space-y-4">
                {analyses.map((result) => (
                  <AnalysisOutput
                    key={result.id}
                    analysis={result.analysis}
                    timestamp={result.timestamp}
                    marketUrl={result.marketUrl}
                  />
                ))}
              </div>
            </>
          )}

          {/* Polyfactual Tab Content */}
          {activeTab === "polyfactual" && (
            <>
              {/* Error Display */}
              {polyfactualError && (
                <div className="border border-destructive/50 rounded-lg bg-destructive/10 p-4 fade-in">
                  <p className="text-destructive text-sm font-mono">{`> Error: ${polyfactualError}`}</p>
                </div>
              )}

              {/* Input */}
              <PolyfactualInput 
                onSubmit={handlePolyfactualSubmit} 
                isLoading={isPolyfactualLoading} 
                shouldClear={shouldClearPolyfactualInput} 
              />

              {/* Research Results */}
              <div className="space-y-4">
                {polyfactualResults.map((result) => (
                  <PolyfactualOutput
                    key={result.id}
                    answer={result.answer}
                    citations={result.citations}
                    timestamp={result.timestamp}
                    query={result.query}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
