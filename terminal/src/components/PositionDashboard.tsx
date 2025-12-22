"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Shield, AlertTriangle, Loader2, DollarSign } from "lucide-react";
import type { SupportedAsset } from "@/types/betting-bot";
import type { MarketPosition, PositionTrackerResponse, PairStatus } from "@/types/position-tracker";

interface PositionDashboardProps {
  asset: SupportedAsset;
  isActive: boolean;
  onPositionUpdate?: (position: MarketPosition | null) => void;
}

const STATUS_CONFIG: Record<PairStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  PROFIT_LOCKED: {
    label: "PROFIT LOCKED",
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/50",
    icon: <Shield className="w-5 h-5" />,
  },
  BREAK_EVEN: {
    label: "BREAK EVEN",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/50",
    icon: <DollarSign className="w-5 h-5" />,
  },
  LOSS_RISK: {
    label: "LOSS RISK",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/50",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  DIRECTIONAL_YES: {
    label: "DIRECTIONAL (YES only)",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/50",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  DIRECTIONAL_NO: {
    label: "DIRECTIONAL (NO only)",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/50",
    icon: <TrendingDown className="w-5 h-5" />,
  },
  PENDING: {
    label: "PENDING FILLS",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/50",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
  },
  NO_POSITION: {
    label: "NO POSITION",
    color: "text-muted-foreground",
    bgColor: "bg-secondary/50 border-border",
    icon: <DollarSign className="w-5 h-5" />,
  },
};

const POLL_INTERVAL_MS = 10000; // 10 seconds

export const PositionDashboard: React.FC<PositionDashboardProps> = ({
  asset,
  isActive,
  onPositionUpdate,
}) => {
  const [position, setPosition] = useState<MarketPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/position-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset }),
      });

      const data: PositionTrackerResponse = await response.json();

      if (data.success && data.data) {
        setPosition(data.data.position);
        setLastUpdated(new Date());
        onPositionUpdate?.(data.data.position);
      } else {
        setError(data.error || "Failed to fetch position");
        setPosition(null);
        onPositionUpdate?.(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setError(errorMsg);
      setPosition(null);
      onPositionUpdate?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [asset, onPositionUpdate]);

  // Fetch position on mount and when active
  useEffect(() => {
    if (isActive) {
      fetchPosition();

      // Set up polling
      const interval = setInterval(fetchPosition, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [isActive, fetchPosition]);

  const statusConfig = position ? STATUS_CONFIG[position.status] : STATUS_CONFIG.NO_POSITION;

  return (
    <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Position Status</span>
        </div>
        <button
          onClick={fetchPosition}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status Banner */}
      <div className={`px-4 py-3 border-b border-border ${statusConfig.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={statusConfig.color}>{statusConfig.icon}</span>
            <span className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
          </div>
          {position?.pairCost !== null && position?.pairCost !== undefined && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Pair Cost: </span>
              <span className={`font-mono font-bold ${position.pairCost < 1 ? "text-green-400" : position.pairCost > 1 ? "text-red-400" : "text-yellow-400"}`}>
                ${position.pairCost.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Position Details */}
      {position && position.status !== "NO_POSITION" && (
        <div className="p-4 space-y-4">
          {/* YES Position */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">YES (Up)</span>
            </div>
            <div className="text-right font-mono text-sm">
              {position.yes.shares > 0 ? (
                <>
                  <span className="text-foreground">{position.yes.shares.toFixed(0)} shares</span>
                  <span className="text-muted-foreground"> @ </span>
                  <span className="text-primary">${position.yes.avgPrice.toFixed(4)}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="text-foreground">${position.yes.costUsd.toFixed(2)}</span>
                </>
              ) : position.yes.pendingShares > 0 ? (
                <span className="text-blue-400">{position.yes.pendingShares.toFixed(0)} pending</span>
              ) : (
                <span className="text-muted-foreground">No position</span>
              )}
            </div>
          </div>

          {/* NO Position */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">NO (Down)</span>
            </div>
            <div className="text-right font-mono text-sm">
              {position.no.shares > 0 ? (
                <>
                  <span className="text-foreground">{position.no.shares.toFixed(0)} shares</span>
                  <span className="text-muted-foreground"> @ </span>
                  <span className="text-primary">${position.no.avgPrice.toFixed(4)}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="text-foreground">${position.no.costUsd.toFixed(2)}</span>
                </>
              ) : position.no.pendingShares > 0 ? (
                <span className="text-blue-400">{position.no.pendingShares.toFixed(0)} pending</span>
              ) : (
                <span className="text-muted-foreground">No position</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Profit Metrics (only when both sides have shares) */}
          {position.yes.shares > 0 && position.no.shares > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Matched Pairs:</span>
                <span className="font-mono text-foreground">{position.minShares.toFixed(0)} shares</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Guaranteed Payout:</span>
                <span className="font-mono text-foreground">${position.guaranteedPayout.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-mono text-foreground">${position.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className={position.guaranteedProfit >= 0 ? "text-green-400" : "text-red-400"}>
                  {position.guaranteedProfit >= 0 ? "Guaranteed Profit:" : "Expected Loss:"}
                </span>
                <span className={`font-mono ${position.guaranteedProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${Math.abs(position.guaranteedProfit).toFixed(2)} ({position.returnPercent >= 0 ? "+" : ""}{position.returnPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {/* Directional Warning */}
          {(position.status === "DIRECTIONAL_YES" || position.status === "DIRECTIONAL_NO") && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />
                <div className="text-xs text-orange-200">
                  <p className="font-medium">Directional Risk</p>
                  <p className="text-orange-300/70 mt-1">
                    Only one side has filled. Profit is not guaranteed until both YES and NO orders fill.
                    The market outcome will determine your profit or loss.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Position State */}
      {(!position || position.status === "NO_POSITION") && !isLoading && !error && (
        <div className="p-6 text-center">
          <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active positions for {asset}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Place orders to see position tracking
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <div className="text-xs text-red-200">
                <p className="font-medium">Error fetching position</p>
                <p className="text-red-300/70 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !position && (
        <div className="p-6 text-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Fetching position data...</p>
        </div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div className="px-4 py-2 border-t border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default PositionDashboard;

