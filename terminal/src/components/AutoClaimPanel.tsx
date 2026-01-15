"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, DollarSign, Clock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

interface AutoClaimSettings {
  enabled: boolean;
  checkInterval: number; // minutes (5-60)
}

interface ClaimablePosition {
  conditionId: string;
  marketSlug: string;
  marketTitle: string;
  outcome: string;
  shares: number;
  payoutAmount: number;
}

interface WalletBalances {
  usdc: string;
  pol: string;
}

interface LogEntry {
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
  details?: Record<string, unknown>;
}

const INTERVAL_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
];

const AutoClaimPanel = () => {
  const [settings, setSettings] = useState<AutoClaimSettings>(() => {
    // Load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("autoClaim_settings");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return { enabled: false, checkInterval: 15 };
  });
  
  const [claimablePositions, setClaimablePositions] = useState<ClaimablePosition[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ usdc: "0", pol: "0" });
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<Date | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("autoClaim_settings", JSON.stringify(settings));
    }
  }, [settings]);

  // Add local log entry
  const addLog = useCallback((level: LogEntry["level"], message: string, details?: Record<string, unknown>) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }]);
  }, []);

  // Check for claimable positions
  const checkPositions = useCallback(async (autoClaim: boolean = false) => {
    if (isChecking || isClaiming) return;

    setIsChecking(true);
    setError(null);
    addLog("INFO", "Checking for claimable positions...");

    try {
      const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_AUTO_CLAIM || 
                              "http://127.0.0.1:54321/functions/v1/auto-claim";
      
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dryRun: !autoClaim, // Only claim if autoClaim is true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Add logs from the edge function
      if (data.logs) {
        data.logs.forEach((log: LogEntry) => {
          addLog(log.level, log.message, log.details);
        });
      }

      if (data.success && data.data) {
        setClaimablePositions(data.data.claimablePositions || []);
        if (data.data.walletBalances) {
          setWalletBalances(data.data.walletBalances);
        }

        if (autoClaim && data.data.claimedPositions) {
          const successCount = data.data.claimedPositions.filter((p: any) => p.success).length;
          addLog("SUCCESS", `Auto-claim completed: ${successCount}/${data.data.claimedPositions.length} positions claimed`);
        }
      } else {
        setError(data.error || "Unknown error occurred");
        addLog("ERROR", data.error || "Unknown error occurred");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      addLog("ERROR", `Failed to check positions: ${errorMsg}`);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isClaiming, addLog]);

  // Manual claim action
  const handleManualClaim = useCallback(async () => {
    if (isClaiming || claimablePositions.length === 0) return;

    setIsClaiming(true);
    setError(null);
    addLog("INFO", "Manually claiming positions...");

    try {
      const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_AUTO_CLAIM || 
                              "http://127.0.0.1:54321/functions/v1/auto-claim";
      
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dryRun: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Add logs from the edge function
      if (data.logs) {
        data.logs.forEach((log: LogEntry) => {
          addLog(log.level, log.message, log.details);
        });
      }

      if (data.success && data.data) {
        setClaimablePositions(data.data.claimablePositions || []);
        if (data.data.walletBalances) {
          setWalletBalances(data.data.walletBalances);
        }

        if (data.data.claimedPositions) {
          const successCount = data.data.claimedPositions.filter((p: any) => p.success).length;
          addLog("SUCCESS", `Claimed ${successCount}/${data.data.claimedPositions.length} positions`);
        }
      } else {
        setError(data.error || "Unknown error occurred");
        addLog("ERROR", data.error || "Unknown error occurred");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      addLog("ERROR", `Failed to claim positions: ${errorMsg}`);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, claimablePositions, addLog]);

  // Toggle auto-claim
  const toggleAutoClaim = useCallback(() => {
    const newEnabled = !settings.enabled;
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
    
    if (newEnabled) {
      addLog("SUCCESS", `Auto-claim enabled (${settings.checkInterval}min interval)`);
      // Start checking immediately
      checkPositions(true);
    } else {
      addLog("INFO", "Auto-claim disabled");
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      setNextCheckTime(null);
    }
  }, [settings, checkPositions, addLog]);

  // Set up automatic checking
  useEffect(() => {
    if (settings.enabled) {
      // Clear any existing interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      // Calculate next check time
      const updateNextCheckTime = () => {
        const next = new Date();
        next.setMinutes(next.getMinutes() + settings.checkInterval);
        setNextCheckTime(next);
      };

      updateNextCheckTime();

      // Set up interval
      checkIntervalRef.current = setInterval(() => {
        checkPositions(true);
        updateNextCheckTime();
      }, settings.checkInterval * 60 * 1000);

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
      };
    }
  }, [settings.enabled, settings.checkInterval, checkPositions]);

  const totalClaimable = claimablePositions.reduce((sum, pos) => sum + pos.payoutAmount, 0);

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Auto-Claim
        </h1>
        <p className="text-sm text-green-400/70">
          Automatically redeem winning positions with Polygon Gas Station V2
        </p>
      </div>

      {/* Settings */}
      <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-400/5">
        <h2 className="text-lg font-bold mb-4">Settings</h2>
        
        <div className="space-y-4">
          {/* Check Interval */}
          <div>
            <label className="block text-sm mb-2">Check Interval</label>
            <select
              value={settings.checkInterval}
              onChange={(e) => setSettings(prev => ({ ...prev, checkInterval: Number(e.target.value) }))}
              disabled={settings.enabled}
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
            >
              {INTERVAL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Claim Toggle */}
          <div>
            <button
              onClick={toggleAutoClaim}
              disabled={isChecking || isClaiming}
              className={`w-full px-6 py-3 rounded font-bold flex items-center justify-center gap-2 transition-colors ${
                settings.enabled
                  ? "bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
                  : "bg-green-400/20 border border-green-400 text-green-400 hover:bg-green-400/30"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {settings.enabled ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Auto-Claim
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Auto-Claim
                </>
              )}
            </button>
          </div>

          {/* Next Check Time */}
          {settings.enabled && nextCheckTime && (
            <div className="text-sm text-green-400/70 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Next check: {nextCheckTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Wallet Balances */}
      <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-400/5">
        <h2 className="text-lg font-bold mb-2">Wallet Balance</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-400/70">USDC:</span>
            <span className="ml-2 font-bold">${walletBalances.usdc}</span>
          </div>
          <div>
            <span className="text-green-400/70">POL (Gas):</span>
            <span className="ml-2 font-bold">{walletBalances.pol} POL</span>
          </div>
        </div>
      </div>

      {/* Claimable Positions */}
      <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-400/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            Claimable Positions ({claimablePositions.length})
          </h2>
          {claimablePositions.length > 0 && (
            <button
              onClick={handleManualClaim}
              disabled={isClaiming || isChecking}
              className="px-4 py-2 bg-green-400/20 border border-green-400 rounded hover:bg-green-400/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Claim All
                </>
              )}
            </button>
          )}
        </div>

        {claimablePositions.length === 0 ? (
          <div className="text-center text-green-400/50 py-8">
            No claimable positions found
          </div>
        ) : (
          <div className="space-y-2">
            {claimablePositions.map((position, index) => (
              <div key={index} className="p-3 bg-black/50 rounded border border-green-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{position.marketTitle}</div>
                    <div className="text-sm text-green-400/70">
                      {position.shares.toFixed(2)} shares · {position.outcome}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-400">
                      ${position.payoutAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-green-400/30 mt-2">
              <div className="flex items-center justify-between font-bold">
                <span>Total Claimable:</span>
                <span className="text-green-400">${totalClaimable.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {/* Activity Logs */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Activity Log</h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-green-400/50 hover:text-green-400"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 bg-black/50 border border-green-400/30 rounded p-4 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-green-400/50">No activity yet</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-green-400/50 flex-shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span
                  className={`flex-shrink-0 ${
                    log.level === "ERROR"
                      ? "text-red-400"
                      : log.level === "SUCCESS"
                      ? "text-green-400"
                      : log.level === "WARN"
                      ? "text-yellow-400"
                      : "text-green-400/70"
                  }`}
                >
                  [{log.level}]
                </span>
                <span className="break-all">
                  {log.message}
                  {log.details && ` ${JSON.stringify(log.details)}`}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default AutoClaimPanel;
