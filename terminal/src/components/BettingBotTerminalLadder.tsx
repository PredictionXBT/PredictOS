"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, ChevronDown, Bot, DollarSign, AlertTriangle, Loader2, Layers, TrendingDown } from "lucide-react";
import type { SupportedAsset, BotLogEntry, LimitOrderBotResponse, LadderConfig } from "@/types/betting-bot";
import PositionDashboard from "./PositionDashboard";

const ASSETS: { value: SupportedAsset; label: string; icon: string }[] = [
  { value: "BTC", label: "Bitcoin (BTC)", icon: "₿" },
  { value: "ETH", label: "Ethereum (ETH)", icon: "Ξ" },
  { value: "SOL", label: "Solana (SOL)", icon: "◎" },
  { value: "XRP", label: "Ripple (XRP)", icon: "✕" },
];

// Ladder price range options
const LADDER_MAX_PRICE_OPTIONS = [
  { value: 49, label: "49%" },
  { value: 48, label: "48%" },
  { value: 47, label: "47%" },
];

const LADDER_MIN_PRICE_OPTIONS = [
  { value: 35, label: "35% (Recommended)" },
  { value: 38, label: "38%" },
  { value: 40, label: "40%" },
  { value: 42, label: "42%" },
];

const TAPER_FACTOR_OPTIONS = [
  { value: 1.0, label: "1.0 (Gentle)" },
  { value: 1.5, label: "1.5 (Moderate)" },
  { value: 2.0, label: "2.0 (Aggressive)" },
  { value: 2.5, label: "2.5 (Very Heavy Top)" },
];

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Calculate ladder rungs preview (matches backend logic)
 * Ensures minimum allocation per rung to guarantee 5+ shares at any price level
 */
function calculateLadderRungs(
  totalBankroll: number,
  maxPrice: number,
  minPrice: number,
  taperFactor: number
): Array<{ pricePercent: number; sizeUsd: number; allocationPercent: number }> {
  // Calculate minimum USD needed for 5 shares at the highest price level
  const MIN_SHARES = 5;
  const MIN_RUNG_USD = Math.ceil(MIN_SHARES * (maxPrice / 100) * 100) / 100;

  // Generate all potential price levels
  const allPriceLevels: number[] = [];
  for (let p = maxPrice; p >= minPrice; p--) {
    allPriceLevels.push(p);
  }

  // Find how many rungs we can afford with minimum allocation
  let priceLevels = [...allPriceLevels];
  let numRungs = priceLevels.length;

  while (numRungs > 1) {
    const rawWeights: number[] = [];
    for (let i = 0; i < numRungs; i++) {
      rawWeights.push(Math.exp(-taperFactor * i / numRungs));
    }
    const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = rawWeights.map(w => w / totalWeight);
    const smallestAllocation = totalBankroll * normalizedWeights[numRungs - 1];

    if (smallestAllocation >= MIN_RUNG_USD) {
      break;
    }
    numRungs--;
    priceLevels = allPriceLevels.slice(0, numRungs);
  }

  // Calculate final allocations
  const rungs: Array<{ pricePercent: number; sizeUsd: number; allocationPercent: number }> = [];
  const rawWeights: number[] = [];
  for (let i = 0; i < numRungs; i++) {
    rawWeights.push(Math.exp(-taperFactor * i / numRungs));
  }
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = rawWeights.map(w => w / totalWeight);

  for (let i = 0; i < numRungs; i++) {
    const allocationPercent = normalizedWeights[i] * 100;
    const sizeUsd = totalBankroll * normalizedWeights[i];
    rungs.push({
      pricePercent: priceLevels[i],
      sizeUsd: Math.round(sizeUsd * 100) / 100,
      allocationPercent: Math.round(allocationPercent * 100) / 100,
    });
  }

  return rungs;
}

/**
 * Get the next 15-minute market timestamp (rounds up to the next 15-min block)
 */
function getNext15MinTimestamp(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextQuarter = Math.ceil(minutes / 15) * 15;
  const next = new Date(now);
  next.setMinutes(nextQuarter, 0, 0);
  if (nextQuarter >= 60) {
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
  }
  return next;
}

/**
 * Format a date to a human-readable string
 */
function formatNextMarketTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

const BettingBotTerminalLadder = () => {
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC");
  const [orderSize, setOrderSize] = useState<number>(50);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<BotLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ladder mode state
  const [ladderMaxPrice, setLadderMaxPrice] = useState(49);
  const [ladderMinPrice, setLadderMinPrice] = useState(35);
  const [taperFactor, setTaperFactor] = useState(1.5);
  const [isMaxPriceDropdownOpen, setIsMaxPriceDropdownOpen] = useState(false);
  const [isMinPriceDropdownOpen, setIsMinPriceDropdownOpen] = useState(false);
  const [isTaperDropdownOpen, setIsTaperDropdownOpen] = useState(false);
  const maxPriceDropdownRef = useRef<HTMLDivElement>(null);
  const minPriceDropdownRef = useRef<HTMLDivElement>(null);
  const taperDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate ladder preview
  const ladderRungs = calculateLadderRungs(orderSize, ladderMaxPrice, ladderMinPrice, taperFactor);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (maxPriceDropdownRef.current && !maxPriceDropdownRef.current.contains(event.target as Node)) {
        setIsMaxPriceDropdownOpen(false);
      }
      if (minPriceDropdownRef.current && !minPriceDropdownRef.current.contains(event.target as Node)) {
        setIsMinPriceDropdownOpen(false);
      }
      if (taperDropdownRef.current && !taperDropdownRef.current.contains(event.target as Node)) {
        setIsTaperDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Add local log entry
  const addLog = useCallback((level: BotLogEntry["level"], message: string, details?: Record<string, unknown>) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }]);
  }, []);

  // Submit a single order to the limit order bot
  const submitOrder = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const requestBody: {
        asset: SupportedAsset;
        sizeUsd: number;
        ladder: LadderConfig;
      } = {
        asset: selectedAsset,
        sizeUsd: orderSize,
        ladder: {
          enabled: true,
          maxPrice: ladderMaxPrice,
          minPrice: ladderMinPrice,
          taperFactor: taperFactor,
        },
      };

      const response = await fetch("/api/limit-order-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: LimitOrderBotResponse = await response.json();

      if (!data.success) {
        setError(data.error || "Order submission failed");
        addLog("ERROR", data.error || "Order submission failed");
        // Still show next market time after error (15 minutes after current)
        const nextMarketStart = new Date(getNext15MinTimestamp().getTime() + 15 * 60 * 1000);
        const nextMarketEnd = new Date(nextMarketStart.getTime() + 15 * 60 * 1000);
        addLog("INFO", `Next Market Up: ${selectedAsset} Market ${formatNextMarketTime(nextMarketStart)} -- ${formatNextMarketTime(nextMarketEnd)}`);
        return;
      }

      // Log market result with Polymarket URL and order status
      if (data.data?.market) {
        const market = data.data.market;
        const asset = data.data.asset;
        const sizeUsd = data.data.sizeUsd;
        const polymarketUrl = `https://polymarket.com/event/${market.marketSlug}`;
        
        // Calculate market start and end times from the timestamp
        const marketStartTime = new Date(market.targetTimestamp * 1000);
        const marketEndTime = new Date(marketStartTime.getTime() + 15 * 60 * 1000);
        const startTimeStr = formatNextMarketTime(marketStartTime);
        const endTimeStr = formatNextMarketTime(marketEndTime);
        
        if (market.error) {
          addLog("ERROR", `${asset} Market ${startTimeStr} -- ${endTimeStr}: ${polymarketUrl} — Failed: ${market.error}`);
        } else if (market.ladderOrdersPlaced) {
          // Ladder mode logging
          const successCount = market.ladderSuccessfulOrders || 0;
          const totalCount = market.ladderTotalOrders || 0;
          addLog("SUCCESS", `${asset} LADDER ${startTimeStr} -- ${endTimeStr}: ${polymarketUrl}`);
          addLog("INFO", `Ladder: ${successCount}/${totalCount} orders placed across ${market.ladderOrdersPlaced.length} price levels ($${sizeUsd} total)`);
          // Log individual rungs
          for (const rung of market.ladderOrdersPlaced) {
            const upStatus = rung.up?.success ? "✓" : "✗";
            const downStatus = rung.down?.success ? "✓" : "✗";
            addLog("INFO", `  ${rung.pricePercent}%: Up ${upStatus} Down ${downStatus} ($${rung.sizeUsd.toFixed(2)})`);
          }
        }
        
        // Log the next market time (15 minutes after the one we just placed orders for)
        const nextMarketStart = new Date(marketStartTime.getTime() + 15 * 60 * 1000);
        const nextMarketEnd = new Date(nextMarketStart.getTime() + 15 * 60 * 1000);
        addLog("INFO", `Next Market Up: ${asset} Market ${formatNextMarketTime(nextMarketStart)} -- ${formatNextMarketTime(nextMarketEnd)}`);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setError(errorMsg);
      addLog("ERROR", `Submission failed: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAsset, orderSize, ladderMaxPrice, ladderMinPrice, taperFactor, addLog]);

  // Start the bot with polling
  const startBot = useCallback(() => {
    setIsBotRunning(true);
    setError(null);
    addLog("INFO", `Bot started — ${selectedAsset} LADDER MODE (${ladderMaxPrice}% → ${ladderMinPrice}%) with $${orderSize} total bankroll`);
    
    // Submit immediately
    submitOrder();
    
    // Set up 15-minute polling
    pollIntervalRef.current = setInterval(() => {
      submitOrder();
    }, POLL_INTERVAL_MS);
  }, [selectedAsset, orderSize, ladderMaxPrice, ladderMinPrice, addLog, submitOrder]);

  // Stop the bot
  const stopBot = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsBotRunning(false);
    addLog("INFO", "Bot stopped");
  }, [addLog]);

  // Get log level styling
  const getLogLevelStyle = (level: BotLogEntry["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "text-success";
      case "ERROR":
        return "text-destructive";
      case "WARN":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  const getLogLevelIcon = (level: BotLogEntry["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "✓";
      case "ERROR":
        return "✗";
      case "WARN":
        return "⚠";
      default:
        return "›";
    }
  };

  const selectedAssetData = ASSETS.find(a => a.value === selectedAsset);

  return (
    <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center py-8 fade-in">
            <div className="relative mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary text-glow mb-1">
                Polymarket 15 Minute Up/Down Arbitrage Bot
              </h2>
              <p className="text-xs text-muted-foreground/60 mb-3">(more bots coming soon)</p>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Automatically place straddle limit orders on Polymarket 15-minute Up/Down markets every 15 minutes.
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="border border-border/50 rounded-lg bg-secondary/30 p-4">
            <h3 className="font-display text-sm font-semibold text-primary mb-2">
              How It Works
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                <span>Select your preferred market type (BTC, ETH, SOL, or XRP) for 15-minute Up/Down markets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                <span>Configure the ladder price range and taper factor for allocation distribution</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                <span>Set your total bankroll — this is distributed across price levels (49% → 35%) with heavy allocation at top</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                <span>Click "Start Bot" to begin — the bot will place limit orders on the next market immediately</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">5.</span>
                <span>The bot automatically runs every 15 minutes to place orders on each new market</span>
              </li>
            </ul>
          </div>

          {/* Ladder Mode Explanation */}
          <div className="border border-border/50 rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-display text-sm font-semibold text-primary">
                Ladder Mode Explained
              </h3>
              <a 
                href="https://x.com/hanakoxbt/status/1999149407955308699?s=20" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2 font-mono truncate max-w-[200px] sm:max-w-none"
              >
                x.com/hanakoxbt/status/1999149407955308699
              </a>
            </div>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong>Ladder betting</strong> spreads your bankroll across multiple probability levels with exponentially tapered allocation — heavy at the top, light at the bottom. This captures more arbitrage opportunities: top rungs fill frequently for steady gains, while lower rungs occasionally fill for larger profits.
              </p>

              {/* Example allocation */}
              <div className="bg-card/50 rounded-lg p-3 space-y-1 font-mono text-xs border border-border/30">
                <div className="flex items-center gap-2">
                  <span className="text-primary">49%</span>
                  <span className="text-muted-foreground/70">→ ~25% of bankroll (most likely to fill, ~2% profit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">48%</span>
                  <span className="text-muted-foreground/70">→ ~18% of bankroll (~4% profit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">...</span>
                  <span className="text-muted-foreground/70">→ allocation tapers down exponentially</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">35%</span>
                  <span className="text-muted-foreground/70">→ ~1% of bankroll (rare fills, ~86% profit)</span>
                </div>
              </div>

              {/* Configuration explanations */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Configuration Options</h4>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <div>
                      <span className="font-medium text-foreground">Top Price</span>
                      <span className="text-muted-foreground/80"> — The highest probability level for orders (default: 49%). Orders at this price receive the most allocation and are most likely to fill. Higher top prices mean safer bets with lower returns.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <div>
                      <span className="font-medium text-foreground">Bottom Price</span>
                      <span className="text-muted-foreground/80"> — The lowest probability level (default: 35%). Orders here receive minimal allocation but yield the highest profit if filled. Lower bottom prices increase potential returns but are less likely to fill.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <div>
                      <span className="font-medium text-foreground">Taper Factor</span>
                      <span className="text-muted-foreground/80"> — Controls how aggressively allocation decreases from top to bottom. Gentle (1.0) spreads more evenly, while aggressive (2.5) concentrates heavily at the top price. Higher taper = more conservative strategy.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <div>
                      <span className="font-medium text-foreground">Total Bankroll</span>
                      <span className="text-muted-foreground/80"> — Your total USD to distribute across all ladder rungs per market. Default minimum is $50 to cover all 15 price levels. With smaller bankrolls, the ladder automatically reduces rungs (e.g., $25 → ~8 rungs, $15 → ~5 rungs) to ensure each order has 5+ shares as required by Polymarket.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Card */}
          <div className="relative z-20 border border-border rounded-lg bg-card/80 backdrop-blur-sm border-glow">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-display">
                  BOT CONFIGURATION
                </span>
              </div>
              {isBotRunning && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-500 font-mono">RUNNING</span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Asset Selection Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="text-sm font-medium text-muted-foreground min-w-[120px]">
                  Market Type:
                </label>
                
                {/* Asset Dropdown */}
                <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => !isBotRunning && setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isBotRunning}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{selectedAssetData?.icon}</span>
                      <span className="font-mono">{selectedAssetData?.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden">
                      {ASSETS.map((asset) => (
                        <button
                          key={asset.value}
                          type="button"
                          onClick={() => {
                            setSelectedAsset(asset.value);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            selectedAsset === asset.value
                              ? "bg-primary/20 text-primary"
                              : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <span className="text-xl">{asset.icon}</span>
                          <span className="font-mono">{asset.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Max Price (Top of Ladder) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-medium text-muted-foreground min-w-[120px]">
                      Top Price:
                    </label>

                    <div className="relative flex-1 max-w-xs" ref={maxPriceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => !isBotRunning && setIsMaxPriceDropdownOpen(!isMaxPriceDropdownOpen)}
                        disabled={isBotRunning}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-primary rotate-180" />
                          <span className="font-mono">{ladderMaxPrice}% (Heavy allocation)</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMaxPriceDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isMaxPriceDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden">
                          {LADDER_MAX_PRICE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setLadderMaxPrice(option.value);
                                setIsMaxPriceDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                ladderMaxPrice === option.value
                                  ? "bg-primary/20 text-primary"
                                  : "hover:bg-secondary text-foreground"
                              }`}
                            >
                              <span className="font-mono">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Min Price (Bottom of Ladder) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-medium text-muted-foreground min-w-[120px]">
                      Bottom Price:
                    </label>

                    <div className="relative flex-1 max-w-xs" ref={minPriceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => !isBotRunning && setIsMinPriceDropdownOpen(!isMinPriceDropdownOpen)}
                        disabled={isBotRunning}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-primary" />
                          <span className="font-mono">{ladderMinPrice}% (Light allocation)</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMinPriceDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isMinPriceDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden">
                          {LADDER_MIN_PRICE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setLadderMinPrice(option.value);
                                setIsMinPriceDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                ladderMinPrice === option.value
                                  ? "bg-primary/20 text-primary"
                                  : "hover:bg-secondary text-foreground"
                              }`}
                            >
                              <span className="font-mono">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Taper Factor */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-medium text-muted-foreground min-w-[120px]">
                      Taper:
                    </label>

                    <div className="relative flex-1 max-w-xs" ref={taperDropdownRef}>
                      <button
                        type="button"
                        onClick={() => !isBotRunning && setIsTaperDropdownOpen(!isTaperDropdownOpen)}
                        disabled={isBotRunning}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="w-4 h-4 text-primary" />
                          <span className="font-mono">{TAPER_FACTOR_OPTIONS.find(o => o.value === taperFactor)?.label}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isTaperDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isTaperDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden">
                          {TAPER_FACTOR_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setTaperFactor(option.value);
                                setIsTaperDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                taperFactor === option.value
                                  ? "bg-primary/20 text-primary"
                                  : "hover:bg-secondary text-foreground"
                              }`}
                            >
                              <span className="font-mono">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

              {/* Order Size / Bankroll Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="text-sm font-medium text-muted-foreground min-w-[120px]">
                  Total Bankroll:
                </label>

                {/* Order Size Input */}
                <div className="relative flex-1 max-w-xs">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <input
                      type="number"
                      value={orderSize}
                      onChange={(e) => setOrderSize(Math.max(50, parseInt(e.target.value) || 50))}
                      disabled={isBotRunning}
                      min={50}
                      max="10000"
                      className="bg-transparent border-none outline-none font-mono w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-muted-foreground text-xs">
                      USD total (distributed)
                    </span>
                  </div>
                </div>
              </div>

              {/* Ladder Preview */}
              {ladderRungs.length > 0 && (
                <div className="border border-border/50 rounded-lg bg-secondary/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      LADDER PREVIEW ({ladderRungs.length} price levels, {ladderRungs.length * 2} orders total)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 text-xs font-mono">
                    {ladderRungs.map((rung, idx) => (
                      <div
                        key={rung.pricePercent}
                        className={`px-2 py-1 rounded ${
                          idx === 0 ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold">{rung.pricePercent}%</span>
                        <span className="text-muted-foreground/70 ml-1">
                          ${rung.sizeUsd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start/Stop Bot Button Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {!isBotRunning ? (
                  <button
                    type="button"
                    onClick={startBot}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 glow-box-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Bot</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopBot}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>Stop Bot</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="border border-destructive/50 rounded-lg bg-destructive/10 p-4 fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-destructive text-sm font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Position Dashboard - Shows when bot is running or has placed orders */}
          <PositionDashboard
            asset={selectedAsset}
            isActive={isBotRunning}
          />

          {/* Logs Output */}
          <div className="relative z-10 border border-border rounded-lg bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBotRunning ? 'bg-green-500' : 'bg-primary'} animate-pulse`} />
                <span className="text-xs text-muted-foreground font-display">
                  BOT LOGS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="h-[400px] overflow-y-auto p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <span>No logs yet. Start the bot to begin.</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-2 leading-relaxed">
                      <span className="text-muted-foreground/60 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`${getLogLevelStyle(log.level)} w-4`}>
                        {getLogLevelIcon(log.level)}
                      </span>
                      <span className={getLogLevelStyle(log.level)}>
                        {log.message}
                      </span>
                      {log.details && (
                        <span className="text-muted-foreground/60 text-xs">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingBotTerminalLadder;

