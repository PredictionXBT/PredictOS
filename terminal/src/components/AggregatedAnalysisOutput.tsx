"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Layers, Users, CheckCircle2, AlertCircle } from "lucide-react";
import type { AggregatedAnalysis } from "@/types/agentic";

interface AggregatedAnalysisOutputProps {
  analysis: AggregatedAnalysis;
  timestamp: Date;
  agentsCount: number;
  marketUrl?: string;
}

const AggregatedAnalysisOutput = ({ analysis, timestamp, agentsCount, marketUrl }: AggregatedAnalysisOutputProps) => {
  const [displayedLines, setDisplayedLines] = useState<number>(0);
  
  const getVerdict = (): "bullish" | "bearish" | "neutral" => {
    if (analysis.recommendedAction === "BUY YES") return "bullish";
    if (analysis.recommendedAction === "BUY NO") return "bearish";
    return "neutral";
  };

  const verdict = getVerdict();

  const getConsensusColor = () => {
    switch (analysis.agentConsensus?.agreementLevel) {
      case "high":
        return "text-success";
      case "medium":
        return "text-warning";
      case "low":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getConsensusIcon = () => {
    switch (analysis.agentConsensus?.agreementLevel) {
      case "high":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "medium":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "low":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Users className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const allLines = [
    { type: "header", content: `AGGREGATED ANALYSIS: ${analysis.title}` },
    { type: "info", content: `EVENT: ${analysis.event_ticker}` },
    { type: "info", content: `TICKER: ${analysis.ticker}` },
    ...(marketUrl ? [{ type: "info", content: `URL: ${marketUrl}` }] : []),
    { type: "divider", content: "─".repeat(50) },
    { type: "consensus-header", content: "AGENT CONSENSUS:" },
    { type: "consensus", content: `Agreement Level: ${analysis.agentConsensus?.agreementLevel?.toUpperCase() || 'N/A'}` },
    { type: "consensus", content: `Majority Recommendation: ${analysis.agentConsensus?.majorityRecommendation || 'N/A'}` },
    ...(analysis.agentConsensus?.dissenting && analysis.agentConsensus.dissenting.length > 0 
      ? [{ type: "dissent", content: `Dissenting Views: ${analysis.agentConsensus.dissenting.join("; ")}` }]
      : []),
    { type: "divider", content: "─".repeat(50) },
    { type: "price", content: `MARKET PROBABILITY: ${analysis.marketProbability.toFixed(1)}%` },
    { type: "price", content: `ESTIMATED ACTUAL: ${analysis.estimatedActualProbability.toFixed(1)}%` },
    { type: "edge", content: `ALPHA OPPORTUNITY: ${analysis.alphaOpportunity > 0 ? "+" : ""}${analysis.alphaOpportunity.toFixed(1)}%` },
    { type: "confidence", content: `CONFIDENCE: ${analysis.confidence}%` },
    { type: "divider", content: "─".repeat(50) },
    { type: "verdict-label", content: "FINAL VERDICT:" },
    { type: "verdict", content: `${analysis.recommendedAction} (${analysis.predictedWinner} @ ${analysis.winnerConfidence}% confidence)` },
    { type: "divider", content: "─".repeat(50) },
    ...(analysis.questionAnswer ? [
      { type: "section", content: "CONSOLIDATED ANSWER:" },
      { type: "answer", content: analysis.questionAnswer },
      { type: "divider", content: "─".repeat(50) },
    ] : []),
    { type: "section", content: "KEY FACTORS (Consolidated):" },
    ...analysis.keyFactors.map(f => ({ type: "factor", content: `• ${f}` })),
    { type: "divider", content: "─".repeat(50) },
    { type: "section", content: "RISKS (Consolidated):" },
    ...analysis.risks.map(r => ({ type: "risk", content: `⚠ ${r}` })),
    { type: "divider", content: "─".repeat(50) },
    { type: "recommendation-label", content: "SUMMARY:" },
    { type: "recommendation", content: analysis.analysisSummary },
  ];

  useEffect(() => {
    setDisplayedLines(0);
    const interval = setInterval(() => {
      setDisplayedLines(prev => {
        if (prev >= allLines.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 40);
    
    return () => clearInterval(interval);
  }, [analysis.ticker, allLines.length]);

  const getVerdictIcon = () => {
    switch (verdict) {
      case "bullish":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "bearish":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-warning" />;
    }
  };

  const getVerdictColor = () => {
    switch (verdict) {
      case "bullish":
        return "text-success";
      case "bearish":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  const getLineStyle = (type: string) => {
    switch (type) {
      case "header":
        return "text-violet-400 font-bold text-lg";
      case "info":
        return "text-muted-foreground text-sm";
      case "divider":
        return "text-violet-500/30";
      case "consensus-header":
        return "text-violet-400 font-semibold mt-2";
      case "consensus":
        return `${getConsensusColor()} font-medium`;
      case "dissent":
        return "text-warning/80 pl-2 text-sm";
      case "price":
        return "text-foreground";
      case "edge":
        return analysis.alphaOpportunity > 0 ? "text-success font-semibold" : analysis.alphaOpportunity < 0 ? "text-destructive font-semibold" : "text-warning font-semibold";
      case "confidence":
        return analysis.confidence >= 70 ? "text-success" : analysis.confidence >= 40 ? "text-warning" : "text-destructive";
      case "verdict-label":
      case "section":
      case "recommendation-label":
        return "text-violet-400 font-semibold mt-2";
      case "verdict":
        return `${getVerdictColor()} font-bold text-xl`;
      case "answer":
        return "text-secondary-foreground pl-2 whitespace-pre-wrap";
      case "factor":
        return "text-secondary-foreground pl-2";
      case "risk":
        return "text-warning/80 pl-2";
      case "recommendation":
        return "text-foreground font-medium";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="border border-violet-500/50 rounded-lg bg-gradient-to-br from-violet-500/5 via-card/80 to-cyan-500/5 backdrop-blur-sm shadow-lg shadow-violet-500/10 fade-in">
      <div className="flex items-center justify-between px-4 py-2 border-b border-violet-500/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-400 font-display">
            AGGREGATED ANALYSIS
          </span>
          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-[10px] text-violet-400 font-mono">
            {agentsCount} agents
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getConsensusIcon()}
          <span className={`text-xs font-semibold ${getConsensusColor()}`}>
            {analysis.agentConsensus?.agreementLevel?.toUpperCase()} CONSENSUS
          </span>
        </div>
      </div>
      
      <div className="p-4 font-mono text-sm leading-relaxed max-h-[700px] overflow-y-auto">
        {allLines.slice(0, displayedLines).map((line, index) => (
          <div key={index} className={`${getLineStyle(line.type)} ${line.type === "verdict" ? "flex items-center gap-2" : ""}`}>
            {line.type === "verdict" && getVerdictIcon()}
            {line.content}
          </div>
        ))}
        {displayedLines < allLines.length && (
          <span className="inline-block w-2 h-4 bg-violet-400 typing-cursor ml-1" />
        )}
      </div>
      
      <div className="px-4 py-2 border-t border-violet-500/30 flex items-center justify-between text-xs text-muted-foreground">
        <span>Aggregated at {timestamp.toLocaleTimeString()}</span>
        <span className="text-violet-400">PredictOS Aggregator</span>
      </div>
    </div>
  );
};

export default AggregatedAnalysisOutput;

