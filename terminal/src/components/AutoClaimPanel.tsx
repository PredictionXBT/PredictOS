"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  Power,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { BotLogEntry } from "@/types/betting-bot";
import { cn } from "@/lib/utils";

interface ClaimResult {
  conditionId: string;
  marketSlug: string;
  outcome: string;
  size: number;
  txHash?: string;
  error?: string;
}

interface WalletBalance {
  usdc: number;
  matic: number;
}

interface AutoClaimResponse {
  success: boolean;
  message?: string;
  claims: ClaimResult[];
  balance?: WalletBalance | null;
  error?: string;
  logs: BotLogEntry[];
}

const INTERVAL_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
];

interface AutoClaimPanelProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
}

/**
 * AutoClaimPanel for Sidebar
 * Protocol-wide auto-claim for all wallet positions
 */
export const AutoClaimPanel: React.FC<AutoClaimPanelProps> = ({ collapsed = false }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [intervalMins, setIntervalMins] = useState(15);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [recentClaims, setRecentClaims] = useState<ClaimResult[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [successNotification, setSuccessNotification] = useState<{
    count: number;
    totalSize: number;
  } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("autoClaimSettings");
    if (saved) {
      try {
        const { enabled, interval, claims } = JSON.parse(saved);
        setIsEnabled(enabled || false);
        setIntervalMins(interval || 15);
        setRecentClaims(claims || []);
      } catch {
        // Ignore parse errors
      }
    }
    // Mark as initialized after loading
    setIsInitialized(true);
  }, []);

  // Save state to localStorage (only after initial load)
  useEffect(() => {
    if (!isInitialized) return; // Don't save until we've loaded

    localStorage.setItem("autoClaimSettings", JSON.stringify({
      enabled: isEnabled,
      interval: intervalMins,
      claims: recentClaims.slice(0, 20),
    }));
  }, [isEnabled, intervalMins, recentClaims, isInitialized]);

  // Use ref to track if currently checking (to avoid re-renders triggering loops)
  const isCheckingRef = useRef(false);

  // Check for claims
  const checkForClaims = useCallback(async () => {
    // Use ref to prevent double-calls
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/auto-claim", { method: "POST" });
      const data: AutoClaimResponse = await response.json();

      setLastCheck(new Date());

      // Update balance if provided
      if (data.balance) {
        setBalance(data.balance);
      }

      if (!data.success) {
        setError(data.error || "Check failed");
        return;
      }

      const newClaims = data.claims.filter(c => c.txHash);
      if (newClaims.length > 0) {
        setRecentClaims(prev => [...newClaims, ...prev].slice(0, 20));

        // Show success notification
        const totalSize = newClaims.reduce((sum, c) => sum + c.size, 0);
        setSuccessNotification({ count: newClaims.length, totalSize });

        // Clear any existing timeout
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        // Auto-hide after 5 seconds
        notificationTimeoutRef.current = setTimeout(() => {
          setSuccessNotification(null);
        }, 5000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, []); // No dependencies - stable function

  // Handle toggle - just toggles state, no immediate check
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEnabled(!isEnabled);
  };

  // Setup/teardown interval (only after initialized)
  useEffect(() => {
    if (!isInitialized) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isEnabled) {
      // Just set up the interval - no immediate check
      // User can click "Check Now" if they want immediate
      intervalRef.current = setInterval(checkForClaims, intervalMins * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, intervalMins, isInitialized, checkForClaims]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIntervalDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Collapsed view - just icon + toggle
  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <button
          onClick={handleToggle}
          className={cn(
            "w-full flex items-center justify-center p-2 rounded-lg transition-all",
            isEnabled
              ? "bg-primary/20 border border-primary/50"
              : "bg-secondary/50 border border-border/50 hover:bg-secondary"
          )}
          title={isEnabled ? "Auto-Claim Active" : "Auto-Claim Disabled"}
        >
          {isChecking ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Zap className={cn("w-5 h-5", isEnabled ? "text-primary" : "text-muted-foreground")} />
          )}
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="px-2 py-2 relative">
      {/* Success Notification */}
      {successNotification && (
        <div
          className="absolute -top-1 left-2 right-2 z-50 animate-in slide-in-from-top-2 fade-in duration-300"
          onClick={() => setSuccessNotification(null)}
        >
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 backdrop-blur-sm cursor-pointer hover:bg-green-500/30 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/30 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-medium text-green-400">
                  Claimed {successNotification.count} position{successNotification.count > 1 ? "s" : ""}!
                </div>
                <div className="text-[10px] text-green-400/70">
                  ~${successNotification.totalSize.toFixed(2)} USDC
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-green-400/50" />
            </div>
          </div>
        </div>
      )}

      <div className="border border-border/50 rounded-lg bg-secondary/30 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs font-medium">Auto-Claim</span>
            {isEnabled && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle */}
            <button
              onClick={handleToggle}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                isEnabled ? "bg-primary" : "bg-secondary border border-border"
              )}
            >
              {isChecking ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                    isEnabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              )}
            </button>

            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
            {/* Interval Selector */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Interval:</span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEnabled) setShowIntervalDropdown(!showIntervalDropdown);
                  }}
                  disabled={isEnabled}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-[10px] disabled:opacity-50"
                >
                  <Clock className="w-2.5 h-2.5" />
                  {INTERVAL_OPTIONS.find(o => o.value === intervalMins)?.label}
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>

                {showIntervalDropdown && !isEnabled && (
                  <div className="fixed z-[100] bg-card border border-border rounded-lg shadow-xl min-w-[100px]"
                    style={{
                      top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().top - 140 : 0,
                      left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
                    }}
                  >
                    {INTERVAL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIntervalMins(option.value);
                          setShowIntervalDropdown(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg",
                          option.value === intervalMins && "text-primary bg-primary/10"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Balance */}
            {balance && (
              <div className="flex items-center justify-between text-[10px] bg-secondary/50 rounded px-2 py-1.5">
                <span className="text-muted-foreground">Balance:</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-medium">${balance.usdc.toFixed(2)}</span>
                  <span className="text-muted-foreground/60">|</span>
                  <span className="text-purple-400 font-medium">{balance.matic.toFixed(4)} POL</span>
                </div>
              </div>
            )}

            {isEnabled && (
              <>
                {/* Status */}
                {lastCheck && (
                  <div className="text-[10px] text-muted-foreground">
                    Last: {lastCheck.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}

                {/* Check Now */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkForClaims();
                  }}
                  disabled={isChecking}
                  className="w-full py-1.5 bg-secondary hover:bg-secondary/80 rounded text-[10px] disabled:opacity-50 transition-colors"
                >
                  {isChecking ? "Checking..." : "Check Now"}
                </button>

                {/* Recent Claims */}
                {recentClaims.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Recent</span>
                    {recentClaims.slice(0, 3).map((claim, idx) => (
                      <div
                        key={`${claim.conditionId}-${idx}`}
                        className="flex items-center justify-between text-[10px] bg-secondary/50 rounded px-1.5 py-1"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Check className="w-2.5 h-2.5 text-green-400 shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {claim.marketSlug}
                          </span>
                        </div>
                        {claim.txHash && (
                          <a
                            href={`https://polygonscan.com/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-1 text-[10px] text-destructive">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span className="truncate">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoClaimPanel;
