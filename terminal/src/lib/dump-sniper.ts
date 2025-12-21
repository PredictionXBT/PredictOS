/**
 * Dump Sniper Strategy for Polymarket 15-Minute Up/Down Markets
 *
 * Strategy:
 * 1. Watch for fast price dumps (15%+ drop in 3 seconds) during first X minutes
 * 2. Buy the dumped side immediately (Leg 1)
 * 3. Wait for hedge opportunity: leg1Price + oppositeAsk < sumTarget
 * 4. Buy opposite side (Leg 2) to lock in guaranteed profit
 *
 * WebSocket: wss://ws-subscriptions-clob.polymarket.com/ws/market
 */

// WebSocket endpoints
const WS_MARKET_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

/**
 * Configuration for Dump Sniper
 */
export interface DumpSniperConfig {
  /** USD amount to spend per leg (shares calculated from price) */
  usdPerLeg: number;
  /** Sum target for hedge (e.g., 0.95 = 95¢ total) */
  sumTarget: number;
  /** Dump threshold (e.g., 0.15 = 15% drop) */
  dumpThreshold: number;
  /** Time window in minutes from market start to allow Leg 1 */
  windowMinutes: number;
  /** Rolling window in seconds to detect dump */
  dumpWindowSeconds: number;
  /** Auto-repeat: continue watching for next round after completion */
  autoRepeat: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_DUMP_SNIPER_CONFIG: DumpSniperConfig = {
  usdPerLeg: 5,
  sumTarget: 0.95,
  dumpThreshold: 0.15,
  windowMinutes: 2,
  dumpWindowSeconds: 3,
  autoRepeat: false,
};

/**
 * Price point for tracking
 */
interface PricePoint {
  price: number;
  timestamp: number;
}

/**
 * Current state of the sniper
 */
export type SniperState =
  | "IDLE"           // Waiting for market to start
  | "WATCHING"       // Watching for dump within time window
  | "LEG1_FILLED"    // Leg 1 bought, waiting for hedge
  | "COMPLETE"       // Both legs filled, profit locked
  | "EXPIRED";       // Time window passed without trigger

/**
 * Leg information
 */
export interface LegInfo {
  side: "UP" | "DOWN";
  price: number;
  shares: number;
  timestamp: number;
  orderId?: string;
}

/**
 * Sniper status
 */
export interface SniperStatus {
  state: SniperState;
  leg1?: LegInfo;
  leg2?: LegInfo;
  pairCost?: number;
  profit?: number;
  profitPercent?: number;
  currentUpPrice: number;
  currentDownPrice: number;
  currentSum: number;
  marketStartTime: number;
  timeUntilMarketStart: number;
  timeRemainingInWindow: number;
  marketEndTime: number;
  watchWindowMinutes: number;
}

/**
 * Callback types
 */
export type OnStatusUpdate = (status: SniperStatus) => void;
export type OnDumpDetected = (side: "UP" | "DOWN", dropPercent: number, price: number) => void;
export type OnLegFilled = (leg: 1 | 2, info: LegInfo) => void;
export type OnError = (error: string) => void;
export type OnStopped = (reason: "complete" | "expired" | "manual") => void;

/**
 * Order placement function type (injected from parent)
 */
export type PlaceOrderFn = (
  tokenId: string,
  price: number,
  shares: number,
  side: "BUY"
) => Promise<{ success: boolean; orderId?: string; error?: string }>;

/**
 * Dump Sniper Class
 */
export class DumpSniper {
  private config: DumpSniperConfig;
  private ws: WebSocket | null = null;
  private state: SniperState = "IDLE";

  // Token IDs for UP and DOWN
  private upTokenId: string = "";
  private downTokenId: string = "";

  // Price tracking
  private upPrices: PricePoint[] = [];
  private downPrices: PricePoint[] = [];
  private currentUpPrice: number = 0.5;
  private currentDownPrice: number = 0.5;

  // Leg tracking
  private leg1: LegInfo | null = null;
  private leg2: LegInfo | null = null;

  // Execution guards (prevent duplicate orders while async is pending)
  private isExecutingLeg1: boolean = false;
  private isExecutingLeg2: boolean = false;

  // Track if market has started (to clear pre-market price data)
  private hasLoggedMarketStart: boolean = false;

  // Timing
  private marketStartTime: number = 0;
  private marketEndTime: number = 0;

  // Callbacks
  private onStatusUpdate?: OnStatusUpdate;
  private onDumpDetected?: OnDumpDetected;
  private onLegFilled?: OnLegFilled;
  private onError?: OnError;
  private onStopped?: OnStopped;

  // Order placement function
  private placeOrder?: PlaceOrderFn;

  // Intervals
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<DumpSniperConfig> = {}) {
    this.config = { ...DEFAULT_DUMP_SNIPER_CONFIG, ...config };
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onStatusUpdate?: OnStatusUpdate;
    onDumpDetected?: OnDumpDetected;
    onLegFilled?: OnLegFilled;
    onError?: OnError;
    onStopped?: OnStopped;
  }): void {
    this.onStatusUpdate = callbacks.onStatusUpdate;
    this.onDumpDetected = callbacks.onDumpDetected;
    this.onLegFilled = callbacks.onLegFilled;
    this.onError = callbacks.onError;
    this.onStopped = callbacks.onStopped;
  }

  /**
   * Set order placement function
   */
  setPlaceOrderFn(fn: PlaceOrderFn): void {
    this.placeOrder = fn;
  }

  /**
   * Start sniping a market
   */
  start(
    upTokenId: string,
    downTokenId: string,
    marketStartTime: number,
    marketEndTime: number
  ): void {
    // Clean up any existing connections/intervals first
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    this.upTokenId = upTokenId;
    this.downTokenId = downTokenId;
    this.marketStartTime = marketStartTime;
    this.marketEndTime = marketEndTime;

    // Reset state
    this.state = "WATCHING";
    this.leg1 = null;
    this.leg2 = null;
    this.upPrices = [];
    this.downPrices = [];
    this.isExecutingLeg1 = false;
    this.isExecutingLeg2 = false;
    this.hasLoggedMarketStart = false;

    // Connect to WebSocket
    this.connectWebSocket();

    // Start status updates
    this.statusInterval = setInterval(() => {
      this.checkTimeWindow();
      this.emitStatus();
    }, 500);
  }

  /**
   * Stop sniping
   */
  stop(reason: "complete" | "expired" | "manual" = "manual"): void {
    // Prevent double-stop
    if (this.state === "IDLE") return;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    // Set state before callback so UI sees correct state
    const previousState = this.state;
    if (reason !== "complete") {
      this.state = "IDLE";
    }

    this.emitStatus();
    this.onStopped?.(reason);

    console.log(`[DumpSniper] Stopped (reason: ${reason}, previous state: ${previousState})`);
  }

  /**
   * Connect to Polymarket WebSocket
   */
  private connectWebSocket(): void {
    // Don't connect if stopped
    if (this.state === "IDLE" || this.state === "COMPLETE" || this.state === "EXPIRED") {
      console.log("[DumpSniper] Not connecting - sniper is stopped");
      return;
    }

    try {
      this.ws = new WebSocket(WS_MARKET_URL);

      this.ws.onopen = () => {
        console.log("[DumpSniper] WebSocket connected");
        // Subscribe to both token IDs for price changes
        // Polymarket subscription format
        this.ws?.send(
          JSON.stringify({
            assets_ids: [this.upTokenId, this.downTokenId],
            type: "market",
          })
        );
        console.log("[DumpSniper] Subscribed to:", this.upTokenId.slice(0, 20) + "...", this.downTokenId.slice(0, 20) + "...");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error("[DumpSniper] Failed to parse message:", e);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[DumpSniper] WebSocket error:", error);
        this.onError?.("WebSocket connection error");
      };

      this.ws.onclose = () => {
        console.log("[DumpSniper] WebSocket closed");
        // Only reconnect if still actively watching (not stopped/completed)
        if ((this.state === "WATCHING" || this.state === "LEG1_FILLED") && this.statusInterval !== null) {
          console.log("[DumpSniper] Reconnecting in 1s...");
          setTimeout(() => {
            // Double-check state before reconnecting (in case stop was called)
            if ((this.state === "WATCHING" || this.state === "LEG1_FILLED") && this.statusInterval !== null) {
              this.connectWebSocket();
            }
          }, 1000);
        }
      };
    } catch (e) {
      console.error("[DumpSniper] Failed to connect:", e);
      this.onError?.("Failed to connect to WebSocket");
    }
  }

  /**
   * Handle incoming WebSocket message
   *
   * Polymarket price_change format:
   * {
   *   "market": "0x...",
   *   "price_changes": [
   *     {
   *       "asset_id": "71321...",
   *       "price": "0.5",
   *       "size": "200",
   *       "side": "BUY",
   *       "best_bid": "0.49",
   *       "best_ask": "0.51"
   *     }
   *   ],
   *   "timestamp": "1757908892351",
   *   "event_type": "price_change"
   * }
   */
  private handleMessage(data: unknown): void {
    if (typeof data !== "object" || data === null) return;

    // Handle array of events (initial book snapshot)
    if (Array.isArray(data)) {
      for (const event of data) {
        this.handleSingleMessage(event as Record<string, unknown>);
      }
      return;
    }

    this.handleSingleMessage(data as Record<string, unknown>);
  }

  /**
   * Handle a single message object
   */
  private handleSingleMessage(msg: Record<string, unknown>): void {
    // Handle price_change event type
    if (msg.event_type === "price_change" && Array.isArray(msg.price_changes)) {
      for (const change of msg.price_changes) {
        this.processPriceChange(change as Record<string, unknown>);
      }
    }
    // Handle book event (initial snapshot) - extract best bid from order book
    else if (msg.event_type === "book" && msg.asset_id) {
      const assetId = msg.asset_id as string;

      // Get best bid from bids array (last element = highest bid)
      let bestBid = 0;
      if (Array.isArray(msg.bids) && msg.bids.length > 0) {
        const bids = msg.bids as Array<{ price: string }>;
        bestBid = parseFloat(bids[bids.length - 1].price);
      }

      if (bestBid > 0) {
        this.processPriceChange({ asset_id: assetId, best_bid: String(bestBid) });
      }
    }
    // Handle single event with asset_id
    else if (msg.asset_id) {
      this.processPriceChange(msg);
    }
  }

  /**
   * Process a single price change event
   */
  private processPriceChange(change: Record<string, unknown>): void {
    const assetId = change.asset_id as string;

    // Use best_bid as the price (what we'd pay to buy)
    const bestBid = parseFloat((change.best_bid || change.price || "0") as string);
    const bestAsk = parseFloat((change.best_ask || change.price || "0") as string);

    // For buying, we care about the ask price (what sellers are offering)
    // For tracking value, we use mid-price or best_bid
    const price = bestBid > 0 ? bestBid : bestAsk;

    if (!assetId || isNaN(price) || price === 0) return;

    const now = Date.now();
    const point: PricePoint = { price, timestamp: now };

    if (assetId === this.upTokenId) {
      this.currentUpPrice = price;
      this.upPrices.push(point);
      this.cleanOldPrices(this.upPrices);
      if (this.state === "WATCHING") {
        this.checkForDump("UP", this.upPrices);
      }
    } else if (assetId === this.downTokenId) {
      this.currentDownPrice = price;
      this.downPrices.push(point);
      this.cleanOldPrices(this.downPrices);
      if (this.state === "WATCHING") {
        this.checkForDump("DOWN", this.downPrices);
      }
    }

    // Check for hedge opportunity if Leg 1 is filled
    if (this.state === "LEG1_FILLED") {
      this.checkHedgeOpportunity();
    }
  }

  /**
   * Remove price points older than dump window
   */
  private cleanOldPrices(prices: PricePoint[]): void {
    const cutoff = Date.now() - this.config.dumpWindowSeconds * 1000;
    while (prices.length > 0 && prices[0].timestamp < cutoff) {
      prices.shift();
    }
  }

  /**
   * Check for dump (15%+ drop in X seconds)
   */
  private checkForDump(side: "UP" | "DOWN", prices: PricePoint[]): void {
    // Don't check for dumps before market has started
    const now = Date.now() / 1000;
    if (now < this.marketStartTime) {
      return;
    }

    // Clear price history on first check after market start (fresh start)
    if (!this.hasLoggedMarketStart) {
      this.hasLoggedMarketStart = true;
      this.upPrices = [];
      this.downPrices = [];
      console.log("[DumpSniper] Market started - now watching for dumps");
      return; // Skip this cycle to accumulate fresh prices
    }

    if (prices.length < 2) return;

    const oldest = prices[0];
    const newest = prices[prices.length - 1];

    // Calculate drop percentage
    const dropPercent = (oldest.price - newest.price) / oldest.price;

    if (dropPercent >= this.config.dumpThreshold) {
      console.log(`[DumpSniper] DUMP DETECTED: ${side} dropped ${(dropPercent * 100).toFixed(1)}%`);
      this.onDumpDetected?.(side, dropPercent, newest.price);
      this.executeLeg1(side, newest.price);
    }
  }

  /**
   * Execute Leg 1 - buy the dumped side
   */
  private async executeLeg1(side: "UP" | "DOWN", price: number): Promise<void> {
    // Guard: prevent duplicate execution while async is pending
    if (this.isExecutingLeg1) {
      console.log("[DumpSniper] Leg 1 already executing, skipping");
      return;
    }

    if (!this.placeOrder) {
      this.onError?.("No order placement function set");
      return;
    }

    // Set guard immediately
    this.isExecutingLeg1 = true;

    const tokenId = side === "UP" ? this.upTokenId : this.downTokenId;

    // Calculate shares from USD per leg (shares = USD / price)
    const shares = Math.floor(this.config.usdPerLeg / price);

    if (shares < 5) {
      this.onError?.(`Leg 1 failed: USD per leg (${this.config.usdPerLeg}) too small for price ${(price * 100).toFixed(1)}¢ (min 5 shares required, got ${shares})`);
      this.isExecutingLeg1 = false;
      return;
    }

    console.log(`[DumpSniper] Executing Leg 1: BUY ${shares} ${side} @ ${price} ($${this.config.usdPerLeg} USD)`);

    try {
      const result = await this.placeOrder(tokenId, price, shares, "BUY");

      if (result.success) {
        this.leg1 = {
          side,
          price,
          shares,
          timestamp: Date.now(),
          orderId: result.orderId,
        };
        this.state = "LEG1_FILLED";
        this.onLegFilled?.(1, this.leg1);
        console.log(`[DumpSniper] Leg 1 filled: ${side} @ ${price}`);
      } else {
        this.onError?.(`Leg 1 failed: ${result.error}`);
        this.isExecutingLeg1 = false; // Reset on failure so user can retry
      }
    } catch (e) {
      this.onError?.(`Leg 1 error: ${e}`);
      this.isExecutingLeg1 = false; // Reset on error so user can retry
    }

    this.emitStatus();
  }

  /**
   * Check if hedge opportunity exists
   */
  private checkHedgeOpportunity(): void {
    // Guard: don't check if already executing or complete
    if (!this.leg1 || this.state !== "LEG1_FILLED" || this.isExecutingLeg2) return;

    const oppositeSide = this.leg1.side === "UP" ? "DOWN" : "UP";
    const oppositePrice =
      oppositeSide === "UP" ? this.currentUpPrice : this.currentDownPrice;

    const potentialSum = this.leg1.price + oppositePrice;

    if (potentialSum <= this.config.sumTarget) {
      console.log(
        `[DumpSniper] HEDGE OPPORTUNITY: ${this.leg1.price} + ${oppositePrice} = ${potentialSum} <= ${this.config.sumTarget}`
      );
      this.executeLeg2(oppositeSide, oppositePrice);
    }
  }

  /**
   * Execute Leg 2 - buy the opposite side for hedge
   */
  private async executeLeg2(side: "UP" | "DOWN", price: number): Promise<void> {
    // Guard: prevent duplicate execution while async is pending
    if (this.isExecutingLeg2) {
      console.log("[DumpSniper] Leg 2 already executing, skipping");
      return;
    }

    if (!this.placeOrder || !this.leg1) {
      this.onError?.("No order placement function set or Leg 1 not filled");
      return;
    }

    // Set guard immediately BEFORE any async operation
    this.isExecutingLeg2 = true;

    const tokenId = side === "UP" ? this.upTokenId : this.downTokenId;

    // Use the same number of shares as Leg 1 (must match for hedge)
    const shares = this.leg1.shares;

    console.log(`[DumpSniper] Executing Leg 2: BUY ${shares} ${side} @ ${price}`);

    try {
      const result = await this.placeOrder(tokenId, price, shares, "BUY");

      if (result.success) {
        this.leg2 = {
          side,
          price,
          shares,
          timestamp: Date.now(),
          orderId: result.orderId,
        };
        this.state = "COMPLETE";
        this.onLegFilled?.(2, this.leg2);
        console.log(`[DumpSniper] Leg 2 filled: ${side} @ ${price}`);
        console.log(
          `[DumpSniper] PROFIT LOCKED: ${this.leg1!.price} + ${price} = ${this.leg1!.price + price}`
        );
        // Handle completion - either stop or auto-repeat
        this.handleCompletion();
      } else {
        this.onError?.(`Leg 2 failed: ${result.error}`);
        this.isExecutingLeg2 = false; // Reset on failure so it can retry
      }
    } catch (e) {
      this.onError?.(`Leg 2 error: ${e}`);
      this.isExecutingLeg2 = false; // Reset on error so it can retry
    }

    this.emitStatus();
  }

  /**
   * Handle completion - either stop or prepare for next round (auto-repeat)
   */
  private handleCompletion(): void {
    if (this.config.autoRepeat) {
      console.log("[DumpSniper] Auto-repeat enabled - preparing for next round");
      // Emit completion status first
      this.emitStatus();
      this.onStopped?.("complete");

      // Schedule restart for next 15-minute mark
      this.scheduleNextRound();
    } else {
      this.stop("complete");
    }
  }

  /**
   * Schedule restart for next 15-minute market round
   */
  private scheduleNextRound(): void {
    const now = Date.now();
    const nowSec = now / 1000;

    // Find next 15-minute mark
    const currentMinute = Math.floor(nowSec / 60);
    const nextQuarter = Math.ceil((currentMinute + 1) / 15) * 15;
    const nextMarketStart = nextQuarter * 60;
    const nextMarketEnd = nextMarketStart + 15 * 60;

    const msUntilNextRound = (nextMarketStart - nowSec) * 1000;

    console.log(`[DumpSniper] Next round starts in ${Math.ceil(msUntilNextRound / 1000)}s`);

    // Reset state for new round
    setTimeout(() => {
      if (this.config.autoRepeat) {
        console.log("[DumpSniper] Starting new round (auto-repeat)");
        this.start(this.upTokenId, this.downTokenId, nextMarketStart, nextMarketEnd);
      }
    }, msUntilNextRound);
  }

  /**
   * Check if time window has expired
   */
  private checkTimeWindow(): void {
    if (this.state !== "WATCHING") return;

    const now = Date.now() / 1000;
    const windowEnd = this.marketStartTime + this.config.windowMinutes * 60;

    if (now > windowEnd) {
      console.log("[DumpSniper] Time window expired without trigger");
      this.state = "EXPIRED";

      if (this.config.autoRepeat) {
        console.log("[DumpSniper] Auto-repeat enabled - scheduling next round");
        this.emitStatus();
        this.onStopped?.("expired");
        this.scheduleNextRound();
      } else {
        this.stop("expired");
      }
    }
  }

  /**
   * Emit current status
   */
  private emitStatus(): void {
    const now = Date.now() / 1000;
    const windowEnd = this.marketStartTime + this.config.windowMinutes * 60;
    const timeRemainingInWindow = Math.max(0, windowEnd - now);
    const timeUntilMarketStart = Math.max(0, this.marketStartTime - now);

    let pairCost: number | undefined;
    let profit: number | undefined;
    let profitPercent: number | undefined;

    if (this.leg1 && this.leg2) {
      pairCost = this.leg1.price + this.leg2.price;
      // Use actual shares from leg1 (both legs have same shares)
      profit = (1 - pairCost) * this.leg1.shares;
      profitPercent = ((1 - pairCost) / pairCost) * 100;
    }

    const status: SniperStatus = {
      state: this.state,
      leg1: this.leg1 || undefined,
      leg2: this.leg2 || undefined,
      pairCost,
      profit,
      profitPercent,
      currentUpPrice: this.currentUpPrice,
      currentDownPrice: this.currentDownPrice,
      currentSum: this.currentUpPrice + this.currentDownPrice,
      marketStartTime: this.marketStartTime,
      timeUntilMarketStart,
      timeRemainingInWindow,
      marketEndTime: this.marketEndTime,
      watchWindowMinutes: this.config.windowMinutes,
    };

    this.onStatusUpdate?.(status);
  }

  /**
   * Get current state
   */
  getState(): SniperState {
    return this.state;
  }

  /**
   * Get current status
   */
  getStatus(): SniperStatus {
    const now = Date.now() / 1000;
    const windowEnd = this.marketStartTime + this.config.windowMinutes * 60;
    const timeUntilMarketStart = Math.max(0, this.marketStartTime - now);

    let pairCost: number | undefined;
    let profit: number | undefined;
    let profitPercent: number | undefined;

    if (this.leg1 && this.leg2) {
      pairCost = this.leg1.price + this.leg2.price;
      // Use actual shares from leg1 (both legs have same shares)
      profit = (1 - pairCost) * this.leg1.shares;
      profitPercent = ((1 - pairCost) / pairCost) * 100;
    }

    return {
      state: this.state,
      leg1: this.leg1 || undefined,
      leg2: this.leg2 || undefined,
      pairCost,
      profit,
      profitPercent,
      currentUpPrice: this.currentUpPrice,
      currentDownPrice: this.currentDownPrice,
      currentSum: this.currentUpPrice + this.currentDownPrice,
      marketStartTime: this.marketStartTime,
      timeUntilMarketStart,
      timeRemainingInWindow: Math.max(0, windowEnd - now),
      marketEndTime: this.marketEndTime,
      watchWindowMinutes: this.config.windowMinutes,
    };
  }

  /**
   * Update config (e.g., to toggle autoRepeat)
   */
  updateConfig(updates: Partial<DumpSniperConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create a new DumpSniper instance
 */
export function createDumpSniper(config?: Partial<DumpSniperConfig>): DumpSniper {
  return new DumpSniper(config);
}
