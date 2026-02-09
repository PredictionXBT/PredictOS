"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bell,
  Hash,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  ExternalLink,
  Play,
  Square,
  Zap,
  TrendingUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TgeMessage {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface TradeResult {
  success: boolean;
  orderId?: string;
  status?: string;
  side: string;
  price: number;
  size: number;
  costUsd: number;
  marketSlug: string;
  marketTitle: string;
  error?: string;
}

interface ToolDiscovery {
  name: string;
  resourceUrl: string;
  priceUsdc: string;
  networks: string[];
  marketDataFromX402?: boolean;
}

interface TgeResponse {
  detected: boolean;
  project?: string;
  keywords?: string[];
  confidence?: number;
  message?: TgeMessage;
  status_message?: string;
  recommendation?: string;
  reasoning?: string;
  checked_messages?: number;
  tool_discovery?: ToolDiscovery | null;
  x402_market_results?: Array<Record<string, unknown>>;
  trade?: TradeResult;
  processingTimeMs?: number;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CHANNEL_ID = "1072952844161916938";
const POLL_INTERVALS = [
  { label: "10s", value: 10_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
];

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

// ─── Component ──────────────────────────────────────────────────────────────

const TgeMonitorTerminal = () => {
  // Inputs
  const [channelId, setChannelId] = useState(DEFAULT_CHANNEL_ID);
  const [marketSlug, setMarketSlug] = useState("");
  const [tradeSide, setTradeSide] = useState<"YES" | "NO">("YES");
  const [budgetUsdc, setBudgetUsdc] = useState("5");
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [minConfidence, setMinConfidence] = useState("0.6");

  // Polling
  const [monitoring, setMonitoring] = useState(false);
  const [pollInterval, setPollInterval] = useState(30_000);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TgeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; detected: boolean; project?: string; trade?: TradeResult }>>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const runCheck = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        channelId,
        checkLatest: false,
        limit: 10,
      };

      if (marketSlug) payload.marketSlug = marketSlug;

      if (autoTradeEnabled && marketSlug) {
        payload.autoTrade = {
          enabled: true,
          side: tradeSide,
          budgetUsdc: parseFloat(budgetUsdc) || 5,
          minConfidence: parseFloat(minConfidence) || 0.6,
        };
      }

      const response = await fetch("/api/tge-discord-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: TgeResponse = await response.json();
      if (!response.ok) setError(data.error || "Request failed");
      setResult(data);

      // Add to history
      setHistory((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          detected: data.detected,
          project: data.project,
          trade: data.trade,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check channel");
    } finally {
      setLoading(false);
    }
  }, [channelId, marketSlug, autoTradeEnabled, tradeSide, budgetUsdc, minConfidence]);

  const toggleMonitoring = useCallback(() => {
    if (monitoring) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setMonitoring(false);
    } else {
      setMonitoring(true);
      runCheck(); // Immediate first check
      pollRef.current = setInterval(runCheck, pollInterval);
    }
  }, [monitoring, pollInterval, runCheck]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">
                  TGE Discord Agent
                </h1>
                <p className="text-sm text-muted-foreground">
                  Autonomous TGE detection → x402 discovery → Polymarket trading
                </p>
              </div>
            </div>
            {monitoring && (
              <span className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-success/20 text-success border border-success/30">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                MONITORING
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ─── Config Panel ────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl terminal-border p-6 space-y-4">
          {/* Row 1: Channel + Market */}
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Discord Channel ID
              </label>
              <div className="relative mt-2">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder={DEFAULT_CHANNEL_ID}
                  className="w-full h-[46px] pl-10 pr-4 bg-secondary rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Polymarket Market Slug
              </label>
              <div className="relative mt-2">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={marketSlug}
                  onChange={(e) => setMarketSlug(e.target.value)}
                  placeholder="e.g. will-x-launch-tge-2025"
                  className="w-full h-[46px] pl-10 pr-4 bg-secondary rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Auto-trade config */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 pt-2 border-t border-border/30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoTradeEnabled ? "bg-success" : "bg-secondary border border-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    autoTradeEnabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs font-mono text-muted-foreground uppercase">
                Auto-Trade
              </span>
            </div>

            {autoTradeEnabled && (
              <>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Side
                  </label>
                  <div className="flex gap-1 mt-2">
                    {(["YES", "NO"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setTradeSide(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          tradeSide === s
                            ? s === "YES"
                              ? "bg-success/20 text-success border border-success/50"
                              : "bg-destructive/20 text-destructive border border-destructive/50"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Budget (USDC)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={budgetUsdc}
                    onChange={(e) => setBudgetUsdc(e.target.value)}
                    className="mt-2 w-24 h-[46px] px-3 bg-secondary rounded-lg border border-border focus:border-primary text-foreground text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Min Confidence
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(e.target.value)}
                    className="mt-2 w-20 h-[46px] px-3 bg-secondary rounded-lg border border-border focus:border-primary text-foreground text-center"
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 3: Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-3 pt-2 border-t border-border/30">
            <button
              onClick={runCheck}
              disabled={loading || !channelId}
              className="h-[46px] px-6 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-box-hover"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check Now
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <select
                value={pollInterval}
                onChange={(e) => setPollInterval(Number(e.target.value))}
                className="h-[46px] px-3 bg-secondary rounded-lg border border-border text-foreground text-sm"
              >
                {POLL_INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>
                    Every {i.label}
                  </option>
                ))}
              </select>
              <button
                onClick={toggleMonitoring}
                disabled={!channelId}
                className={`h-[46px] px-5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  monitoring
                    ? "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30"
                    : "bg-success/20 text-success border border-success/50 hover:bg-success/30"
                }`}
              >
                {monitoring ? (
                  <>
                    <Square className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Auto-Monitor
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-destructive mb-1">Error</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Results ─────────────────────────────────────────────────── */}
        {result && (
          <div className="bg-card rounded-xl terminal-border p-6 space-y-6">
            {/* Detection header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.detected ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {result.detected ? "TGE Detected" : "No TGE Detected"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Checked {result.checked_messages ?? 0} message(s)
                    {result.processingTimeMs != null && ` in ${result.processingTimeMs}ms`}
                  </p>
                </div>
              </div>
              {result.confidence != null && (
                <span className="text-xs font-mono px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30">
                  {Math.round(result.confidence * 100)}%
                </span>
              )}
            </div>

            {result.detected && (
              <div className="space-y-4">
                {/* Project + Keywords */}
                {result.project && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <span className="px-2 py-1 rounded bg-secondary text-foreground font-mono">
                      {result.project}
                    </span>
                  </div>
                )}

                {result.keywords && result.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-1 rounded bg-secondary/70 text-xs font-mono text-foreground">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Discord message */}
                {result.message && (
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-2">Signal</div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {result.message.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {result.message.author} — {formatTimestamp(result.message.timestamp)}
                    </p>
                  </div>
                )}

                {/* Recommendation */}
                {result.recommendation && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                      <TrendingUp className="w-4 h-4" />
                      {result.recommendation}
                    </div>
                    {result.reasoning && (
                      <p className="text-xs text-success/80 mt-1">{result.reasoning}</p>
                    )}
                  </div>
                )}

                {/* ─── Trade Execution Result ───────────────────────────── */}
                {result.trade && (
                  <div
                    className={`rounded-lg p-4 border ${
                      result.trade.success
                        ? "bg-success/10 border-success/30"
                        : "bg-destructive/10 border-destructive/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className={`w-4 h-4 ${result.trade.success ? "text-success" : "text-destructive"}`} />
                      <span className={`text-sm font-semibold ${result.trade.success ? "text-success" : "text-destructive"}`}>
                        {result.trade.success ? "Trade Executed" : "Trade Failed"}
                      </span>
                    </div>
                    {result.trade.success ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Side</div>
                          <div className="font-mono text-foreground">{result.trade.side}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Price</div>
                          <div className="font-mono text-foreground">{(result.trade.price * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Shares</div>
                          <div className="font-mono text-foreground">{result.trade.size}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cost</div>
                          <div className="font-mono text-foreground">${result.trade.costUsd.toFixed(2)}</div>
                        </div>
                        {result.trade.orderId && (
                          <div className="col-span-2">
                            <div className="text-muted-foreground">Order ID</div>
                            <div className="font-mono text-foreground truncate">{result.trade.orderId}</div>
                          </div>
                        )}
                        {result.trade.marketTitle && (
                          <div className="col-span-2">
                            <div className="text-muted-foreground">Market</div>
                            <div className="font-mono text-foreground">{result.trade.marketTitle}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-destructive/80">{result.trade.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!result.detected && (
              <p className="text-sm text-muted-foreground">
                {result.status_message || "No TGE announcements found."}
              </p>
            )}

            {/* ─── x402 Tool Discovery ─────────────────────────────────── */}
            {result.tool_discovery && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-2">x402 Tool Discovery</div>
                <div className="text-sm text-foreground font-semibold">{result.tool_discovery.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{result.tool_discovery.resourceUrl}</div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  <span>Price: {result.tool_discovery.priceUsdc}</span>
                  <span>Networks: {result.tool_discovery.networks.join(", ")}</span>
                  {result.tool_discovery.marketDataFromX402 && (
                    <span className="text-success">Market data fetched via x402</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── History log ─────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="bg-card rounded-xl terminal-border p-6">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Monitoring Log
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {history.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-mono py-1">
                  <span className="text-muted-foreground w-20 shrink-0">{entry.time}</span>
                  <span className={entry.detected ? "text-success" : "text-muted-foreground"}>
                    {entry.detected ? "TGE" : "---"}
                  </span>
                  {entry.project && <span className="text-foreground">{entry.project}</span>}
                  {entry.trade && (
                    <span className={entry.trade.success ? "text-success" : "text-destructive"}>
                      {entry.trade.success
                        ? `TRADED ${entry.trade.side} $${entry.trade.costUsd}`
                        : `TRADE FAILED`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Empty state ─────────────────────────────────────────────── */}
        {!loading && !result && history.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Configure a channel and market slug, then start monitoring.</p>
            <p className="text-xs mt-2">
              Enable Auto-Trade to execute orders when TGE is detected.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TgeMonitorTerminal;
