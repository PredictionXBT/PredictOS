"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Square,
  ChevronDown,
  Crosshair,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Target,
  Zap,
  Clock,
  DollarSign,
  Percent,
  Repeat,
} from "lucide-react";
import type { SupportedAsset } from "@/types/betting-bot";
import {
  DumpSniper,
  createDumpSniper,
  type SniperStatus,
  type SniperState,
  type DumpSniperConfig,
  type LegInfo,
} from "@/lib/dump-sniper";
import {
  getNextMarketTokenIds,
  getNext15MinTimestamp,
} from "@/lib/polymarket-api";

const ASSETS: { value: SupportedAsset; label: string; icon: string }[] = [
  { value: "BTC", label: "Bitcoin (BTC)", icon: "₿" },
  { value: "ETH", label: "Ethereum (ETH)", icon: "Ξ" },
  { value: "SOL", label: "Solana (SOL)", icon: "◎" },
  { value: "XRP", label: "Ripple (XRP)", icon: "✕" },
];

const SUM_TARGET_OPTIONS = [
  { value: 0.90, label: "90¢ (10% profit)" },
  { value: 0.92, label: "92¢ (8% profit)" },
  { value: 0.95, label: "95¢ (5% profit)" },
  { value: 0.97, label: "97¢ (3% profit)" },
];

const DUMP_THRESHOLD_OPTIONS = [
  { value: 0.10, label: "10% drop" },
  { value: 0.15, label: "15% drop (Recommended)" },
  { value: 0.20, label: "20% drop" },
  { value: 0.25, label: "25% drop" },
];

const WINDOW_OPTIONS = [
  { value: 2, label: "2 minutes" },
  { value: 3, label: "3 minutes" },
  { value: 4, label: "4 minutes" },
  { value: 5, label: "5 minutes" },
];

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
}

export default function DumpSniperTerminal() {
  // Asset selection
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>("BTC");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  // Sniper config
  const [usdPerLeg, setUsdPerLeg] = useState(5);
  const [sumTarget, setSumTarget] = useState(0.95);
  const [dumpThreshold, setDumpThreshold] = useState(0.15);
  const [windowMinutes, setWindowMinutes] = useState(2);
  const [autoRepeat, setAutoRepeat] = useState(false);

  // Dropdown states
  const [isSumDropdownOpen, setIsSumDropdownOpen] = useState(false);
  const [isDumpDropdownOpen, setIsDumpDropdownOpen] = useState(false);
  const [isWindowDropdownOpen, setIsWindowDropdownOpen] = useState(false);

  // Sniper state
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SniperStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Sniper instance
  const sniperRef = useRef<DumpSniper | null>(null);

  // Log container ref for auto-scroll
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs((prev) => [...prev.slice(-99), entry]);
  }, []);

  // Scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assetDropdownRef.current &&
        !assetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAssetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Place order via sniper-order API
  const placeOrder = useCallback(
    async (
      tokenId: string,
      price: number,
      orderShares: number,
      side: "BUY"
    ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
      addLog("INFO", `Placing order: ${side} ${orderShares} shares @ ${(price * 100).toFixed(1)}¢`);

      try {
        const response = await fetch("/api/sniper-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId,
            price,
            shares: orderShares,
            side: "BUY",
          }),
        });

        const data = await response.json();
        if (data.success) {
          addLog("SUCCESS", `Order placed: ${data.orderId || "confirmed"}`);
          return { success: true, orderId: data.orderId };
        } else {
          addLog("ERROR", `Order failed: ${data.error}`);
          return { success: false, error: data.error };
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        addLog("ERROR", `Order error: ${error}`);
        return { success: false, error };
      }
    },
    [addLog]
  );

  // Start sniper
  const startSniper = useCallback(async () => {
    setIsLoading(true);
    addLog("INFO", `Fetching market data for ${selectedAsset}...`);

    // Fetch actual token IDs from market
    let marketData;
    try {
      marketData = await getNextMarketTokenIds(selectedAsset);
    } catch (e) {
      addLog("ERROR", `Failed to fetch market data: ${e}`);
      setIsLoading(false);
      return;
    }

    if (!marketData) {
      addLog("ERROR", "Market not found - may not be created yet. Try again closer to the next 15-min mark.");
      setIsLoading(false);
      return;
    }

    const { tokenIds, marketSlug, marketEndTime } = marketData;
    addLog("SUCCESS", `Found market: ${marketSlug}`);
    addLog("INFO", `UP Token: ${tokenIds.up.slice(0, 16)}...`);
    addLog("INFO", `DOWN Token: ${tokenIds.down.slice(0, 16)}...`);

    const config: Partial<DumpSniperConfig> = {
      usdPerLeg,
      sumTarget,
      dumpThreshold,
      windowMinutes,
      dumpWindowSeconds: 3,
      autoRepeat,
    };

    const sniper = createDumpSniper(config);
    sniperRef.current = sniper;

    // Set callbacks
    sniper.setCallbacks({
      onStatusUpdate: (newStatus) => setStatus(newStatus),
      onDumpDetected: (side, dropPercent, price) => {
        addLog(
          "WARN",
          `🚨 DUMP DETECTED: ${side} dropped ${(dropPercent * 100).toFixed(1)}% to ${(price * 100).toFixed(1)}%`
        );
      },
      onLegFilled: (leg, info) => {
        const usdCost = (info.shares * info.price).toFixed(2);
        addLog(
          "SUCCESS",
          `✅ LEG ${leg} FILLED: ${info.side} @ ${(info.price * 100).toFixed(1)}¢ × ${info.shares} shares = $${usdCost}`
        );
      },
      onError: (error) => {
        addLog("ERROR", error);
      },
      onStopped: (reason) => {
        if (reason === "complete" && sniperRef.current) {
          const finalStatus = sniperRef.current.getStatus();
          if (finalStatus.profit && finalStatus.profitPercent) {
            addLog(
              "SUCCESS",
              `🎉 Sniper completed — Profit locked: +$${finalStatus.profit.toFixed(2)} (+${finalStatus.profitPercent.toFixed(1)}%)`
            );
          } else {
            addLog("SUCCESS", "🎉 Sniper completed — profit locked!");
          }
          // If auto-repeat is enabled, sniper will restart itself
          if (autoRepeat) {
            addLog("INFO", "🔄 Auto-repeat enabled — waiting for next round...");
          }
        } else if (reason === "expired") {
          addLog("INFO", "⏰ Watch window expired — no dump detected");
          // If auto-repeat is enabled, sniper will restart itself
          if (autoRepeat) {
            addLog("INFO", "🔄 Auto-repeat enabled — waiting for next round...");
          }
        } else {
          addLog("INFO", "Sniper stopped");
        }
        // Only fully stop if manual stop or auto-repeat is disabled
        if (reason === "manual" || !autoRepeat) {
          setIsRunning(false);
          sniperRef.current = null;
        }
      },
    });

    sniper.setPlaceOrderFn(placeOrder);

    // Get market timing
    const marketStart = getNext15MinTimestamp();

    addLog(
      "INFO",
      `🎯 Sniper started — ${selectedAsset} | $${usdPerLeg}/leg | Sum target: ${(sumTarget * 100).toFixed(0)}¢ | Dump: ${(dumpThreshold * 100).toFixed(0)}% | Window: ${windowMinutes}min${autoRepeat ? " | Auto-repeat: ON" : ""}`
    );
    addLog("INFO", `Watching for ${(dumpThreshold * 100).toFixed(0)}%+ dump in next ${windowMinutes} minutes...`);

    sniper.start(tokenIds.up, tokenIds.down, marketStart, marketEndTime);
    setIsRunning(true);
    setIsLoading(false);
  }, [usdPerLeg, sumTarget, dumpThreshold, windowMinutes, autoRepeat, selectedAsset, placeOrder, addLog]);

  // Stop sniper
  const stopSniper = useCallback(() => {
    if (sniperRef.current) {
      sniperRef.current.stop("manual");
      // Note: isRunning, ref, and log will be handled by onStopped callback
    }
  }, []);

  // Get state color
  const getStateColor = (state: SniperState) => {
    switch (state) {
      case "WATCHING":
        return "text-yellow-500";
      case "LEG1_FILLED":
        return "text-blue-500";
      case "COMPLETE":
        return "text-green-500";
      case "EXPIRED":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  // Get log level styling
  const getLogLevelStyle = (level: LogEntry["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "text-green-500";
      case "ERROR":
        return "text-red-500";
      case "WARN":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Dump Sniper</h2>
          <span className="text-xs text-muted-foreground ml-2">
            Catch dumps, lock profits
          </span>
        </div>
      </div>

      {/* Configuration */}
      <div className="p-4 space-y-4">
        {/* Row 1: Asset & Shares */}
        <div className="grid grid-cols-2 gap-4">
          {/* Asset Dropdown */}
          <div className="relative" ref={assetDropdownRef}>
            <label className="text-xs text-muted-foreground mb-1 block">
              Asset
            </label>
            <button
              onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
              disabled={isRunning}
              className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">
                  {ASSETS.find((a) => a.value === selectedAsset)?.icon}
                </span>
                <span>{selectedAsset}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {isAssetDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.value}
                    onClick={() => {
                      setSelectedAsset(asset.value);
                      setIsAssetDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                  >
                    <span className="text-lg">{asset.icon}</span>
                    <span>{asset.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* USD per Leg Input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              USD per leg
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                value={usdPerLeg}
                onChange={(e) => setUsdPerLeg(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isRunning}
                min={1}
                step={1}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md disabled:opacity-50"
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Shares calculated from price (min 5 required)
            </div>
          </div>
        </div>

        {/* Row 2: Sum Target & Dump Threshold */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sum Target */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">
              Sum Target (max pair cost)
            </label>
            <button
              onClick={() => setIsSumDropdownOpen(!isSumDropdownOpen)}
              disabled={isRunning}
              className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{(sumTarget * 100).toFixed(0)}¢</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {isSumDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                {SUM_TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSumTarget(opt.value);
                      setIsSumDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dump Threshold */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">
              Dump Trigger
            </label>
            <button
              onClick={() => setIsDumpDropdownOpen(!isDumpDropdownOpen)}
              disabled={isRunning}
              className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span>{(dumpThreshold * 100).toFixed(0)}%</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {isDumpDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                {DUMP_THRESHOLD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setDumpThreshold(opt.value);
                      setIsDumpDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Window Time & Auto-Repeat */}
        <div className="grid grid-cols-2 gap-4">
          {/* Window Time */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">
              Watch Window
            </label>
            <button
              onClick={() => setIsWindowDropdownOpen(!isWindowDropdownOpen)}
              disabled={isRunning}
              className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{windowMinutes} min</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {isWindowDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setWindowMinutes(opt.value);
                      setIsWindowDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-Repeat Toggle */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Auto-Repeat
            </label>
            <button
              onClick={() => setAutoRepeat(!autoRepeat)}
              disabled={isRunning}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-md transition-colors disabled:opacity-50 ${
                autoRepeat
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Repeat className={`h-4 w-4 ${autoRepeat ? "text-primary" : "text-muted-foreground"}`} />
                <span>{autoRepeat ? "ON" : "OFF"}</span>
              </span>
              <div className={`w-10 h-5 rounded-full transition-colors ${
                autoRepeat ? "bg-primary" : "bg-muted"
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                  autoRepeat ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                }`} />
              </div>
            </button>
            <div className="text-xs text-muted-foreground mt-1">
              Continue to next round after completion
            </div>
          </div>
        </div>

        {/* Status Display */}
        {status && isRunning && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            {/* Phase Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status.state === "WATCHING" ? "bg-yellow-500 animate-pulse" :
                status.state === "LEG1_FILLED" ? "bg-blue-500 animate-pulse" :
                status.state === "COMPLETE" ? "bg-green-500" :
                status.state === "EXPIRED" ? "bg-red-500" : "bg-gray-500"
              }`} />
              <span className={`text-sm font-semibold ${getStateColor(status.state)}`}>
                {status.state === "WATCHING" && status.timeUntilMarketStart > 0
                  ? "WAITING FOR MARKET"
                  : status.state === "WATCHING"
                  ? "WATCHING FOR DUMP"
                  : status.state === "LEG1_FILLED"
                  ? "WAITING FOR HEDGE"
                  : status.state === "COMPLETE"
                  ? "PROFIT LOCKED"
                  : status.state === "EXPIRED"
                  ? "NO DUMP DETECTED"
                  : status.state}
              </span>
            </div>

            {/* Timing Section */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {status.timeUntilMarketStart > 0 ? (
                <div className="bg-background/50 rounded p-2">
                  <div className="text-muted-foreground text-xs">Market starts in</div>
                  <div className="font-mono text-lg text-yellow-500">
                    {Math.floor(status.timeUntilMarketStart / 60)}:{String(Math.floor(status.timeUntilMarketStart % 60)).padStart(2, "0")}
                  </div>
                </div>
              ) : (
                <div className="bg-background/50 rounded p-2">
                  <div className="text-muted-foreground text-xs">Watch window left</div>
                  <div className="font-mono text-lg text-yellow-500">
                    {Math.floor(status.timeRemainingInWindow / 60)}:{String(Math.floor(status.timeRemainingInWindow % 60)).padStart(2, "0")}
                  </div>
                </div>
              )}
              <div className="bg-background/50 rounded p-2">
                <div className="text-muted-foreground text-xs">Looking for</div>
                <div className="font-mono text-lg">{(dumpThreshold * 100).toFixed(0)}% drop</div>
              </div>
            </div>

            {/* Live Prices */}
            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted-foreground mb-2">Live Prices</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/50 rounded p-2">
                  <div className="text-xs text-green-500">UP</div>
                  <div className="font-mono font-semibold">{(status.currentUpPrice * 100).toFixed(1)}¢</div>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <div className="text-xs text-red-500">DOWN</div>
                  <div className="font-mono font-semibold">{(status.currentDownPrice * 100).toFixed(1)}¢</div>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <div className="text-xs text-muted-foreground">SUM</div>
                  <div className={`font-mono font-semibold ${status.currentSum <= sumTarget ? "text-green-500" : ""}`}>
                    {(status.currentSum * 100).toFixed(1)}¢
                  </div>
                </div>
              </div>
            </div>

            {/* Leg Status */}
            {(status.leg1 || status.leg2) && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2">Trade Status</div>
                <div className="space-y-2">
                  {status.leg1 && (
                    <div className="bg-blue-500/10 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-500 font-semibold">Leg 1 (Bought dump)</span>
                        <span className="font-mono text-blue-500">
                          {status.leg1.side} @ {(status.leg1.price * 100).toFixed(1)}¢
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-muted-foreground">{status.leg1.shares} shares</span>
                        <span className="font-mono text-blue-400">
                          ${(status.leg1.shares * status.leg1.price).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  )}
                  {status.leg2 && (
                    <div className="bg-green-500/10 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-500 font-semibold">Leg 2 (Hedge)</span>
                        <span className="font-mono text-green-500">
                          {status.leg2.side} @ {(status.leg2.price * 100).toFixed(1)}¢
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-muted-foreground">{status.leg2.shares} shares</span>
                        <span className="font-mono text-green-400">
                          ${(status.leg2.shares * status.leg2.price).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profit Display */}
            {status.pairCost && status.profitPercent && status.profit && status.leg1 && (
              <div className="border-t border-border pt-3 bg-green-500/10 rounded p-3 -mx-1">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Cost</div>
                    <div className="font-mono text-lg">${(status.pairCost * status.leg1.shares).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">({(status.pairCost * 100).toFixed(1)}¢/pair × {status.leg1.shares})</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Payout</div>
                    <div className="font-mono text-lg">${status.leg1.shares.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">(${1}/share × {status.leg1.shares})</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-500">Profit Locked</div>
                    <div className="font-mono text-xl text-green-500 font-bold">
                      +${status.profit.toFixed(2)}
                    </div>
                    <div className="text-xs text-green-400">(+{status.profitPercent.toFixed(1)}%)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start/Stop Button */}
        <button
          onClick={isRunning ? stopSniper : startSniper}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Fetching Market...
            </>
          ) : isRunning ? (
            <>
              <Square className="h-5 w-5" />
              Stop Sniper
            </>
          ) : (
            <>
              <Crosshair className="h-5 w-5" />
              Start Sniper
            </>
          )}
        </button>

        {/* Strategy Explanation */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
          <p className="font-semibold mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Watches for {(dumpThreshold * 100).toFixed(0)}%+ price drop in 3 seconds</li>
            <li>Buys the dumped side immediately (Leg 1)</li>
            <li>Waits for opposite side to drop so Leg1 + Leg2 ≤ {(sumTarget * 100).toFixed(0)}¢</li>
            <li>Buys opposite side (Leg 2) to lock in profit</li>
          </ol>
        </div>
      </div>

      {/* Logs */}
      <div className="border-t border-border">
        <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
          <Zap className="h-3 w-3" />
          Activity Log
        </div>
        <div
          ref={logContainerRef}
          className="h-48 overflow-y-auto p-2 font-mono text-xs bg-black/50"
        >
          {logs.length === 0 ? (
            <div className="text-muted-foreground p-2">
              Waiting for sniper to start...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="py-0.5">
                <span className="text-muted-foreground">[{log.timestamp}]</span>{" "}
                <span className={getLogLevelStyle(log.level)}>[{log.level}]</span>{" "}
                <span className="text-foreground">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
