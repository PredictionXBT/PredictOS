"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Target, Play, Square, TrendingDown, Loader2, AlertTriangle } from "lucide-react";

interface SniperSettings {
  marketSlug: string;
  conditionId: string;
  side: "YES" | "NO";
  targetPrice: number;
  size: number;
  dropThreshold: number;
  enabled: boolean;
}

interface LogEntry {
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
  details?: Record<string, unknown>;
}

const DumpSniperTerminal = () => {
  const [settings, setSettings] = useState<SniperSettings>({
    marketSlug: "",
    conditionId: "",
    side: "YES",
    targetPrice: 0.40,
    size: 100,
    dropThreshold: 5,
    enabled: false,
  });
  
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Add local log entry
  const addLog = useCallback((level: LogEntry["level"], message: string, details?: Record<string, unknown>) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }]);
  }, []);

  // Check price and execute sniper if threshold met
  const checkAndSnipe = useCallback(async () => {
    if (!settings.marketSlug || !settings.conditionId) {
      addLog("ERROR", "Market slug and condition ID are required");
      return;
    }

    try {
      const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_SNIPER || 
                              "http://127.0.0.1:54321/functions/v1/polymarket-sniper-order";
      
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conditionId: settings.conditionId,
          marketSlug: settings.marketSlug,
          side: settings.side,
          targetPrice: settings.targetPrice,
          size: settings.size,
          dropThreshold: settings.dropThreshold,
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
        setCurrentPrice(data.data.currentPrice);
        
        if (data.data.triggered && data.data.orderPlaced) {
          addLog("SUCCESS", "🎯 Sniper triggered! Order placed successfully");
          // Stop monitoring after successful execution
          if (settings.enabled) {
            setSettings(prev => ({ ...prev, enabled: false }));
          }
        }
      } else {
        setError(data.error || "Unknown error occurred");
        addLog("ERROR", data.error || "Unknown error occurred");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      addLog("ERROR", `Failed to check price: ${errorMsg}`);
    }
  }, [settings, addLog]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    const newEnabled = !settings.enabled;
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
    
    if (newEnabled) {
      addLog("SUCCESS", "Dump sniper activated - monitoring price...");
      setIsMonitoring(true);
      // Start checking immediately
      checkAndSnipe();
    } else {
      addLog("INFO", "Dump sniper deactivated");
      setIsMonitoring(false);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    }
  }, [settings.enabled, checkAndSnipe, addLog]);

  // Set up monitoring interval
  useEffect(() => {
    if (settings.enabled && isMonitoring) {
      // Clear any existing interval
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }

      // Check every 10 seconds
      monitorIntervalRef.current = setInterval(() => {
        checkAndSnipe();
      }, 10000);

      return () => {
        if (monitorIntervalRef.current) {
          clearInterval(monitorIntervalRef.current);
        }
      };
    }
  }, [settings.enabled, isMonitoring, checkAndSnipe]);

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Target className="w-6 h-6" />
          Dump Sniper
        </h1>
        <p className="text-sm text-green-400/70">
          Real-time price monitoring for market opportunities
        </p>
      </div>

      {/* Settings */}
      <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-400/5">
        <h2 className="text-lg font-bold mb-4">Configuration</h2>
        
        <div className="space-y-4">
          {/* Market Slug */}
          <div>
            <label className="block text-sm mb-2">Market Slug</label>
            <input
              type="text"
              value={settings.marketSlug}
              onChange={(e) => setSettings(prev => ({ ...prev, marketSlug: e.target.value }))}
              disabled={settings.enabled}
              placeholder="e.g., btc-2026-01-15-0800"
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 placeholder-green-400/30 focus:outline-none focus:border-green-400 disabled:opacity-50"
            />
          </div>

          {/* Condition ID */}
          <div>
            <label className="block text-sm mb-2">Condition ID</label>
            <input
              type="text"
              value={settings.conditionId}
              onChange={(e) => setSettings(prev => ({ ...prev, conditionId: e.target.value }))}
              disabled={settings.enabled}
              placeholder="0x..."
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 placeholder-green-400/30 focus:outline-none focus:border-green-400 disabled:opacity-50"
            />
          </div>

          {/* Side */}
          <div>
            <label className="block text-sm mb-2">Side</label>
            <select
              value={settings.side}
              onChange={(e) => setSettings(prev => ({ ...prev, side: e.target.value as "YES" | "NO" }))}
              disabled={settings.enabled}
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
            >
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm mb-2">
              Target Price (trigger below this price)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={settings.targetPrice}
              onChange={(e) => setSettings(prev => ({ ...prev, targetPrice: Number(e.target.value) }))}
              disabled={settings.enabled}
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
            />
            <div className="text-xs text-green-400/50 mt-1">
              {(settings.targetPrice * 100).toFixed(0)}%
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm mb-2">Size (shares)</label>
            <input
              type="number"
              min="5"
              step="1"
              value={settings.size}
              onChange={(e) => setSettings(prev => ({ ...prev, size: Number(e.target.value) }))}
              disabled={settings.enabled}
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
            />
          </div>

          {/* Drop Threshold */}
          <div>
            <label className="block text-sm mb-2">
              Drop Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.dropThreshold}
              onChange={(e) => setSettings(prev => ({ ...prev, dropThreshold: Number(e.target.value) }))}
              disabled={settings.enabled}
              className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
            />
            <div className="text-xs text-green-400/50 mt-1">
              Trigger when price drops {settings.dropThreshold}% from target
            </div>
          </div>

          {/* Activate Button */}
          <div>
            <button
              onClick={toggleMonitoring}
              disabled={!settings.marketSlug || !settings.conditionId}
              className={`w-full px-6 py-3 rounded font-bold flex items-center justify-center gap-2 transition-colors ${
                settings.enabled
                  ? "bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
                  : "bg-green-400/20 border border-green-400 text-green-400 hover:bg-green-400/30"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {settings.enabled ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Monitoring
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {settings.enabled && (
        <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-400/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-400/70 mb-1">Current Price</div>
              <div className="text-2xl font-bold">
                {currentPrice !== null ? `${(currentPrice * 100).toFixed(1)}%` : "Checking..."}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-400/70 mb-1">Target Price</div>
              <div className="text-2xl font-bold text-green-400/70">
                {(settings.targetPrice * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Monitoring...</span>
            </div>
          </div>
        </div>
      )}

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

export default DumpSniperTerminal;
