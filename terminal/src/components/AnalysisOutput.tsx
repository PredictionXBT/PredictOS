"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Twitter, Globe } from "lucide-react";
import type { MarketAnalysis } from "@/types/api";

interface AnalysisOutputProps {
  analysis: MarketAnalysis;
  timestamp: Date;
  marketUrl?: string;
}

const AnalysisOutput = ({ analysis, timestamp, marketUrl }: AnalysisOutputProps) => {
  const [displayedLines, setDisplayedLines] = useState<number>(0);
  
  const getVerdict = (): "bullish" | "bearish" | "neutral" => {
    if (analysis.recommendedAction === "BUY YES") return "bullish";
    if (analysis.recommendedAction === "BUY NO") return "bearish";
    return "neutral";
  };

  const verdict = getVerdict();

  const allLines = [
    { type: "header", content: `MARKET: ${analysis.title}` },
    { type: "info", content: `EVENT: ${analysis.event_ticker}` },
    { type: "info", content: `TICKER: ${analysis.ticker}` },
    ...(marketUrl ? [{ type: "info", content: `URL: ${marketUrl}` }] : []),
    { type: "divider", content: "─".repeat(50) },
    { type: "price", content: `MARKET PROBABILITY: ${analysis.marketProbability.toFixed(1)}%` },
    { type: "price", content: `ESTIMATED ACTUAL: ${analysis.estimatedActualProbability.toFixed(1)}%` },
    { type: "edge", content: `ALPHA OPPORTUNITY: ${analysis.alphaOpportunity > 0 ? "+" : ""}${analysis.alphaOpportunity.toFixed(1)}%` },
    { type: "confidence", content: `CONFIDENCE: ${analysis.confidence}%` },
    { type: "divider", content: "─".repeat(50) },
    { type: "verdict-label", content: "VERDICT:" },
    { type: "verdict", content: `${analysis.recommendedAction} (${analysis.predictedWinner} @ ${analysis.winnerConfidence}% confidence)` },
    { type: "divider", content: "─".repeat(50) },
    ...(analysis.questionAnswer ? [
      { type: "section", content: "QUESTION ANSWER:" },
      { type: "answer", content: analysis.questionAnswer },
      { type: "divider", content: "─".repeat(50) },
    ] : []),
    { type: "section", content: "KEY FACTORS:" },
    ...analysis.keyFactors.map(f => ({ type: "factor", content: `• ${f}` })),
    { type: "divider", content: "─".repeat(50) },
    { type: "section", content: "RISKS:" },
    ...analysis.risks.map(r => ({ type: "risk", content: `⚠ ${r}` })),
    { type: "divider", content: "─".repeat(50) },
    { type: "recommendation-label", content: "SUMMARY:" },
    { type: "recommendation", content: analysis.analysisSummary },
    ...(analysis.xSources && analysis.xSources.length > 0 ? [
      { type: "divider", content: "─".repeat(50) },
      { type: "section", content: "X SOURCES:" },
      ...analysis.xSources.map(url => ({ type: "x-source", content: url })),
    ] : []),
    ...(analysis.webSources && analysis.webSources.length > 0 ? [
      { type: "divider", content: "─".repeat(50) },
      { type: "section", content: "WEB SOURCES:" },
      ...analysis.webSources.map(url => ({ type: "web-source", content: url })),
    ] : []),
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
    }, 50);
    
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
        return "text-primary font-bold text-lg";
      case "info":
        return "text-muted-foreground text-sm";
      case "divider":
        return "text-border/50";
      case "price":
        return "text-foreground";
      case "edge":
        return analysis.alphaOpportunity > 0 ? "text-success font-semibold" : analysis.alphaOpportunity < 0 ? "text-destructive font-semibold" : "text-warning font-semibold";
      case "confidence":
        return analysis.confidence >= 70 ? "text-success" : analysis.confidence >= 40 ? "text-warning" : "text-destructive";
      case "verdict-label":
      case "section":
      case "recommendation-label":
        return "text-primary font-semibold mt-2";
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
      case "x-source":
        return "text-cyan-400 pl-2 hover:underline cursor-pointer";
      case "web-source":
        return "text-emerald-400 pl-2 hover:underline cursor-pointer";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card/80 backdrop-blur-sm border-glow fade-in">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-display">
            ANALYSIS OUTPUT
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getVerdictIcon()}
          <span className={`text-xs font-semibold ${getVerdictColor()}`}>
            {analysis.recommendedAction}
          </span>
        </div>
      </div>
      
      <div className="p-4 font-mono text-sm leading-relaxed max-h-[600px] overflow-y-auto">
        {allLines.slice(0, displayedLines).map((line, index) => (
          <div key={index} className={`${getLineStyle(line.type)} ${line.type === "verdict" ? "flex items-center gap-2" : ""}`}>
            {line.type === "verdict" && getVerdictIcon()}
            {line.type === "x-source" ? (
              <a 
                href={line.content} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <Twitter className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{line.content}</span>
              </a>
            ) : line.type === "web-source" ? (
              <a 
                href={line.content} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{line.content}</span>
              </a>
            ) : (
              line.content
            )}
          </div>
        ))}
        {displayedLines < allLines.length && (
          <span className="inline-block w-2 h-4 bg-primary typing-cursor ml-1" />
        )}
      </div>
      
      <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Analyzed at {timestamp.toLocaleTimeString()}</span>
        <span className="text-primary">PredictOS</span>
      </div>
    </div>
  );
};

export default AnalysisOutput;

