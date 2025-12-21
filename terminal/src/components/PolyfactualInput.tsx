"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { Send, Sparkles } from "lucide-react";

interface PolyfactualInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  shouldClear?: boolean;
}

const loadingMessages = [
  "Researching your question",
  "Gathering information",
  "Analyzing sources",
  "Synthesizing findings",
  "Preparing citations",
  "Generating answer",
];

const PolyfactualInput = ({ onSubmit, isLoading, shouldClear }: PolyfactualInputProps) => {
  const [input, setInput] = useState("");
  const [dots, setDots] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const prevShouldClear = useRef(shouldClear);

  // Clear input when shouldClear changes to true
  useEffect(() => {
    if (shouldClear && !prevShouldClear.current) {
      setInput("");
    }
    prevShouldClear.current = shouldClear;
  }, [shouldClear]);

  // Animate the dots
  useEffect(() => {
    if (!isLoading) {
      setDots("");
      setMessageIndex(0);
      return;
    }

    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 400);

    return () => clearInterval(dotsInterval);
  }, [isLoading]);

  // Cycle through loading messages
  useEffect(() => {
    if (!isLoading) return;

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, [isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  return (
    <div className="relative z-20 border border-violet-500/30 rounded-lg bg-card/80 backdrop-blur-sm" style={{ boxShadow: "inset 0 0 20px hsl(270 60% 50% / 0.1), 0 0 20px hsl(270 60% 50% / 0.15)" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-400 font-display">
            POLYFACTUAL RESEARCH
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Deep Research API
        </span>
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4">
        <span className="text-violet-400 font-bold">{">"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any question ..."
          disabled={isLoading}
          maxLength={1000}
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: "0 0 15px hsl(270 60% 50% / 0.3)" }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      
      {isLoading && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-violet-400 font-mono">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="min-w-[200px]">
              {loadingMessages[messageIndex]}<span className="inline-block w-6 text-left">{dots}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolyfactualInput;

