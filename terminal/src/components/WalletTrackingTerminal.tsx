"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Eye, AlertTriangle } from "lucide-react";
import type { WalletTrackingLogEntry, SSEMessage, OrderEvent } from "@/types/wallet-tracking";

const WalletTrackingTerminal = () => {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isTracking, setIsTracking] = useState(false);
  const [logs, setLogs] = useState<WalletTrackingLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Add log entry
  const addLog = useCallback((level: WalletTrackingLogEntry["level"], message: string, details?: Record<string, unknown>) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }]);
  }, []);

  // Format order for display
  const formatOrderMessage = (order: OrderEvent): string => {
    const side = order.side === "BUY" ? "📈 BUY" : "📉 SELL";
    const price = (order.price * 100).toFixed(1);
    const shares = order.shares_normalized?.toFixed(2) || order.shares;
    return `${side} ${shares} shares @ ${price}¢ — ${order.title || order.market_slug}`;
  };

  // Start tracking
  const startTracking = useCallback(() => {
    if (!walletAddress) {
      setError("Please enter a wallet address");
      return;
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid wallet address format. Must be a valid Ethereum address (0x...)");
      return;
    }

    setError(null);
    setIsTracking(true);
    addLog("INFO", `Starting wallet tracking for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

    // Create EventSource for SSE
    const eventSource = new EventSource(`/api/wallet-tracking?wallet=${encodeURIComponent(walletAddress)}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case "connected":
            addLog("SUCCESS", "Connected to Dome WebSocket");
            break;
          
          case "subscribed": {
            const subData = message.data as { subscription_id?: string; message?: string };
            addLog("SUCCESS", subData.message || "Subscribed to wallet");
            break;
          }
          
          case "order": {
            const order = message.data as OrderEvent;
            addLog("ORDER", formatOrderMessage(order), {
              user: order.user,
              tx_hash: order.tx_hash,
              market_slug: order.market_slug,
              price: order.price,
              shares: order.shares_normalized,
            });
            break;
          }
          
          case "error": {
            const errData = message.data as { error?: string };
            addLog("ERROR", errData.error || "Unknown error occurred");
            break;
          }
          
          case "disconnected":
            addLog("WARN", "WebSocket disconnected, attempting to reconnect...");
            break;
          
          case "heartbeat":
            // Don't log heartbeats to avoid cluttering - just ignore them
            break;
          
          default:
            // Ignore unknown event types
            break;
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        addLog("ERROR", "Connection lost. Click Stop and Start to reconnect.");
        setIsTracking(false);
      }
    };
  }, [walletAddress, addLog]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsTracking(false);
    addLog("INFO", "Wallet tracking stopped");
  }, [addLog]);

  // Get log level styling
  const getLogLevelStyle = (level: WalletTrackingLogEntry["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "text-success";
      case "ERROR":
        return "text-destructive";
      case "WARN":
        return "text-warning";
      case "ORDER":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  const getLogLevelIcon = (level: WalletTrackingLogEntry["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "✓";
      case "ERROR":
        return "✗";
      case "WARN":
        return "⚠";
      case "ORDER":
        return "◆";
      default:
        return "›";
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center py-8 fade-in">
            <div className="relative mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold text-primary text-glow mb-1">
                Polymarket Wallet Tracking
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Track real-time order activity on any Polymarket wallet using Dome API WebSocket.
              </p>
            </div>
          </div>

          {/* Controls Card */}
          <div className="relative z-20 border border-border rounded-lg bg-card/80 backdrop-blur-sm border-glow">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-display">
                  WALLET TRACKER
                </span>
              </div>
              {isTracking && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-500 font-mono">TRACKING</span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Wallet Address Input */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="text-sm font-medium text-muted-foreground min-w-[120px] shrink-0">
                  Wallet Address:
                </label>
                
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value.trim())}
                    disabled={isTracking}
                    placeholder="0x..."
                    className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border text-sm font-mono hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Start/Stop Tracking Button */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {!isTracking ? (
                  <button
                    type="button"
                    onClick={startTracking}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 glow-box-hover"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Tracking</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopTracking}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop Tracking</span>
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

          {/* Logs Output */}
          <div className="relative z-10 border border-border rounded-lg bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-primary'} animate-pulse`} />
                <span className="text-xs text-muted-foreground font-display">
                  ACTIVITY LOG
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
                  <span>No activity yet. Enter a wallet address and start tracking.</span>
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

export default WalletTrackingTerminal;

