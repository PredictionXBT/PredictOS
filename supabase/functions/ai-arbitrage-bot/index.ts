/**
 * Supabase Edge Function: ai-arbitrage-bot
 *
 * Self-learning arbitrage bot that:
 * 1. Executes arbitrage trades with both legs
 * 2. Uses WebSocket for real-time fill monitoring
 * 3. Graduated responses: WAIT -> REPRICE -> UNWIND
 * 4. Records all data to the learning system
 * 5. Uses learned patterns for AI predictions
 *
 * IMPORTANT: feeRateBps: 1000 is set on ALL createOrder calls
 */

// @ts-ignore - Deno npm imports
import { ClobClient, Side, OrderType } from "npm:@polymarket/clob-client@5.1.1";
// @ts-ignore - Deno npm imports
import { Wallet } from "npm:ethers@5.7.2";

import { callGrokResponses } from "../_shared/ai/callGrok.ts";
import { callOpenAIResponses } from "../_shared/ai/callOpenAI.ts";
import type { GrokMessage, GrokOutputText, OpenAIMessage, OpenAIOutputText } from "../_shared/ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// API endpoints
const CLOB_HOST = "https://clob.polymarket.com";
const CLOB_WS_HOST = "wss://clob.polymarket.com";
const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const LEARNER_FUNCTION_URL = "/ai-arbitrage-learner";
const CHAIN_ID = 137;
const DEFAULT_TICK_SIZE = "0.01";
const DEFAULT_NEG_RISK = false;

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
}

// =============================================================================
// Types
// =============================================================================

interface ArbitrageBotRequest {
  market_slug: string;
  leg1_token_id: string;
  leg1_side: "BUY" | "SELL";
  leg1_price: number;
  leg1_size: number;
  leg2_token_id: string;
  leg2_side: "BUY" | "SELL";
  leg2_price: number;
  leg2_size: number;
  model?: string;
  max_wait_ms?: number;
  auto_unwind?: boolean;
}

interface OrderResult {
  success: boolean;
  order_id?: string;
  error?: string;
  fill_time_ms?: number;
  filled_size?: number;
}

interface TradeResult {
  success: boolean;
  trade_id?: string;
  leg1_result: OrderResult;
  leg2_result: OrderResult;
  outcome: "both_filled" | "leg1_only" | "leg2_only" | "neither" | "unwound" | "pending";
  profit_loss_usdc?: number;
  ai_decision?: {
    decision: string;
    confidence: number;
    reasoning: string;
  };
  execution_time_ms: number;
  logs: string[];
}

interface LearnedPattern {
  pattern_type: string;
  conditions_json: Record<string, unknown>;
  fill_rate_percent: number;
  avg_fill_time_ms?: number;
  sample_size: number;
}

interface MarketData {
  best_bid?: number;
  best_ask?: number;
  spread?: number;
  depth_at_price?: number;
}

// =============================================================================
// CLOB Client Initialization
// =============================================================================

async function initClobClient(): Promise<typeof ClobClient> {
  // @ts-ignore - Deno global
  const privateKey = Deno.env.get("POLYMARKET_WALLET_PRIVATE_KEY");
  // @ts-ignore - Deno global
  const proxyAddress = Deno.env.get("POLYMARKET_PROXY_WALLET_ADDRESS");
  // @ts-ignore - Deno global
  const signatureType = parseInt(Deno.env.get("POLYMARKET_SIGNATURE_TYPE") || "1", 10);

  if (!privateKey || !proxyAddress) {
    throw new Error("Missing Polymarket credentials");
  }

  const signer = new Wallet(privateKey);
  const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, signer);
  const creds = await tempClient.createOrDeriveApiKey();

  return new ClobClient(
    CLOB_HOST,
    CHAIN_ID,
    signer,
    creds,
    signatureType,
    proxyAddress
  );
}

// =============================================================================
// Learning System Integration
// =============================================================================

async function callLearner(action: string, data?: unknown): Promise<unknown> {
  // @ts-ignore - Deno global
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1${LEARNER_FUNCTION_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });

    if (!response.ok) {
      console.error("Learner call failed:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling learner:", error);
    return null;
  }
}

async function getLearnedPatterns(): Promise<LearnedPattern[]> {
  const result = await callLearner("get_patterns", { min_sample_size: 10 }) as { patterns?: LearnedPattern[] } | null;
  return result?.patterns || [];
}

async function getConfidenceCalibration(): Promise<number> {
  const result = await callLearner("calibrate_confidence") as { calibration?: { suggested_adjustment: number } } | null;
  return result?.calibration?.suggested_adjustment || 0;
}

async function recordTrade(data: {
  market_slug: string;
  leg1_token_id: string;
  leg1_side: string;
  leg1_price: number;
  leg1_size: number;
  leg2_token_id: string;
  leg2_side: string;
  leg2_price: number;
  leg2_size: number;
  execution_strategy?: string;
}): Promise<string | null> {
  const result = await callLearner("record_trade", data) as { trade_id?: string } | null;
  return result?.trade_id || null;
}

async function recordOutcome(data: {
  trade_id: string;
  outcome: string;
  leg1_fill_time_ms?: number;
  leg2_fill_time_ms?: number;
  profit_loss_usdc?: number;
  error_message?: string;
}): Promise<void> {
  await callLearner("record_outcome", data);
}

async function recordSnapshot(data: {
  trade_id: string;
  snapshot_type: string;
  orderbook_spread?: number;
  orderbook_depth_at_price?: number;
  mid_price?: number;
  best_bid?: number;
  best_ask?: number;
  token_id?: string;
}): Promise<void> {
  await callLearner("record_snapshot", data);
}

async function recordAIDecision(data: {
  trade_id: string;
  decision: string;
  confidence_score: number;
  reasoning: string;
  model_used: string;
  tokens_used?: number;
  response_time_ms?: number;
  historical_fill_rate?: number;
  historical_sample_size?: number;
  confidence_adjustment?: number;
}): Promise<void> {
  await callLearner("record_decision", data);
}

// =============================================================================
// Market Data
// =============================================================================

async function getOrderbookData(client: typeof ClobClient, tokenId: string): Promise<MarketData> {
  try {
    const orderbook = await client.getOrderBook(tokenId);

    const bestBid = orderbook.bids && orderbook.bids.length > 0
      ? parseFloat(orderbook.bids[0].price)
      : undefined;
    const bestAsk = orderbook.asks && orderbook.asks.length > 0
      ? parseFloat(orderbook.asks[0].price)
      : undefined;

    let spread: number | undefined;
    let depthAtPrice: number | undefined;

    if (bestBid !== undefined && bestAsk !== undefined) {
      spread = bestAsk - bestBid;
    }

    if (orderbook.bids && orderbook.bids.length > 0) {
      depthAtPrice = parseFloat(orderbook.bids[0].size);
    }

    return { best_bid: bestBid, best_ask: bestAsk, spread, depth_at_price: depthAtPrice };
  } catch (error) {
    console.error("Error fetching orderbook:", error);
    return {};
  }
}

// =============================================================================
// AI Decision Making
// =============================================================================

function buildAIPrompt(
  patterns: LearnedPattern[],
  marketData: MarketData,
  request: ArbitrageBotRequest,
  calibrationAdjustment: number
): { systemPrompt: string; userPrompt: string } {
  const spreadPattern = patterns.find(p =>
    p.pattern_type === "spread_fill_rate" &&
    marketData.spread !== undefined
  );

  const historicalContext = patterns.length > 0
    ? patterns.map(p => `- ${p.pattern_type}: ${p.fill_rate_percent}% fill rate (n=${p.sample_size})`).join("\n")
    : "No historical patterns available yet.";

  const systemPrompt = `You are an AI arbitrage trading assistant. Your role is to analyze market conditions and decide whether to execute, wait, or skip an arbitrage opportunity.

You must respond with a JSON object containing:
{
  "decision": "execute" | "wait" | "skip",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of your decision"
}

Consider these factors:
1. Orderbook spread (tighter is better for fills)
2. Historical fill rates from learned patterns
3. Order size relative to liquidity
4. Time sensitivity of the opportunity

Historical patterns from learning system:
${historicalContext}

Current confidence calibration adjustment: ${calibrationAdjustment > 0 ? "+" : ""}${calibrationAdjustment}
(Apply this adjustment to your raw confidence score)`;

  const userPrompt = `Analyze this arbitrage opportunity:

Market: ${request.market_slug}
Leg 1: ${request.leg1_side} ${request.leg1_size} @ ${request.leg1_price}
Leg 2: ${request.leg2_side} ${request.leg2_size} @ ${request.leg2_price}

Current Market Conditions:
- Best Bid: ${marketData.best_bid ?? "unknown"}
- Best Ask: ${marketData.best_ask ?? "unknown"}
- Spread: ${marketData.spread ?? "unknown"}
- Depth at price: ${marketData.depth_at_price ?? "unknown"}

${spreadPattern ? `Historical fill rate for this spread level: ${spreadPattern.fill_rate_percent}% (based on ${spreadPattern.sample_size} trades)` : ""}

Should we execute this trade now, wait for better conditions, or skip entirely?`;

  return { systemPrompt, userPrompt };
}

async function getAIDecision(
  patterns: LearnedPattern[],
  marketData: MarketData,
  request: ArbitrageBotRequest,
  calibrationAdjustment: number,
  model: string
): Promise<{ decision: string; confidence: number; reasoning: string; tokensUsed?: number; responseTimeMs: number }> {
  const startTime = Date.now();
  const { systemPrompt, userPrompt } = buildAIPrompt(patterns, marketData, request, calibrationAdjustment);

  const useOpenAI = isOpenAIModel(model);
  let text: string;
  let tokensUsed: number | undefined;

  try {
    if (useOpenAI) {
      const response = await callOpenAIResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        model,
        1
      );

      tokensUsed = response.usage?.total_tokens;

      const content: OpenAIOutputText[] = [];
      for (const item of response.output) {
        if (item.type === "message") {
          const messageItem = item as OpenAIMessage;
          content.push(...messageItem.content);
        }
      }

      text = content
        .map((item) => item.text)
        .filter((t) => t !== undefined)
        .join("");
    } else {
      const response = await callGrokResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        model,
        1
      );

      tokensUsed = response.usage?.total_tokens;

      const content: GrokOutputText[] = [];
      for (const item of response.output) {
        if (item.type === "message") {
          const messageItem = item as GrokMessage;
          content.push(...messageItem.content);
        }
      }

      text = content
        .map((item) => item.text)
        .filter((t) => t !== undefined)
        .join("");
    }

    const parsed = JSON.parse(text);
    const responseTimeMs = Date.now() - startTime;

    // Apply calibration adjustment
    let adjustedConfidence = parsed.confidence + calibrationAdjustment;
    adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

    return {
      decision: parsed.decision || "skip",
      confidence: adjustedConfidence,
      reasoning: parsed.reasoning || "No reasoning provided",
      tokensUsed,
      responseTimeMs,
    };
  } catch (error) {
    console.error("AI decision error:", error);
    return {
      decision: "skip",
      confidence: 0.5,
      reasoning: `AI error: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// Order Execution
// =============================================================================

/**
 * Place an order with feeRateBps: 1000
 * IMPORTANT: ALL orders MUST include feeRateBps: 1000
 */
async function placeOrder(
  client: typeof ClobClient,
  tokenId: string,
  price: number,
  size: number,
  side: "BUY" | "SELL"
): Promise<OrderResult> {
  const startTime = Date.now();

  try {
    // CRITICAL: feeRateBps: 1000 is REQUIRED on ALL orders
    const orderResponse = await client.createAndPostOrder(
      {
        tokenID: tokenId,
        price: price,
        side: side === "BUY" ? Side.BUY : Side.SELL,
        size: Math.floor(size),
        feeRateBps: 1000, // REQUIRED: Always set to 1000
      },
      {
        tickSize: DEFAULT_TICK_SIZE,
        negRisk: DEFAULT_NEG_RISK,
      },
      OrderType.GTC
    );

    const fillTimeMs = Date.now() - startTime;

    return {
      success: true,
      order_id: orderResponse?.orderID || orderResponse?.id,
      fill_time_ms: fillTimeMs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Cancel an order
 */
async function cancelOrder(client: typeof ClobClient, orderId: string): Promise<boolean> {
  try {
    await client.cancelOrder(orderId);
    return true;
  } catch (error) {
    console.error("Cancel order error:", error);
    return false;
  }
}

/**
 * Monitor order for fill using polling (WebSocket would be preferred in production)
 */
async function waitForFill(
  client: typeof ClobClient,
  orderId: string,
  maxWaitMs: number,
  logs: string[]
): Promise<{ filled: boolean; fill_time_ms?: number }> {
  const startTime = Date.now();
  const pollInterval = 500; // 500ms polling

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const order = await client.getOrder(orderId);

      if (!order) {
        logs.push(`Order ${orderId.slice(0, 8)}... not found`);
        return { filled: false };
      }

      const sizeMatched = parseFloat(order.size_matched || "0");
      const originalSize = parseFloat(order.original_size || "0");

      if (sizeMatched >= originalSize * 0.99) { // 99% filled is considered complete
        const fillTimeMs = Date.now() - startTime;
        logs.push(`Order ${orderId.slice(0, 8)}... filled in ${fillTimeMs}ms`);
        return { filled: true, fill_time_ms: fillTimeMs };
      }

      if (order.status === "CANCELLED" || order.status === "EXPIRED") {
        logs.push(`Order ${orderId.slice(0, 8)}... ${order.status}`);
        return { filled: false };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logs.push(`Error checking order: ${error instanceof Error ? error.message : "Unknown"}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  logs.push(`Order ${orderId.slice(0, 8)}... timeout after ${maxWaitMs}ms`);
  return { filled: false };
}

/**
 * Unwind a position by placing opposing order
 * IMPORTANT: feeRateBps: 1000 is set on ALL createOrder calls
 */
async function unwindPosition(
  client: typeof ClobClient,
  tokenId: string,
  size: number,
  currentPrice: number,
  logs: string[]
): Promise<OrderResult> {
  logs.push(`Unwinding position: SELL ${size} @ ${currentPrice}`);

  // CRITICAL: feeRateBps: 1000 is REQUIRED on ALL orders including unwind
  return await placeOrder(client, tokenId, currentPrice, size, "SELL");
}

// =============================================================================
// Graduated Response System
// =============================================================================

async function executeWithGraduatedResponse(
  client: typeof ClobClient,
  request: ArbitrageBotRequest,
  tradeId: string,
  logs: string[]
): Promise<{ leg1: OrderResult; leg2: OrderResult; outcome: string }> {
  const maxWaitMs = request.max_wait_ms || 30000; // Default 30 seconds
  const repriceThreshold = maxWaitMs * 0.5; // Reprice at 50% of wait time
  const unwindThreshold = maxWaitMs * 0.8; // Unwind at 80% of wait time

  // Step 1: Place Leg 1
  logs.push(`Placing Leg 1: ${request.leg1_side} ${request.leg1_size} @ ${request.leg1_price}`);
  const leg1Result = await placeOrder(
    client,
    request.leg1_token_id,
    request.leg1_price,
    request.leg1_size,
    request.leg1_side
  );

  if (!leg1Result.success || !leg1Result.order_id) {
    logs.push(`Leg 1 failed: ${leg1Result.error}`);
    return { leg1: leg1Result, leg2: { success: false, error: "Leg 1 failed" }, outcome: "neither" };
  }

  logs.push(`Leg 1 placed: ${leg1Result.order_id.slice(0, 8)}...`);

  // Record snapshot after leg 1 placed
  const leg1MarketData = await getOrderbookData(client, request.leg1_token_id);
  await recordSnapshot({
    trade_id: tradeId,
    snapshot_type: "leg1_placed",
    orderbook_spread: leg1MarketData.spread,
    orderbook_depth_at_price: leg1MarketData.depth_at_price,
    mid_price: leg1MarketData.best_bid && leg1MarketData.best_ask
      ? (leg1MarketData.best_bid + leg1MarketData.best_ask) / 2
      : undefined,
    best_bid: leg1MarketData.best_bid,
    best_ask: leg1MarketData.best_ask,
    token_id: request.leg1_token_id,
  });

  // Step 2: Wait for Leg 1 fill with graduated responses
  const leg1StartTime = Date.now();
  let leg1Filled = false;
  let leg1FillTimeMs: number | undefined;

  // Wait Phase
  logs.push("WAIT phase: Monitoring Leg 1 for fill...");
  while (Date.now() - leg1StartTime < repriceThreshold && !leg1Filled) {
    const result = await waitForFill(client, leg1Result.order_id, 2000, logs);
    if (result.filled) {
      leg1Filled = true;
      leg1FillTimeMs = result.fill_time_ms;
      break;
    }
  }

  // Reprice Phase (if not filled)
  if (!leg1Filled && Date.now() - leg1StartTime < unwindThreshold) {
    logs.push("REPRICE phase: Leg 1 not filled, attempting reprice...");

    // Cancel original order
    await cancelOrder(client, leg1Result.order_id);

    // Get updated market data
    const updatedMarketData = await getOrderbookData(client, request.leg1_token_id);
    const newPrice = request.leg1_side === "BUY"
      ? (updatedMarketData.best_ask || request.leg1_price)
      : (updatedMarketData.best_bid || request.leg1_price);

    logs.push(`Repricing from ${request.leg1_price} to ${newPrice}`);

    const repricedOrder = await placeOrder(
      client,
      request.leg1_token_id,
      newPrice,
      request.leg1_size,
      request.leg1_side
    );

    if (repricedOrder.success && repricedOrder.order_id) {
      leg1Result.order_id = repricedOrder.order_id;

      // Wait for repriced order
      while (Date.now() - leg1StartTime < unwindThreshold && !leg1Filled) {
        const result = await waitForFill(client, repricedOrder.order_id, 2000, logs);
        if (result.filled) {
          leg1Filled = true;
          leg1FillTimeMs = Date.now() - leg1StartTime;
          break;
        }
      }
    }
  }

  // Unwind Phase (if still not filled)
  if (!leg1Filled && request.auto_unwind !== false) {
    logs.push("UNWIND phase: Leg 1 not filled after reprice, cancelling...");
    await cancelOrder(client, leg1Result.order_id!);
    return {
      leg1: { ...leg1Result, success: false, error: "Cancelled after timeout" },
      leg2: { success: false, error: "Not attempted - Leg 1 failed" },
      outcome: "neither"
    };
  }

  if (!leg1Filled) {
    return {
      leg1: { ...leg1Result, success: false, error: "Not filled within timeout" },
      leg2: { success: false, error: "Not attempted - Leg 1 not filled" },
      outcome: "neither"
    };
  }

  leg1Result.fill_time_ms = leg1FillTimeMs;
  logs.push(`Leg 1 filled in ${leg1FillTimeMs}ms`);

  // Record snapshot after leg 1 filled
  await recordSnapshot({
    trade_id: tradeId,
    snapshot_type: "leg1_filled",
    token_id: request.leg1_token_id,
  });

  // Step 3: Place Leg 2
  logs.push(`Placing Leg 2: ${request.leg2_side} ${request.leg2_size} @ ${request.leg2_price}`);
  const leg2Result = await placeOrder(
    client,
    request.leg2_token_id,
    request.leg2_price,
    request.leg2_size,
    request.leg2_side
  );

  if (!leg2Result.success || !leg2Result.order_id) {
    logs.push(`Leg 2 failed: ${leg2Result.error}`);

    // Unwind Leg 1 if Leg 2 fails
    if (request.auto_unwind !== false) {
      logs.push("Auto-unwinding Leg 1 due to Leg 2 failure...");
      const unwindResult = await unwindPosition(
        client,
        request.leg1_token_id,
        request.leg1_size,
        request.leg1_price * 0.99, // Slightly worse price for immediate fill
        logs
      );

      if (unwindResult.success) {
        return { leg1: leg1Result, leg2: leg2Result, outcome: "unwound" };
      }
    }

    return { leg1: leg1Result, leg2: leg2Result, outcome: "leg1_only" };
  }

  logs.push(`Leg 2 placed: ${leg2Result.order_id.slice(0, 8)}...`);

  // Record snapshot after leg 2 placed
  await recordSnapshot({
    trade_id: tradeId,
    snapshot_type: "leg2_placed",
    token_id: request.leg2_token_id,
  });

  // Step 4: Wait for Leg 2 fill
  const leg2WaitResult = await waitForFill(client, leg2Result.order_id, maxWaitMs / 2, logs);

  if (!leg2WaitResult.filled) {
    logs.push("Leg 2 not filled, attempting reprice...");

    // Cancel and reprice
    await cancelOrder(client, leg2Result.order_id);
    const updatedMarketData = await getOrderbookData(client, request.leg2_token_id);
    const newPrice = request.leg2_side === "BUY"
      ? (updatedMarketData.best_ask || request.leg2_price)
      : (updatedMarketData.best_bid || request.leg2_price);

    const repricedOrder = await placeOrder(
      client,
      request.leg2_token_id,
      newPrice,
      request.leg2_size,
      request.leg2_side
    );

    if (repricedOrder.success && repricedOrder.order_id) {
      const repricedWaitResult = await waitForFill(repricedOrder.order_id, maxWaitMs / 4, [], logs);

      if (repricedWaitResult.filled) {
        leg2Result.fill_time_ms = repricedWaitResult.fill_time_ms;

        await recordSnapshot({
          trade_id: tradeId,
          snapshot_type: "leg2_filled",
          token_id: request.leg2_token_id,
        });

        return { leg1: leg1Result, leg2: leg2Result, outcome: "both_filled" };
      }
    }

    // Unwind both legs if Leg 2 still not filled
    if (request.auto_unwind !== false) {
      logs.push("Unwinding both legs...");
      await unwindPosition(client, request.leg1_token_id, request.leg1_size, request.leg1_price * 0.99, logs);
      return { leg1: leg1Result, leg2: { ...leg2Result, success: false }, outcome: "unwound" };
    }

    return { leg1: leg1Result, leg2: { ...leg2Result, success: false }, outcome: "leg1_only" };
  }

  leg2Result.fill_time_ms = leg2WaitResult.fill_time_ms;
  logs.push(`Leg 2 filled in ${leg2Result.fill_time_ms}ms`);

  await recordSnapshot({
    trade_id: tradeId,
    snapshot_type: "leg2_filled",
    token_id: request.leg2_token_id,
  });

  return { leg1: leg1Result, leg2: leg2Result, outcome: "both_filled" };
}

// =============================================================================
// Main Handler
// =============================================================================

// @ts-ignore - Deno global
Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("AI Arbitrage Bot received request:", req.method);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: ArbitrageBotRequest = await req.json();
    const model = request.model || "grok-4-1-fast-reasoning";
    const logs: string[] = [];

    logs.push(`Starting arbitrage bot for ${request.market_slug}`);

    // Initialize CLOB client
    logs.push("Initializing CLOB client...");
    const client = await initClobClient();
    logs.push("CLOB client initialized");

    // Get learned patterns
    logs.push("Fetching learned patterns...");
    const patterns = await getLearnedPatterns();
    logs.push(`Found ${patterns.length} learned patterns`);

    // Get market data
    logs.push("Fetching orderbook data...");
    const marketData = await getOrderbookData(client, request.leg1_token_id);
    logs.push(`Orderbook: bid=${marketData.best_bid}, ask=${marketData.best_ask}, spread=${marketData.spread}`);

    // Get confidence calibration
    const calibrationAdjustment = await getConfidenceCalibration();
    logs.push(`Confidence calibration adjustment: ${calibrationAdjustment}`);

    // Get AI decision
    logs.push("Getting AI decision...");
    const aiDecision = await getAIDecision(patterns, marketData, request, calibrationAdjustment, model);
    logs.push(`AI Decision: ${aiDecision.decision} (confidence: ${aiDecision.confidence})`);
    logs.push(`AI Reasoning: ${aiDecision.reasoning}`);

    // Record trade to learning system
    logs.push("Recording trade to learning system...");
    const tradeId = await recordTrade({
      market_slug: request.market_slug,
      leg1_token_id: request.leg1_token_id,
      leg1_side: request.leg1_side,
      leg1_price: request.leg1_price,
      leg1_size: request.leg1_size,
      leg2_token_id: request.leg2_token_id,
      leg2_side: request.leg2_side,
      leg2_price: request.leg2_price,
      leg2_size: request.leg2_size,
      execution_strategy: "graduated_response",
    });

    if (!tradeId) {
      logs.push("Warning: Failed to record trade to learning system");
    } else {
      logs.push(`Trade recorded with ID: ${tradeId.slice(0, 8)}...`);

      // Record pre-trade snapshot
      await recordSnapshot({
        trade_id: tradeId,
        snapshot_type: "pre_trade",
        orderbook_spread: marketData.spread,
        orderbook_depth_at_price: marketData.depth_at_price,
        mid_price: marketData.best_bid && marketData.best_ask
          ? (marketData.best_bid + marketData.best_ask) / 2
          : undefined,
        best_bid: marketData.best_bid,
        best_ask: marketData.best_ask,
        token_id: request.leg1_token_id,
      });

      // Record AI decision
      const spreadPattern = patterns.find(p => p.pattern_type === "spread_fill_rate");
      await recordAIDecision({
        trade_id: tradeId,
        decision: aiDecision.decision,
        confidence_score: aiDecision.confidence,
        reasoning: aiDecision.reasoning,
        model_used: model,
        tokens_used: aiDecision.tokensUsed,
        response_time_ms: aiDecision.responseTimeMs,
        historical_fill_rate: spreadPattern?.fill_rate_percent,
        historical_sample_size: spreadPattern?.sample_size,
        confidence_adjustment: calibrationAdjustment,
      });
    }

    // Handle AI decision
    let result: TradeResult;

    if (aiDecision.decision === "skip") {
      logs.push("AI recommends skipping this trade");

      if (tradeId) {
        await recordOutcome({
          trade_id: tradeId,
          outcome: "neither",
          error_message: "Skipped by AI recommendation",
        });
      }

      result = {
        success: false,
        trade_id: tradeId || undefined,
        leg1_result: { success: false, error: "Skipped by AI" },
        leg2_result: { success: false, error: "Skipped by AI" },
        outcome: "neither",
        ai_decision: {
          decision: aiDecision.decision,
          confidence: aiDecision.confidence,
          reasoning: aiDecision.reasoning,
        },
        execution_time_ms: Date.now() - startTime,
        logs,
      };
    } else if (aiDecision.decision === "wait") {
      logs.push("AI recommends waiting for better conditions");

      if (tradeId) {
        await recordOutcome({
          trade_id: tradeId,
          outcome: "neither",
          error_message: "Waiting for better conditions",
        });
      }

      result = {
        success: false,
        trade_id: tradeId || undefined,
        leg1_result: { success: false, error: "Waiting" },
        leg2_result: { success: false, error: "Waiting" },
        outcome: "neither",
        ai_decision: {
          decision: aiDecision.decision,
          confidence: aiDecision.confidence,
          reasoning: aiDecision.reasoning,
        },
        execution_time_ms: Date.now() - startTime,
        logs,
      };
    } else {
      // Execute the trade
      logs.push("Executing trade with graduated response system...");

      const executionResult = await executeWithGraduatedResponse(
        client,
        request,
        tradeId || "",
        logs
      );

      // Calculate profit/loss
      let profitLoss: number | undefined;
      if (executionResult.outcome === "both_filled") {
        // For a successful arb, profit = 1.00 - (leg1_price + leg2_price) per share
        const costPerPair = request.leg1_price + request.leg2_price;
        const profitPerPair = 1.0 - costPerPair;
        const minShares = Math.min(request.leg1_size, request.leg2_size);
        profitLoss = profitPerPair * minShares;
        logs.push(`Profit locked: $${profitLoss.toFixed(2)}`);
      }

      // Record outcome
      if (tradeId) {
        await recordOutcome({
          trade_id: tradeId,
          outcome: executionResult.outcome,
          leg1_fill_time_ms: executionResult.leg1.fill_time_ms,
          leg2_fill_time_ms: executionResult.leg2.fill_time_ms,
          profit_loss_usdc: profitLoss,
          error_message: executionResult.leg1.error || executionResult.leg2.error,
        });

        // Record post-trade snapshot
        await recordSnapshot({
          trade_id: tradeId,
          snapshot_type: "post_trade",
        });
      }

      result = {
        success: executionResult.outcome === "both_filled",
        trade_id: tradeId || undefined,
        leg1_result: executionResult.leg1,
        leg2_result: executionResult.leg2,
        outcome: executionResult.outcome as TradeResult["outcome"],
        profit_loss_usdc: profitLoss,
        ai_decision: {
          decision: aiDecision.decision,
          confidence: aiDecision.confidence,
          reasoning: aiDecision.reasoning,
        },
        execution_time_ms: Date.now() - startTime,
        logs,
      };
    }

    logs.push(`Total execution time: ${result.execution_time_ms}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        execution_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
