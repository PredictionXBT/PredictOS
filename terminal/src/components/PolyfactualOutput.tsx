"use client";

import { ExternalLink, BookOpen, Clock, Sparkles } from "lucide-react";
import type { PolyfactualCitation } from "@/types/polyfactual";

interface PolyfactualOutputProps {
  answer: string;
  citations?: PolyfactualCitation[];
  timestamp: Date;
  query: string;
}

const PolyfactualOutput = ({ answer, citations, timestamp, query }: PolyfactualOutputProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="border border-border rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-display text-violet-400">POLYFACTUAL RESEARCH</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTime(timestamp)}</span>
        </div>
      </div>

      {/* Query */}
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/20">
        <p className="text-sm text-muted-foreground">
          <span className="text-violet-400 font-mono mr-2">{">"}</span>
          {query}
        </p>
      </div>

      {/* Answer */}
      <div className="px-4 py-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono text-sm">
            {answer}
          </div>
        </div>
      </div>

      {/* Citations */}
      {citations && citations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-border/30 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-display text-muted-foreground">SOURCES</span>
            </div>
            <div className="space-y-2">
              {citations.map((citation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs text-violet-400 font-mono mt-0.5">[{index + 1}]</span>
                  <div className="flex-1 min-w-0">
                    {citation.title && (
                      <p className="text-sm text-foreground/90 font-medium truncate">
                        {citation.title}
                      </p>
                    )}
                    {citation.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {citation.snippet}
                      </p>
                    )}
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[300px]">{citation.url}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolyfactualOutput;

