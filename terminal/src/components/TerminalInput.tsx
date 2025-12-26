"use client";

import { useState, useEffect, FormEvent, useRef, useMemo } from "react";
import { Send, Link2, ChevronDown } from "lucide-react";
import type { DataProvider } from "@/types/api";

// Grok Models (xAI)
export type GrokModel = 
  | "grok-4-1-fast-reasoning"
  | "grok-4-1-fast-non-reasoning"
  | "grok-4-fast-reasoning"
  | "grok-4-fast-non-reasoning";

// OpenAI Models
export type OpenAIModel =
  | "gpt-5.2"
  | "gpt-5.1"
  | "gpt-5-nano"
  | "gpt-4.1"
  | "gpt-4.1-mini";

// Combined AI Model type
export type AIModel = GrokModel | OpenAIModel;

// Model provider type
export type AIProvider = "grok" | "openai";

interface ModelOption {
  value: AIModel;
  label: string;
  provider: AIProvider;
}

export const GROK_MODELS: ModelOption[] = [
  { value: "grok-4-1-fast-reasoning", label: "Grok 4.1 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-1-fast-non-reasoning", label: "Grok 4.1 Fast (Non-Reasoning)", provider: "grok" },
  { value: "grok-4-fast-reasoning", label: "Grok 4 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-fast-non-reasoning", label: "Grok 4 Fast (Non-Reasoning)", provider: "grok" },
];

export const OPENAI_MODELS: ModelOption[] = [
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", provider: "openai" },
  { value: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
];

export const ALL_MODELS: ModelOption[] = [...GROK_MODELS, ...OPENAI_MODELS];

interface TerminalInputProps {
  onSubmit: (url: string, model: AIModel, dataProvider: DataProvider) => void;
  isLoading: boolean;
  shouldClear?: boolean;
}

const loadingMessages = [
  "Fetching market data",
  "Analyzing probabilities",
  "Detecting alpha opportunities",
  "Consulting AI agents",
  "Calculating edge",
  "Generating recommendation",
];

// Detect URL type from input
type UrlType = 'kalshi' | 'polymarket' | 'none';

function detectUrlType(url: string): UrlType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('kalshi')) return 'kalshi';
  if (lowerUrl.includes('polymarket')) return 'polymarket';
  return 'none';
}

const TerminalInput = ({ onSubmit, isLoading, shouldClear }: TerminalInputProps) => {
  const [input, setInput] = useState("");
  const [dots, setDots] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState<AIModel>("grok-4-1-fast-reasoning");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedDataProvider, setSelectedDataProvider] = useState<DataProvider>("dome");
  const prevShouldClear = useRef(shouldClear);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Detect URL type from input
  const detectedUrlType = useMemo(() => detectUrlType(input), [input]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      // For Polymarket, always use dome. For Kalshi, use the selected provider
      const provider = detectedUrlType === 'polymarket' ? 'dome' : selectedDataProvider;
      onSubmit(input.trim(), selectedModel, provider);
    }
  };

  const getModelLabel = (model: AIModel) => {
    return ALL_MODELS.find(m => m.value === model)?.label || model;
  };

  const getProviderBadge = (model: AIModel) => {
    const modelOption = ALL_MODELS.find(m => m.value === model);
    return modelOption?.provider === "openai" ? "OpenAI" : "Grok";
  };

  return (
    <div className="relative z-20 border border-border rounded-lg bg-card/80 backdrop-blur-sm border-glow">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-display">
            MARKET ANALYSIS INPUT
          </span>
        </div>
        
        {/* Model Dropdown in Header */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono whitespace-nowrap"
          >
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              getProviderBadge(selectedModel) === "OpenAI" 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                : "bg-orange-500/20 text-orange-400 border border-orange-500/50"
            }`}>
              {getProviderBadge(selectedModel)}
            </span>
            <span className="hidden sm:inline">{getModelLabel(selectedModel)}</span>
            <span className="sm:hidden">Model</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isModelDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden max-h-[400px] overflow-y-auto">
              {/* Grok Section */}
              <div className="px-3 py-2 bg-orange-500/10 border-b border-border sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/50">
                    xAI
                  </span>
                  <span className="text-xs font-semibold text-orange-400">Grok Models</span>
                </div>
              </div>
              <div className="py-1">
                {GROK_MODELS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => {
                      setSelectedModel(model.value);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors ${
                      selectedModel === model.value
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="block">{model.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{model.value}</span>
                  </button>
                ))}
              </div>
              
              {/* OpenAI Section */}
              <div className="px-3 py-2 bg-emerald-500/10 border-y border-border sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                    OpenAI
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">GPT Models</span>
                </div>
              </div>
              <div className="py-1">
                {OPENAI_MODELS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => {
                      setSelectedModel(model.value);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors ${
                      selectedModel === model.value
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="block">{model.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{model.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center gap-3 p-4 ${detectedUrlType !== 'none' ? 'pb-8' : ''}`}>
          <span className="text-primary font-bold">{">"}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Kalshi or Polymarket URL ..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-primary"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Data Provider Toggle - Bottom Right */}
        {detectedUrlType !== 'none' && (
          <div className="absolute bottom-1 right-4 flex items-center gap-1">
            {detectedUrlType === 'kalshi' ? (
              // Toggle for Kalshi - can switch between Dome and DFlow
              <div className="flex items-center bg-secondary/50 rounded-md border border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedDataProvider('dome')}
                  disabled={isLoading}
                  className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                    selectedDataProvider === 'dome'
                      ? 'bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/30'
                      : 'text-muted-foreground hover:text-foreground border-r border-border/50'
                  }`}
                >
                  Dome
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDataProvider('dflow')}
                  disabled={isLoading}
                  className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                    selectedDataProvider === 'dflow'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  DFlow
                </button>
              </div>
            ) : (
              // Static badge for Polymarket - only Dome is supported
              <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/30">
                Dome
              </span>
            )}
          </div>
        )}
      </form>
      
      {isLoading && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-primary font-mono">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="min-w-[200px]">
              {loadingMessages[messageIndex]}<span className="inline-block w-6 text-left">{dots}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalInput;

