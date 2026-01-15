"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Activity,
  Zap,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface LearnedPattern {
  id: string;
  pattern_type: string;
  conditions_json: Record<string, unknown>;
  fill_rate_percent: number;
  avg_fill_time_ms?: number;
  sample_size: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  last_observed: string;
  is_active: boolean;
}

interface AIAccuracy {
  overall: number;
  by_decision: Record<string, { correct: number; total: number; accuracy: number }>;
  by_model: Record<string, { correct: number; total: number; accuracy: number }>;
  recent_trend: number;
}

interface TradeRecord {
  id: string;
  created_at: string;
  market_slug: string;
  leg1_price: number;
  leg2_price: number;
  leg1_size: number;
  leg2_size: number;
  outcome: string;
  profit_loss_usdc?: number;
  ai_prediction_correct?: boolean;
  leg1_fill_time_ms?: number;
  leg2_fill_time_ms?: number;
}

interface ConfidenceCalibration {
  suggested_adjustment: number;
  reason: string;
  historical_accuracy: number;
  sample_size: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatPatternType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatConditions(conditions: Record<string, unknown>): string {
  return Object.entries(conditions)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
    .join(", ");
}

function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case "both_filled":
      return "text-success";
    case "leg1_only":
    case "leg2_only":
      return "text-warning";
    case "unwound":
      return "text-primary";
    case "neither":
      return "text-danger";
    default:
      return "text-muted-foreground";
  }
}

function getOutcomeIcon(outcome: string) {
  switch (outcome) {
    case "both_filled":
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case "leg1_only":
    case "leg2_only":
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case "unwound":
      return <RefreshCw className="w-4 h-4 text-primary" />;
    case "neither":
      return <XCircle className="w-4 h-4 text-danger" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// =============================================================================
// Component
// =============================================================================

const LearningArbitragePanel = () => {
  // State
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [accuracy, setAccuracy] = useState<AIAccuracy | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [calibration, setCalibration] = useState<ConfidenceCalibration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    patterns: true,
    accuracy: true,
    calibration: true,
    trades: true,
  });

  // Fetch all data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch all data in parallel
      const [patternsRes, accuracyRes, tradesRes, calibrationRes] = await Promise.all([
        fetch("/api/ai-arbitrage-learner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_patterns", data: { min_sample_size: 5 } }),
        }),
        fetch("/api/ai-arbitrage-learner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_ai_accuracy" }),
        }),
        fetch("/api/ai-arbitrage-learner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_trade_history", data: { limit: 50 } }),
        }),
        fetch("/api/ai-arbitrage-learner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "calibrate_confidence" }),
        }),
      ]);

      const [patternsData, accuracyData, tradesData, calibrationData] = await Promise.all([
        patternsRes.json(),
        accuracyRes.json(),
        tradesRes.json(),
        calibrationRes.json(),
      ]);

      if (patternsData.success) setPatterns(patternsData.patterns || []);
      if (accuracyData.success) setAccuracy(accuracyData.accuracy || null);
      if (tradesData.success) setTrades(tradesData.trades || []);
      if (calibrationData.success) setCalibration(calibrationData.calibration || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract patterns
  const handleExtractPatterns = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/ai-arbitrage-learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extract_patterns" }),
      });
      await fetchData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract patterns");
      setIsRefreshing(false);
    }
  };

  // Calculate stats
  const totalTrades = trades.length;
  const successfulTrades = trades.filter((t) => t.outcome === "both_filled").length;
  const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit_loss_usdc || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading learning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">
                  Learning Arbitrage
                </h1>
                <p className="text-sm text-muted-foreground">
                  Self-learning AI arbitrage system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExtractPatterns}
                disabled={isRefreshing}
                className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Extract Patterns
              </button>
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl terminal-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase">Total Trades</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalTrades}</div>
          </div>

          <div className="bg-card rounded-xl terminal-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground uppercase">Success Rate</span>
            </div>
            <div className="text-2xl font-bold text-success">{successRate.toFixed(1)}%</div>
          </div>

          <div className="bg-card rounded-xl terminal-border p-4">
            <div className="flex items-center gap-2 mb-2">
              {totalProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger" />
              )}
              <span className="text-xs text-muted-foreground uppercase">Total P/L</span>
            </div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
              {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
            </div>
          </div>

          <div className="bg-card rounded-xl terminal-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase">Patterns</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{patterns.length}</div>
          </div>
        </div>

        {/* Confidence Calibration */}
        <div className="bg-card rounded-xl terminal-border mb-6">
          <button
            onClick={() => toggleSection("calibration")}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Confidence Calibration</h2>
            </div>
            {expandedSections.calibration ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {expandedSections.calibration && calibration && (
            <div className="px-6 pb-6">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Adjustment</div>
                  <div className={`text-xl font-bold ${
                    calibration.suggested_adjustment > 0 ? "text-success" :
                    calibration.suggested_adjustment < 0 ? "text-danger" : "text-foreground"
                  }`}>
                    {calibration.suggested_adjustment > 0 ? "+" : ""}
                    {(calibration.suggested_adjustment * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Historical Accuracy</div>
                  <div className="text-xl font-bold text-foreground">
                    {calibration.historical_accuracy.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Sample Size</div>
                  <div className="text-xl font-bold text-foreground">
                    {calibration.sample_size}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{calibration.reason}</p>
            </div>
          )}
        </div>

        {/* AI Accuracy */}
        <div className="bg-card rounded-xl terminal-border mb-6">
          <button
            onClick={() => toggleSection("accuracy")}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">AI Accuracy</h2>
            </div>
            {expandedSections.accuracy ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {expandedSections.accuracy && accuracy && (
            <div className="px-6 pb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Overall Stats */}
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h3 className="text-sm font-mono text-primary uppercase mb-4">Overall Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Overall Accuracy</div>
                      <div className="text-2xl font-bold text-foreground">{accuracy.overall.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Recent Trend (50)</div>
                      <div className={`text-2xl font-bold ${
                        accuracy.recent_trend >= accuracy.overall ? "text-success" : "text-warning"
                      }`}>
                        {accuracy.recent_trend.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* By Decision Type */}
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h3 className="text-sm font-mono text-primary uppercase mb-4">By Decision Type</h3>
                  <div className="space-y-2">
                    {Object.entries(accuracy.by_decision).map(([decision, stats]) => (
                      <div key={decision} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{decision}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">
                            {stats.correct}/{stats.total}
                          </span>
                          <span className={`text-sm font-medium ${
                            stats.accuracy >= 70 ? "text-success" :
                            stats.accuracy >= 50 ? "text-warning" : "text-danger"
                          }`}>
                            ({stats.accuracy.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* By Model */}
              {Object.keys(accuracy.by_model).length > 0 && (
                <div className="mt-4 bg-secondary/30 rounded-lg p-4">
                  <h3 className="text-sm font-mono text-primary uppercase mb-4">By Model</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(accuracy.by_model).map(([model, stats]) => (
                      <div key={model} className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-xs text-muted-foreground truncate mr-2">{model}</span>
                        <span className={`text-sm font-medium ${
                          stats.accuracy >= 70 ? "text-success" :
                          stats.accuracy >= 50 ? "text-warning" : "text-danger"
                        }`}>
                          {stats.accuracy.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Learned Patterns */}
        <div className="bg-card rounded-xl terminal-border mb-6">
          <button
            onClick={() => toggleSection("patterns")}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Learned Patterns</h2>
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {patterns.length}
              </span>
            </div>
            {expandedSections.patterns ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {expandedSections.patterns && (
            <div className="px-6 pb-6">
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No patterns learned yet. Execute some trades to start learning!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {patterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className="bg-secondary/30 rounded-lg p-4 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {formatPatternType(pattern.pattern_type)}
                        </span>
                        <span className={`text-sm font-bold ${
                          pattern.fill_rate_percent >= 70 ? "text-success" :
                          pattern.fill_rate_percent >= 50 ? "text-warning" : "text-danger"
                        }`}>
                          {pattern.fill_rate_percent.toFixed(1)}%
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        {formatConditions(pattern.conditions_json)}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          n={pattern.sample_size}
                        </span>
                        {pattern.avg_fill_time_ms && (
                          <span className="text-muted-foreground">
                            avg: {pattern.avg_fill_time_ms}ms
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {formatTimeAgo(pattern.last_observed)}
                        </span>
                      </div>

                      {pattern.confidence_interval_lower !== undefined && (
                        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pattern.fill_rate_percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trade History */}
        <div className="bg-card rounded-xl terminal-border">
          <button
            onClick={() => toggleSection("trades")}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Trade History</h2>
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {trades.length}
              </span>
            </div>
            {expandedSections.trades ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {expandedSections.trades && (
            <div className="px-6 pb-6">
              {trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No trades recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground uppercase border-b border-border/50">
                        <th className="text-left py-3 pr-4">Time</th>
                        <th className="text-left py-3 pr-4">Market</th>
                        <th className="text-right py-3 pr-4">Prices</th>
                        <th className="text-center py-3 pr-4">Outcome</th>
                        <th className="text-right py-3 pr-4">P/L</th>
                        <th className="text-center py-3">AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => (
                        <tr key={trade.id} className="border-b border-border/30 hover:bg-secondary/20">
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {formatTimeAgo(trade.created_at)}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm text-foreground truncate block max-w-[200px]">
                              {trade.market_slug}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="text-xs font-mono text-muted-foreground">
                              {(trade.leg1_price * 100).toFixed(0)}% + {(trade.leg2_price * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getOutcomeIcon(trade.outcome)}
                              <span className={`text-xs ${getOutcomeColor(trade.outcome)}`}>
                                {trade.outcome.replace(/_/g, " ")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {trade.profit_loss_usdc !== undefined && trade.profit_loss_usdc !== null ? (
                              <span className={`text-sm font-medium ${
                                trade.profit_loss_usdc >= 0 ? "text-success" : "text-danger"
                              }`}>
                                {trade.profit_loss_usdc >= 0 ? "+" : ""}
                                ${trade.profit_loss_usdc.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            {trade.ai_prediction_correct !== undefined && trade.ai_prediction_correct !== null ? (
                              trade.ai_prediction_correct ? (
                                <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                              ) : (
                                <XCircle className="w-4 h-4 text-danger mx-auto" />
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LearningArbitragePanel;
