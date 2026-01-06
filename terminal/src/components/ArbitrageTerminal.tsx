"use client";

import { useState, useMemo } from "react";
import {
  Link2,
  Search,
  ChevronDown,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Percent,
  Target,
  Shield,
} from "lucide-react";
import Image from "next/image";
import type { ArbitrageResponse, ArbitrageAnalysis, ArbitrageMarketData } from "@/types/arbitrage";

// Model types
type AIModel = string;

interface ModelOption {
  value: AIModel;
  label: string;
  provider: "grok" | "openai";
}

const GROK_MODELS: ModelOption[] = [
  { value: "grok-4-1-fast-reasoning", label: "Grok 4.1 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-1-fast-non-reasoning", label: "Grok 4.1 Fast (Non-Reasoning)", provider: "grok" },
  { value: "grok-4-fast-reasoning", label: "Grok 4 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-fast-non-reasoning", label: "Grok 4 Fast (Non-Reasoning)", provider: "grok" },
];

const OPENAI_MODELS: ModelOption[] = [
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", provider: "openai" },
  { value: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
];

const ALL_MODELS: ModelOption[] = [...GROK_MODELS, ...OPENAI_MODELS];

// URL type detection
function detectUrlType(url: string): 'kalshi' | 'polymarket' | 'none' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('kalshi')) return 'kalshi';
  if (lowerUrl.includes('polymarket')) return 'polymarket';
  return 'none';
}

const ArbitrageTerminal = () => {
  // State
  const [url, setUrl] = useState("");
  const [model, setModel] = useState<string>("grok-4-1-fast-reasoning");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArbitrageAnalysis | null>(null);
  const [metadata, setMetadata] = useState<ArbitrageResponse['metadata'] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Derived state
  const detectedUrlType = useMemo(() => detectUrlType(url), [url]);
  const selectedModel = ALL_MODELS.find(m => m.value === model);
  const canSearch = url.trim() !== "" && detectedUrlType !== 'none' && model !== "";

  // Find arbitrage
  const handleFindArb = async () => {
    if (!canSearch) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setMetadata(null);

    try {
      const response = await fetch("/api/arbitrage-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, model }),
      });

      const data: ArbitrageResponse = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to find arbitrage opportunities");
        return;
      }

      setResult(data.data || null);
      setMetadata(data.metadata || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Render market card
  const renderMarketCard = (market: ArbitrageMarketData, label: string) => (
    <div className="bg-secondary/30 rounded-lg p-4 terminal-border">
      <div className="flex items-center gap-2 mb-3">
        <Image
          src={market.source === 'polymarket' ? '/polyfacts.svg' : '/okbet.svg'}
          alt={market.source}
          width={20}
          height={20}
        />
        <span className="text-xs font-mono text-primary uppercase">{label}</span>
      </div>
      
      <h4 className="text-sm font-medium text-foreground mb-3 line-clamp-2">
        {market.name}
      </h4>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-success/10 rounded p-2 text-center">
          <span className="text-xs text-muted-foreground block">YES</span>
          <span className="text-lg font-bold text-success">{market.yesPrice.toFixed(1)}%</span>
        </div>
        <div className="bg-danger/10 rounded p-2 text-center">
          <span className="text-xs text-muted-foreground block">NO</span>
          <span className="text-lg font-bold text-danger">{market.noPrice.toFixed(1)}%</span>
        </div>
      </div>

      {market.volume && (
        <div className="text-xs text-muted-foreground mb-2">
          Volume: ${market.volume.toLocaleString()}
        </div>
      )}

      {market.url && (
        <a
          href={market.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Market
        </a>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Arbitrage Intelligence
              </h1>
              <p className="text-sm text-muted-foreground">
                Find arbitrage across Polymarket and Kalshi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="bg-card rounded-xl terminal-border p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* URL Input */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2 min-h-[22px]">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Market URL
                </label>
                {/* Data Provider Badge - Above input, right-aligned */}
                {detectedUrlType !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground/50 uppercase">
                      via
                    </span>
                    {detectedUrlType === 'kalshi' && (
                      <a
                        href="https://pond.dflow.net/introduction"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-500/50 transition-all"
                      >
                        <Image 
                          src="/Dflow_logo.png" 
                          alt="DFlow" 
                          width={12} 
                          height={12} 
                          className="rounded-sm"
                        />
                        <span className="text-[10px] font-semibold text-indigo-400">
                          DFlow
                        </span>
                      </a>
                    )}
                    {detectedUrlType === 'polymarket' && (
                      <a
                        href="https://domeapi.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all"
                      >
                        <Image 
                          src="/dome-icon-light.svg" 
                          alt="Dome" 
                          width={12} 
                          height={12}
                        />
                        <span className="text-[10px] font-semibold text-emerald-400">
                          Dome
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste Kalshi or Polymarket link..."
                  className="w-full h-[46px] pl-10 pr-4 bg-secondary rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
                {url && detectedUrlType === 'none' && url.trim() !== '' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-destructive/20 text-destructive border border-destructive/30">
                      Invalid URL
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Model Dropdown */}
            <div className="w-full md:w-64">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block min-h-[22px] flex items-center">
                AI Model
              </label>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full h-[46px] flex items-center justify-between px-4 bg-secondary rounded-lg border border-border hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">
                      {selectedModel?.label || "Select Model"}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg border border-border shadow-xl z-20 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Grok Models
                      </div>
                      {GROK_MODELS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => {
                            setModel(m.value);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            model === m.value
                              ? 'bg-primary/20 text-primary'
                              : 'hover:bg-secondary text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                      
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">
                        OpenAI Models
                      </div>
                      {OPENAI_MODELS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => {
                            setModel(m.value);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            model === m.value
                              ? 'bg-primary/20 text-primary'
                              : 'hover:bg-secondary text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            <div>
              <button
                onClick={handleFindArb}
                disabled={!canSearch || isLoading}
                className="w-full md:w-auto h-[46px] px-6 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-box-hover"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find Arb
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-destructive mb-1">Error</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className={`rounded-xl p-6 terminal-border ${
              result.arbitrage.hasArbitrage 
                ? 'bg-success/10 border-success/30' 
                : 'bg-card'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {result.arbitrage.hasArbitrage ? (
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Target className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      {result.arbitrage.hasArbitrage 
                        ? '🎯 Arbitrage Opportunity Found!' 
                        : 'No Arbitrage Opportunity'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {result.isSameMarket 
                        ? `Same market detected (${result.sameMarketConfidence}% confidence)` 
                        : 'Markets do not appear to be the same'}
                    </p>
                  </div>
                </div>

                {result.arbitrage.hasArbitrage && result.arbitrage.profitPercent && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-success">
                      +{result.arbitrage.profitPercent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Potential Profit</div>
                  </div>
                )}
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* Arbitrage Strategy */}
            {result.arbitrage.hasArbitrage && result.arbitrage.strategy && (
              <div className="bg-card rounded-xl terminal-border p-6">
                <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Arbitrage Strategy
                </h3>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                    <div className="text-xs text-success/70 uppercase font-mono mb-1">Step 1: Buy YES</div>
                    <div className="text-lg font-bold text-success mb-1">
                      {result.arbitrage.strategy.buyYesOn === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @ {result.arbitrage.strategy.buyYesPrice.toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-danger/10 rounded-lg p-4 border border-danger/20">
                    <div className="text-xs text-danger/70 uppercase font-mono mb-1">Step 2: Buy NO</div>
                    <div className="text-lg font-bold text-danger mb-1">
                      {result.arbitrage.strategy.buyNoOn === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @ {result.arbitrage.strategy.buyNoPrice.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Total Cost</div>
                      <div className="text-lg font-bold text-foreground">
                        ${result.arbitrage.strategy.totalCost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Guaranteed Payout</div>
                      <div className="text-lg font-bold text-foreground">
                        ${result.arbitrage.strategy.guaranteedPayout.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Net Profit</div>
                      <div className="text-lg font-bold text-success">
                        +${result.arbitrage.strategy.netProfit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Market Comparison */}
            {result.isSameMarket && (
              <div className="bg-card rounded-xl terminal-border p-6">
                <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" />
                  Market Comparison
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {result.polymarketData && renderMarketCard(result.polymarketData, 'Polymarket')}
                  {result.kalshiData && renderMarketCard(result.kalshiData, 'Kalshi')}
                </div>
              </div>
            )}

            {/* Analysis Details */}
            <div className="bg-card rounded-xl terminal-border p-6">
              <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Analysis
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono mb-1">
                    Market Comparison Reasoning
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {result.marketComparisonReasoning}
                  </p>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono mb-1">
                    Recommendation
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {result.recommendation}
                  </p>
                </div>

                {result.risks.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-mono mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Risks & Caveats
                    </div>
                    <ul className="space-y-1">
                      {result.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-warning/80">
                          <Shield className="w-3 h-3 mt-1 shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                <div className="flex items-center gap-4">
                  <span>Model: {metadata.model}</span>
                  {metadata.tokensUsed && <span>Tokens: {metadata.tokensUsed.toLocaleString()}</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span>Source: {metadata.sourceMarket}</span>
                  <span>Searched: {metadata.searchedMarket}</span>
                  <span>{metadata.processingTimeMs}ms</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !result && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to Find Arbitrage
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Paste a Polymarket or Kalshi market URL above to search for arbitrage opportunities across both platforms.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArbitrageTerminal;

