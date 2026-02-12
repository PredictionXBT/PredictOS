"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Activity, Copy, Wallet, ExternalLink, DollarSign, TrendingUp, TrendingDown, Users, X, LayoutGrid, Circle } from "lucide-react";

// interface ActiveTrader {
//     wallet: string;
//     tradeCount: number;
//     totalVolume: number;
//     markets: number;
//     recentTrades: Array<{
//         market: string;
//         side: string;
//         size: number;
//         price: number;
//         timestamp: number;
//     }>;
// }

import { LeaderboardCategory, LeaderboardTimePeriod, TraderLeaderboardEntry } from "@/types/polymarket";

export default function CopyTradingTerminal() {
    const [targetAddress, setTargetAddress] = useState<string>("");
    const [tradeAmount, setTradeAmount] = useState<number>(5);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [botWallet, setBotWallet] = useState<string>("");

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<TraderLeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('OVERALL');
    const [timePeriod, setTimePeriod] = useState<LeaderboardTimePeriod>('WEEK');
    const [viewMode, setViewMode] = useState<'LIST' | 'BUBBLE'>('LIST');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Fetch leaderboard on mount and when filters change
    useEffect(() => {
        fetchLeaderboard();
    }, [leaderboardCategory, timePeriod]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true);
        try {
            const response = await fetch(`https://data-api.polymarket.com/v1/leaderboard?category=${leaderboardCategory}&timePeriod=${timePeriod}&limit=10`);
            const data = await response.json();

            if (Array.isArray(data)) {
                setLeaderboard(data);
            } else {
                console.error('Leaderboard data is not an array:', data);
                setLeaderboard([]);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            // addLog('Failed to fetch leaderboard', 'ERROR');
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const openCopyTradeModalFromLeaderboard = (trader: TraderLeaderboardEntry) => {
        setTargetAddress(trader.proxyWallet);
        // Optionally scroll to top or highlight the configuration panel
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const addLog = (message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'TRADE' = 'INFO') => {
        const time = new Date().toLocaleTimeString([], { hour12: false });
        const prefix = level === 'TRADE' ? '🎯' : level === 'SUCCESS' ? '✅' : level === 'ERROR' ? '❌' : 'ℹ️';
        setLogs(prev => [...prev, `[${time}] ${prefix} ${message}`]);
    };

    const fetchBotWallet = async () => {
        try {
            addLog("Fetching bot wallet...");
            const res = await fetch('/api/privy/wallet', { method: 'POST' });
            const data = await res.json();
            if (data.success && data.wallet) {
                setBotWallet(data.wallet.address);
                addLog(`Bot wallet loaded: ${data.wallet.address}`, 'SUCCESS');
                return true;
            } else {
                addLog("Failed to load bot wallet", 'ERROR');
                return false;
            }
        } catch (error) {
            addLog(`Error loading bot wallet: ${error}`, 'ERROR');
            return false;
        }
    };

    const startBot = async () => {
        if (!targetAddress) {
            addLog("Please enter a target wallet address", 'ERROR');
            return;
        }

        if (!targetAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            addLog("Invalid wallet address format", 'ERROR');
            return;
        }

        if (tradeAmount <= 0) {
            addLog("Trade amount must be positive", 'ERROR');
            return;
        }

        setIsRunning(true);
        setLogs([]);

        addLog("🚀 Starting Copy Trading Bot...");
        addLog(`Target: ${targetAddress}`);
        addLog(`Trade Amount: ${tradeAmount} USDC`);

        // Fetch bot wallet
        const walletLoaded = await fetchBotWallet();
        if (!walletLoaded) {
            setIsRunning(false);
            return;
        }

        addLog("Connecting to Polymarket...", 'SUCCESS');
        addLog("Starting trade monitoring...");

        // Start polling
        pollForTrades();
    };

    const stopBot = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsRunning(false);
        addLog("Bot stopped by user", 'INFO');
    };

    const pollForTrades = async () => {
        // Initial check
        await checkForTrades();

        // Set up interval (every 5 seconds)
        intervalRef.current = setInterval(async () => {
            await checkForTrades();
        }, 5000);
    };

    const checkForTrades = async () => {
        try {
            const res = await fetch(`/api/copy-trading/run?target=${targetAddress}&amount=${tradeAmount}`);
            const data = await res.json();

            if (!data.success) {
                addLog(`Error: ${data.error || 'Unknown error'}`, 'ERROR');
                return;
            }

            const result = data.data;

            // Display all logs from backend (for new trades being executed)
            if (result.logs && result.logs.length > 0) {
                result.logs.forEach((log: string) => {
                    // Determine log level based on content
                    const level = log.includes('❌') ? 'ERROR' :
                        log.includes('✅') || log.includes('🎯') ? 'SUCCESS' :
                            'INFO';
                    addLog(log, level);
                });
            }

            // Always show latest trade info if available (both new and past trades)
            if (result.latestParams) {
                const trade = result.latestParams;

                if (result.executed) {
                    // New trade was executed - already shown in logs above
                    addLog('─'.repeat(50), 'INFO');
                } else {
                    // Show latest trade found (already processed)
                    addLog(`📊 Latest Trade Monitored:`, 'INFO');
                    addLog(`  Market: ${trade.title || trade.market_slug}`, 'INFO');
                    addLog(`  Side: ${trade.side} | Outcome: ${trade.outcome}`, 'INFO');
                    addLog(`  Size: ${trade.size} | Price: $${trade.price}`, 'INFO');
                    addLog(`  Timestamp: ${new Date(trade.timestamp * 1000).toLocaleString()}`, 'INFO');
                    addLog(`  Status: ${result.status}`, 'INFO');
                    addLog('─'.repeat(50), 'INFO');
                }
            } else if (!result.executed) {
                // No trades found at all
                addLog(`📡 Scanning... ${result.status}`, 'INFO');
            }
        } catch (error) {
            addLog(`Connection error: ${error}`, 'ERROR');
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6 text-foreground bg-background">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h2 className="font-display text-2xl font-bold text-primary text-glow flex items-center gap-2">
                        <Copy className="w-6 h-6" /> Copy Trading Bot
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Automatically copy trades from any Polymarket wallet with configurable amounts
                    </p>
                </div>

                {/* Active Traders / Leaderboard Section */}
                <div className="border border-border rounded-xl bg-card/50 p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Top Traders Leaderboard
                        </h3>

                        <div className="flex flex-wrap gap-2 text-xs items-center">

                            {/* View Toggle */}
                            <div className="flex bg-secondary/30 p-1 rounded-lg border border-border mr-2">
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'LIST' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="List View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('BUBBLE')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'BUBBLE' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Bubble Map"
                                >
                                    <Circle className="w-4 h-4" />
                                </button>
                            </div>

                            <select
                                value={timePeriod}
                                onChange={(e) => setTimePeriod(e.target.value as LeaderboardTimePeriod)}
                                className="bg-secondary/50 border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                            >
                                <option value="DAY">24h</option>
                                <option value="WEEK">7d</option>
                                <option value="MONTH">30d</option>
                                <option value="ALL">All Time</option>
                            </select>

                            <select
                                value={leaderboardCategory}
                                onChange={(e) => setLeaderboardCategory(e.target.value as LeaderboardCategory)}
                                className="bg-secondary/50 border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                            >
                                <option value="OVERALL">Overall</option>
                                <option value="POLITICS">Politics</option>
                                <option value="SPORTS">Sports</option>
                                <option value="CRYPTO">Crypto</option>
                                <option value="CULTURE">Culture</option>
                                <option value="TECH">Tech</option>
                                <option value="FINANCE">Finance</option>
                            </select>

                            <button
                                onClick={fetchLeaderboard}
                                disabled={loadingLeaderboard}
                                className="px-3 py-1 rounded bg-secondary/50 hover:bg-secondary border border-border transition-colors disabled:opacity-50"
                            >
                                {loadingLeaderboard ? <Activity className="w-3 h-3 animate-spin" /> : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {loadingLeaderboard ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Activity className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                            <p className="text-sm">Loading leaderboard rankings...</p>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-secondary/10 rounded-lg">
                            <p className="text-sm">No traders found for this category</p>
                        </div>
                    ) : viewMode === 'BUBBLE' ? (
                        <div className="h-[400px] relative bg-black/20 rounded-xl border border-border/50 overflow-hidden flex items-center justify-center p-4">
                            <div className="flex flex-wrap items-center justify-center gap-4 w-full h-full content-center">
                                {/* Bubble Rendering Logic */}
                                {leaderboard.map((trader, idx) => {
                                    // Scale size based on rank/volume concept - simpler to use rank for visual hierarchy in a top 10 list
                                    // Rank 1 = Largest. 
                                    const maxBubbles = leaderboard.length;
                                    // Size between 60px and 160px
                                    const size = 160 - (idx * (100 / maxBubbles));
                                    const isCopied = targetAddress.toLowerCase() === trader.proxyWallet.toLowerCase();
                                    const isPositive = trader.pnl >= 0;

                                    return (
                                        <div
                                            key={trader.proxyWallet}
                                            onClick={() => openCopyTradeModalFromLeaderboard(trader)}
                                            className={`rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10 relative group border-2 ${isCopied
                                                    ? 'bg-green-500/20 border-green-500 shadow-[0_0_30px_rgba(74,222,128,0.3)] scale-105 z-10'
                                                    : isPositive
                                                        ? 'bg-gradient-to-br from-green-500/10 to-green-900/20 border-green-500/30 hover:border-green-400'
                                                        : 'bg-gradient-to-br from-red-500/10 to-red-900/20 border-red-500/30 hover:border-red-400'
                                                }`}
                                            style={{
                                                width: `${size}px`,
                                                height: `${size}px`,
                                            }}
                                        >
                                            {/* Rank Badge */}
                                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold shadow-sm">
                                                #{trader.rank}
                                            </div>

                                            {/* Profile Image or Initial */}
                                            {trader.profileImage ? (
                                                <img src={trader.profileImage} alt={trader.userName} className="w-8 h-8 rounded-full mb-1 object-cover border border-border/50" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-xs font-bold text-muted-foreground mb-1">
                                                    {trader.userName?.charAt(0) || '?'}
                                                </div>
                                            )}

                                            {/* Name */}
                                            <div className="text-xs font-bold truncate max-w-[80%] text-center">
                                                {trader.userName || 'Anonymous'}
                                            </div>

                                            {/* Stat */}
                                            <div className={`text-[10px] font-mono mt-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                {isPositive ? '+' : ''}${trader.pnl.toLocaleString(undefined, { notation: "compact" })}
                                            </div>

                                            {/* Copied Label */}
                                            {isCopied && (
                                                <div className="absolute -bottom-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                                                    COPIED
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
                                Size by Rank
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                                        <th className="py-3 px-4">Rank</th>
                                        <th className="py-3 px-4">Trader</th>
                                        <th className="py-3 px-4 text-right">Volume</th>
                                        <th className="py-3 px-4 text-right">P&L</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((trader) => (
                                        <tr
                                            key={trader.proxyWallet}
                                            className="border-b border-border/20 hover:bg-secondary/30 transition-colors group"
                                        >
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                #{trader.rank}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    {trader.profileImage ? (
                                                        <img src={trader.profileImage} alt={trader.userName} className="w-8 h-8 rounded-full bg-secondary" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                            {trader.userName?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-foreground">
                                                                {trader.userName || 'Anonymous'}
                                                            </span>
                                                            {trader.verifiedBadge && (
                                                                <span className="text-blue-400" title="Verified">✓</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                                            {trader.proxyWallet.substring(0, 6)}...{trader.proxyWallet.substring(38)}
                                                            <a
                                                                href={`https://polymarket.com/profile/${trader.proxyWallet}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                ${trader.vol.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className={`py-3 px-4 text-right font-mono font-bold ${trader.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {trader.pnl >= 0 ? '+' : ''}${trader.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => openCopyTradeModalFromLeaderboard(trader)}
                                                    className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1 min-w-[80px] ${targetAddress.toLowerCase() === trader.proxyWallet.toLowerCase()
                                                        ? 'bg-green-500/20 text-green-400 border-green-500/50 cursor-default'
                                                        : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/50'
                                                        }`}
                                                >
                                                    {targetAddress.toLowerCase() === trader.proxyWallet.toLowerCase() ? (
                                                        <>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        'Copy'
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Copy Trade Modal */}
                {/* {showModal && selectedTrader && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Start Copy Trading</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-secondary rounded transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Target Wallet</label>
                                    <code className="block mt-1 px-3 py-2 rounded bg-secondary/30 border border-border font-mono text-sm break-all">
                                        {selectedTrader.wallet}
                                    </code>
                                </div>

                                <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/20 rounded-lg">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Trades</p>
                                        <p className="text-lg font-bold">{selectedTrader.tradeCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Volume</p>
                                        <p className="text-lg font-bold">${selectedTrader.totalVolume.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Markets</p>
                                        <p className="text-lg font-bold">{selectedTrader.markets}</p>
                                    </div>
                                </div>

                                {selectedTrader.recentTrades.length > 0 && (
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Recent Trades</label>
                                        <div className="mt-2 space-y-2">
                                            {selectedTrader.recentTrades.map((trade, idx) => (
                                                <div key={idx} className="p-3 bg-secondary/20 rounded border border-border">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {trade.side}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(trade.timestamp * 1000).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{trade.market}</p>
                                                    <p className="text-sm font-mono">{trade.size.toFixed(1)} @ ${trade.price.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Your Trade Amount (USDC)</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="number"
                                            value={tradeAmount}
                                            onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                                            min="0.01"
                                            step="0.01"
                                            className="w-full pl-10 pr-4 py-2 rounded bg-secondary/30 border border-border font-mono text-sm focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Amount to use for each copied trade</p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 rounded bg-secondary/50 hover:bg-secondary border border-border transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={startCopyTrading}
                                        className="flex-1 px-4 py-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors"
                                    >
                                        Start Copy Bot
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )} */}

                {/* Configuration Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Target Configuration */}
                    <div className="border border-border rounded-xl bg-card/50 p-6 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> Target Configuration
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Target Wallet Address</label>
                            <input
                                type="text"
                                value={targetAddress}
                                onChange={(e) => setTargetAddress(e.target.value.trim())}
                                placeholder="0x..."
                                disabled={isRunning}
                                className="w-full px-4 py-2 rounded bg-secondary/30 border border-border font-mono text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Trade Amount (USDC)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    value={tradeAmount}
                                    onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                                    min="0.01"
                                    step="0.01"
                                    disabled={isRunning}
                                    className="w-full pl-10 pr-4 py-2 rounded bg-secondary/30 border border-border font-mono text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Amount to use for each copied trade</p>
                        </div>

                        <button
                            onClick={isRunning ? stopBot : startBot}
                            className={`w-full px-6 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${isRunning
                                ? 'bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <Square className="w-4 h-4" />
                                    STOP BOT
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    START COPY BOT
                                </>
                            )}
                        </button>
                    </div>

                    {/* Bot Wallet Info */}
                    <div className="border border-border rounded-xl bg-card/50 p-6 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-purple-400" /> Bot Execution Wallet
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Wallet Address (Privy Server)</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 rounded bg-black/40 border border-border font-mono text-xs text-purple-300 break-all">
                                    {botWallet || "Not initialized..."}
                                </code>
                            </div>
                        </div>

                        {botWallet && (
                            <div className="flex gap-2">
                                <a
                                    href={`https://polygonscan.com/address/${botWallet}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-3 py-2 rounded bg-secondary/50 hover:bg-secondary text-xs font-mono border border-border transition-colors flex items-center justify-center gap-2"
                                >
                                    View on PolygonScan <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <p className="text-xs text-yellow-200/80">
                                ⚠️ Ensure this wallet has MATIC for gas and USDC for trading
                            </p>
                        </div>
                    </div>

                </div>

                {/* Logs Terminal */}
                <div className="bg-black/80 border border-green-500/20 rounded-xl overflow-hidden font-mono text-sm relative">
                    <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">System Logs</span>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-green-500/50'}`} />
                        </div>
                    </div>
                    <div className="p-4 h-[400px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 opacity-50">
                                <Activity className="w-8 h-8 mb-2" />
                                <p>Terminal Ready. Configure target and start bot.</p>
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={`break-all ${log.includes('🎯') ? 'text-cyan-400 font-bold' :
                                    log.includes('✅') ? 'text-green-400' :
                                        log.includes('❌') ? 'text-red-400' :
                                            log.includes('💰') ? 'text-yellow-400' :
                                                log.includes('📝') || log.includes('📤') ? 'text-blue-400' :
                                                    log.includes('📊') ? 'text-purple-400' :
                                                        log.includes('📡') || log.includes('🔍') ? 'text-gray-400' :
                                                            log.includes('⚠️') ? 'text-orange-400' :
                                                                log.includes('🔎') || log.includes('⏭️') ? 'text-indigo-400' :
                                                                    log.includes('🔐') || log.includes('🔏') ? 'text-pink-400' :
                                                                        log.includes('⚙️') ? 'text-teal-400' :
                                                                            log.includes('─') ? 'text-gray-600' :
                                                                                'text-green-400/80'
                                    }`}>
                                    {log}
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>

            </div>
        </div>
    );
}
