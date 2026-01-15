/**
 * Supabase Edge Function: ai-arbitrage-learner
 *
 * Self-learning system for arbitrage trading that:
 * 1. Records every trade outcome to the database
 * 2. Extracts patterns from historical trades
 * 3. Provides learned context for AI predictions
 * 4. Tracks AI accuracy and self-calibrates confidence
 */

// @ts-ignore - Deno global
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.47.22";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// Types
// =============================================================================

interface TradeRecord {
  market_slug: string;
  leg1_token_id: string;
  leg1_side: "BUY" | "SELL";
  leg1_price: number;
  leg1_size: number;
  leg1_order_id?: string;
  leg2_token_id: string;
  leg2_side: "BUY" | "SELL";
  leg2_price: number;
  leg2_size: number;
  leg2_order_id?: string;
  execution_strategy?: string;
}

interface TradeOutcome {
  trade_id: string;
  outcome: "both_filled" | "leg1_only" | "leg2_only" | "neither" | "unwound";
  leg1_fill_time_ms?: number;
  leg2_fill_time_ms?: number;
  profit_loss_usdc?: number;
  error_message?: string;
}

interface MarketSnapshot {
  trade_id: string;
  snapshot_type: "pre_trade" | "leg1_placed" | "leg2_placed" | "leg1_filled" | "leg2_filled" | "post_trade";
  orderbook_spread?: number;
  orderbook_depth_at_price?: number;
  orderbook_total_bids?: number;
  orderbook_total_asks?: number;
  mid_price?: number;
  best_bid?: number;
  best_ask?: number;
  volatility_1min?: number;
  volatility_5min?: number;
  price_momentum?: number;
  token_id?: string;
  market_activity_score?: number;
  seconds_since_last_trade?: number;
}

interface AIDecision {
  trade_id: string;
  decision: "execute" | "wait" | "skip" | "reprice" | "unwind" | "scale_down";
  confidence_score: number;
  reasoning: string;
  decision_factors?: Record<string, unknown>;
  model_used: string;
  tokens_used?: number;
  response_time_ms?: number;
  historical_fill_rate?: number;
  historical_sample_size?: number;
  confidence_adjustment?: number;
}

interface LearnedPattern {
  pattern_type: string;
  conditions_json: Record<string, unknown>;
  avg_fill_time_ms?: number;
  fill_rate_percent: number;
  sample_size: number;
  standard_deviation?: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  observation_window_hours?: number;
  profit_when_followed?: number;
  loss_when_ignored?: number;
}

interface PatternQuery {
  pattern_type?: string;
  min_sample_size?: number;
  min_fill_rate?: number;
  max_fill_rate?: number;
}

interface LearnerRequest {
  action: "record_trade" | "record_outcome" | "record_snapshot" | "record_decision" |
          "update_decision_accuracy" | "extract_patterns" | "get_patterns" |
          "get_ai_accuracy" | "get_trade_history" | "calibrate_confidence";
  data?: TradeRecord | TradeOutcome | MarketSnapshot | AIDecision | PatternQuery | { trade_id?: string; was_correct?: boolean; correctness_reason?: string };
}

// =============================================================================
// Database Operations
// =============================================================================

function getSupabaseClient(): SupabaseClient {
  // @ts-ignore - Deno global
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore - Deno global
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Record a new trade attempt
 */
async function recordTrade(supabase: SupabaseClient, trade: TradeRecord): Promise<{ success: boolean; trade_id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("arbitrage_trades")
    .insert({
      market_slug: trade.market_slug,
      leg1_token_id: trade.leg1_token_id,
      leg1_side: trade.leg1_side,
      leg1_price: trade.leg1_price,
      leg1_size: trade.leg1_size,
      leg1_order_id: trade.leg1_order_id,
      leg2_token_id: trade.leg2_token_id,
      leg2_side: trade.leg2_side,
      leg2_price: trade.leg2_price,
      leg2_size: trade.leg2_size,
      leg2_order_id: trade.leg2_order_id,
      execution_strategy: trade.execution_strategy,
      outcome: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error recording trade:", error);
    return { success: false, error: error.message };
  }

  return { success: true, trade_id: data.id };
}

/**
 * Record trade outcome
 */
async function recordOutcome(supabase: SupabaseClient, outcome: TradeOutcome): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("arbitrage_trades")
    .update({
      outcome: outcome.outcome,
      leg1_fill_time_ms: outcome.leg1_fill_time_ms,
      leg2_fill_time_ms: outcome.leg2_fill_time_ms,
      profit_loss_usdc: outcome.profit_loss_usdc,
      error_message: outcome.error_message,
    })
    .eq("id", outcome.trade_id);

  if (error) {
    console.error("Error recording outcome:", error);
    return { success: false, error: error.message };
  }

  // Update AI decision accuracy if applicable
  await updateAIDecisionAccuracy(supabase, outcome.trade_id, outcome.outcome);

  return { success: true };
}

/**
 * Record market snapshot
 */
async function recordSnapshot(supabase: SupabaseClient, snapshot: MarketSnapshot): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const timeOfDay = now.toTimeString().split(" ")[0]; // HH:MM:SS
  const dayOfWeek = now.getDay();

  const { error } = await supabase
    .from("market_snapshots")
    .insert({
      trade_id: snapshot.trade_id,
      snapshot_type: snapshot.snapshot_type,
      orderbook_spread: snapshot.orderbook_spread,
      orderbook_depth_at_price: snapshot.orderbook_depth_at_price,
      orderbook_total_bids: snapshot.orderbook_total_bids,
      orderbook_total_asks: snapshot.orderbook_total_asks,
      mid_price: snapshot.mid_price,
      best_bid: snapshot.best_bid,
      best_ask: snapshot.best_ask,
      volatility_1min: snapshot.volatility_1min,
      volatility_5min: snapshot.volatility_5min,
      price_momentum: snapshot.price_momentum,
      time_of_day: timeOfDay,
      day_of_week: dayOfWeek,
      token_id: snapshot.token_id,
      market_activity_score: snapshot.market_activity_score,
      seconds_since_last_trade: snapshot.seconds_since_last_trade,
    });

  if (error) {
    console.error("Error recording snapshot:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record AI decision
 */
async function recordDecision(supabase: SupabaseClient, decision: AIDecision): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("ai_decisions")
    .insert({
      trade_id: decision.trade_id,
      decision: decision.decision,
      confidence_score: decision.confidence_score,
      reasoning: decision.reasoning,
      decision_factors: decision.decision_factors || {},
      model_used: decision.model_used,
      tokens_used: decision.tokens_used,
      response_time_ms: decision.response_time_ms,
      historical_fill_rate: decision.historical_fill_rate,
      historical_sample_size: decision.historical_sample_size,
      confidence_adjustment: decision.confidence_adjustment,
    });

  if (error) {
    console.error("Error recording decision:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update AI decision accuracy based on trade outcome
 */
async function updateAIDecisionAccuracy(
  supabase: SupabaseClient,
  tradeId: string,
  outcome: string
): Promise<void> {
  // Get the AI decision for this trade
  const { data: decisions } = await supabase
    .from("ai_decisions")
    .select("id, decision")
    .eq("trade_id", tradeId);

  if (!decisions || decisions.length === 0) return;

  for (const decision of decisions) {
    let wasCorrect = false;
    let reason = "";

    // Determine if the decision was correct based on outcome
    switch (decision.decision) {
      case "execute":
        wasCorrect = outcome === "both_filled";
        reason = wasCorrect
          ? "Trade executed successfully with both legs filled"
          : `Trade did not complete as expected: ${outcome}`;
        break;
      case "wait":
        // Wait is correct if the trade would have failed
        wasCorrect = outcome === "leg1_only" || outcome === "leg2_only" || outcome === "neither";
        reason = wasCorrect
          ? "Waiting was correct - market conditions were unfavorable"
          : "Waiting may have missed a good opportunity";
        break;
      case "skip":
        // Skip decisions are harder to evaluate retroactively
        wasCorrect = outcome !== "both_filled";
        reason = wasCorrect
          ? "Skip decision was correct - trade would not have succeeded"
          : "Skip decision may have been too conservative";
        break;
      case "unwind":
        wasCorrect = outcome === "unwound";
        reason = wasCorrect
          ? "Unwind decision successfully executed"
          : `Unwind did not complete as expected: ${outcome}`;
        break;
      default:
        reason = "Unable to evaluate decision accuracy";
    }

    await supabase
      .from("ai_decisions")
      .update({
        was_correct: wasCorrect,
        correctness_reason: reason,
      })
      .eq("id", decision.id);
  }
}

/**
 * Extract patterns from recent trades
 * This is the core learning logic
 */
async function extractPatterns(supabase: SupabaseClient): Promise<{ success: boolean; patterns_extracted: number; error?: string }> {
  // Get the last 500 completed trades
  const { data: trades, error: tradesError } = await supabase
    .from("arbitrage_trades")
    .select(`
      id,
      outcome,
      leg1_price,
      leg2_price,
      leg1_fill_time_ms,
      leg2_fill_time_ms,
      profit_loss_usdc,
      created_at
    `)
    .in("outcome", ["both_filled", "leg1_only", "leg2_only", "neither", "unwound"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (tradesError || !trades || trades.length === 0) {
    return { success: false, patterns_extracted: 0, error: tradesError?.message || "No trades found" };
  }

  // Get snapshots for these trades
  const tradeIds = trades.map(t => t.id);
  const { data: snapshots } = await supabase
    .from("market_snapshots")
    .select("*")
    .in("trade_id", tradeIds)
    .eq("snapshot_type", "pre_trade");

  // Create a map of trade_id to snapshot
  const snapshotMap = new Map<string, MarketSnapshot>();
  for (const snapshot of (snapshots || [])) {
    snapshotMap.set(snapshot.trade_id, snapshot);
  }

  // Calculate patterns
  const patterns: LearnedPattern[] = [];

  // Pattern 1: Fill rate by spread buckets
  const spreadBuckets: Record<string, { fills: number; total: number; fillTimes: number[] }> = {};
  for (const trade of trades) {
    const snapshot = snapshotMap.get(trade.id);
    if (!snapshot?.orderbook_spread) continue;

    const spread = snapshot.orderbook_spread;
    let bucket: string;
    if (spread < 0.005) bucket = "tight_0_0.5";
    else if (spread < 0.01) bucket = "medium_0.5_1";
    else if (spread < 0.02) bucket = "wide_1_2";
    else bucket = "very_wide_2_plus";

    if (!spreadBuckets[bucket]) {
      spreadBuckets[bucket] = { fills: 0, total: 0, fillTimes: [] };
    }

    spreadBuckets[bucket].total++;
    if (trade.outcome === "both_filled") {
      spreadBuckets[bucket].fills++;
      if (trade.leg1_fill_time_ms && trade.leg2_fill_time_ms) {
        spreadBuckets[bucket].fillTimes.push(Math.max(trade.leg1_fill_time_ms, trade.leg2_fill_time_ms));
      }
    }
  }

  for (const [bucket, data] of Object.entries(spreadBuckets)) {
    if (data.total >= 5) { // Minimum sample size
      const fillRate = (data.fills / data.total) * 100;
      const avgFillTime = data.fillTimes.length > 0
        ? Math.round(data.fillTimes.reduce((a, b) => a + b, 0) / data.fillTimes.length)
        : undefined;

      patterns.push({
        pattern_type: "spread_fill_rate",
        conditions_json: { spread_bucket: bucket },
        fill_rate_percent: Math.round(fillRate * 100) / 100,
        avg_fill_time_ms: avgFillTime,
        sample_size: data.total,
        observation_window_hours: 24,
      });
    }
  }

  // Pattern 2: Fill rate by time of day
  const timeSlots: Record<string, { fills: number; total: number }> = {};
  for (const trade of trades) {
    const snapshot = snapshotMap.get(trade.id);
    if (!snapshot) continue;

    // Get hour from time_of_day (format: HH:MM:SS)
    const hour = parseInt(String(snapshot.time_of_day).split(":")[0], 10);
    let slot: string;
    if (hour >= 9 && hour < 12) slot = "morning_9_12";
    else if (hour >= 12 && hour < 15) slot = "afternoon_12_15";
    else if (hour >= 15 && hour < 18) slot = "late_afternoon_15_18";
    else if (hour >= 18 && hour < 21) slot = "evening_18_21";
    else slot = "night_21_9";

    if (!timeSlots[slot]) {
      timeSlots[slot] = { fills: 0, total: 0 };
    }

    timeSlots[slot].total++;
    if (trade.outcome === "both_filled") {
      timeSlots[slot].fills++;
    }
  }

  for (const [slot, data] of Object.entries(timeSlots)) {
    if (data.total >= 5) {
      patterns.push({
        pattern_type: "time_of_day_fill_rate",
        conditions_json: { time_slot: slot },
        fill_rate_percent: Math.round((data.fills / data.total) * 10000) / 100,
        sample_size: data.total,
        observation_window_hours: 24,
      });
    }
  }

  // Pattern 3: Fill rate by price level
  const priceBuckets: Record<string, { fills: number; total: number }> = {};
  for (const trade of trades) {
    const avgPrice = (trade.leg1_price + trade.leg2_price) / 2;
    let bucket: string;
    if (avgPrice < 0.3) bucket = "low_0_30";
    else if (avgPrice < 0.5) bucket = "medium_30_50";
    else if (avgPrice < 0.7) bucket = "high_50_70";
    else bucket = "very_high_70_100";

    if (!priceBuckets[bucket]) {
      priceBuckets[bucket] = { fills: 0, total: 0 };
    }

    priceBuckets[bucket].total++;
    if (trade.outcome === "both_filled") {
      priceBuckets[bucket].fills++;
    }
  }

  for (const [bucket, data] of Object.entries(priceBuckets)) {
    if (data.total >= 5) {
      patterns.push({
        pattern_type: "size_fill_rate",
        conditions_json: { price_bucket: bucket },
        fill_rate_percent: Math.round((data.fills / data.total) * 10000) / 100,
        sample_size: data.total,
        observation_window_hours: 24,
      });
    }
  }

  // Pattern 4: AI accuracy by confidence level
  const { data: aiDecisions } = await supabase
    .from("ai_decisions")
    .select("confidence_score, was_correct")
    .not("was_correct", "is", null);

  if (aiDecisions && aiDecisions.length > 0) {
    const confidenceBuckets: Record<string, { correct: number; total: number }> = {};

    for (const decision of aiDecisions) {
      const conf = decision.confidence_score;
      let bucket: string;
      if (conf < 0.5) bucket = "low_0_50";
      else if (conf < 0.7) bucket = "medium_50_70";
      else if (conf < 0.85) bucket = "high_70_85";
      else bucket = "very_high_85_100";

      if (!confidenceBuckets[bucket]) {
        confidenceBuckets[bucket] = { correct: 0, total: 0 };
      }

      confidenceBuckets[bucket].total++;
      if (decision.was_correct) {
        confidenceBuckets[bucket].correct++;
      }
    }

    for (const [bucket, data] of Object.entries(confidenceBuckets)) {
      if (data.total >= 5) {
        patterns.push({
          pattern_type: "ai_accuracy_by_confidence",
          conditions_json: { confidence_bucket: bucket },
          fill_rate_percent: Math.round((data.correct / data.total) * 10000) / 100,
          sample_size: data.total,
          observation_window_hours: 24,
        });
      }
    }
  }

  // Save patterns to database (upsert based on pattern_type + conditions)
  let patternsExtracted = 0;
  for (const pattern of patterns) {
    // Deactivate old patterns of the same type and conditions
    await supabase
      .from("learned_patterns")
      .update({ is_active: false })
      .eq("pattern_type", pattern.pattern_type)
      .contains("conditions_json", pattern.conditions_json);

    // Insert new pattern
    const { error } = await supabase
      .from("learned_patterns")
      .insert({
        pattern_type: pattern.pattern_type,
        conditions_json: pattern.conditions_json,
        fill_rate_percent: pattern.fill_rate_percent,
        avg_fill_time_ms: pattern.avg_fill_time_ms,
        sample_size: pattern.sample_size,
        observation_window_hours: pattern.observation_window_hours,
        is_active: true,
        last_observed: new Date().toISOString(),
      });

    if (!error) patternsExtracted++;
  }

  return { success: true, patterns_extracted: patternsExtracted };
}

/**
 * Get learned patterns for AI context
 */
async function getPatterns(
  supabase: SupabaseClient,
  query?: PatternQuery
): Promise<{ success: boolean; patterns: LearnedPattern[]; error?: string }> {
  let queryBuilder = supabase
    .from("learned_patterns")
    .select("*")
    .eq("is_active", true)
    .order("sample_size", { ascending: false });

  if (query?.pattern_type) {
    queryBuilder = queryBuilder.eq("pattern_type", query.pattern_type);
  }
  if (query?.min_sample_size) {
    queryBuilder = queryBuilder.gte("sample_size", query.min_sample_size);
  }
  if (query?.min_fill_rate) {
    queryBuilder = queryBuilder.gte("fill_rate_percent", query.min_fill_rate);
  }
  if (query?.max_fill_rate) {
    queryBuilder = queryBuilder.lte("fill_rate_percent", query.max_fill_rate);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return { success: false, patterns: [], error: error.message };
  }

  return { success: true, patterns: data || [] };
}

/**
 * Get AI accuracy statistics
 */
async function getAIAccuracy(supabase: SupabaseClient): Promise<{
  success: boolean;
  accuracy?: {
    overall: number;
    by_decision: Record<string, { correct: number; total: number; accuracy: number }>;
    by_model: Record<string, { correct: number; total: number; accuracy: number }>;
    recent_trend: number; // Accuracy over last 50 decisions
  };
  error?: string
}> {
  const { data: decisions, error } = await supabase
    .from("ai_decisions")
    .select("decision, model_used, was_correct, created_at")
    .not("was_correct", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!decisions || decisions.length === 0) {
    return {
      success: true,
      accuracy: {
        overall: 0,
        by_decision: {},
        by_model: {},
        recent_trend: 0,
      }
    };
  }

  // Calculate overall accuracy
  const totalCorrect = decisions.filter(d => d.was_correct).length;
  const overall = (totalCorrect / decisions.length) * 100;

  // Calculate by decision type
  const byDecision: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const d of decisions) {
    if (!byDecision[d.decision]) {
      byDecision[d.decision] = { correct: 0, total: 0, accuracy: 0 };
    }
    byDecision[d.decision].total++;
    if (d.was_correct) byDecision[d.decision].correct++;
  }
  for (const key of Object.keys(byDecision)) {
    byDecision[key].accuracy = (byDecision[key].correct / byDecision[key].total) * 100;
  }

  // Calculate by model
  const byModel: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const d of decisions) {
    if (!byModel[d.model_used]) {
      byModel[d.model_used] = { correct: 0, total: 0, accuracy: 0 };
    }
    byModel[d.model_used].total++;
    if (d.was_correct) byModel[d.model_used].correct++;
  }
  for (const key of Object.keys(byModel)) {
    byModel[key].accuracy = (byModel[key].correct / byModel[key].total) * 100;
  }

  // Calculate recent trend (last 50)
  const recent = decisions.slice(0, 50);
  const recentCorrect = recent.filter(d => d.was_correct).length;
  const recentTrend = recent.length > 0 ? (recentCorrect / recent.length) * 100 : 0;

  return {
    success: true,
    accuracy: {
      overall: Math.round(overall * 100) / 100,
      by_decision: byDecision,
      by_model: byModel,
      recent_trend: Math.round(recentTrend * 100) / 100,
    },
  };
}

/**
 * Get trade history for display
 */
async function getTradeHistory(
  supabase: SupabaseClient,
  limit: number = 50
): Promise<{ success: boolean; trades: unknown[]; error?: string }> {
  const { data, error } = await supabase
    .from("arbitrage_trades")
    .select(`
      id,
      created_at,
      market_slug,
      leg1_price,
      leg2_price,
      leg1_size,
      leg2_size,
      outcome,
      profit_loss_usdc,
      ai_prediction_correct,
      leg1_fill_time_ms,
      leg2_fill_time_ms
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, trades: [], error: error.message };
  }

  return { success: true, trades: data || [] };
}

/**
 * Calculate confidence adjustment based on historical accuracy
 */
async function calibrateConfidence(supabase: SupabaseClient): Promise<{
  success: boolean;
  calibration?: {
    suggested_adjustment: number;
    reason: string;
    historical_accuracy: number;
    sample_size: number;
  };
  error?: string;
}> {
  const accuracyResult = await getAIAccuracy(supabase);

  if (!accuracyResult.success || !accuracyResult.accuracy) {
    return { success: false, error: accuracyResult.error || "Failed to get accuracy" };
  }

  const { overall, recent_trend } = accuracyResult.accuracy;

  // If we don't have enough data, suggest no adjustment
  const totalDecisions = Object.values(accuracyResult.accuracy.by_decision)
    .reduce((sum, d) => sum + d.total, 0);

  if (totalDecisions < 20) {
    return {
      success: true,
      calibration: {
        suggested_adjustment: 0,
        reason: "Insufficient data for calibration (need at least 20 decisions)",
        historical_accuracy: overall,
        sample_size: totalDecisions,
      },
    };
  }

  // Calculate adjustment based on accuracy
  // If accuracy is 80%, but we're predicting 90% confidence, adjust down
  // If accuracy is 70%, and we're predicting 60% confidence, adjust up
  let adjustment = 0;
  let reason = "";

  if (recent_trend < 50) {
    adjustment = -0.15; // Reduce confidence significantly
    reason = "Recent accuracy is below 50%, significantly reducing confidence";
  } else if (recent_trend < 65) {
    adjustment = -0.1;
    reason = "Recent accuracy is moderate (50-65%), reducing confidence";
  } else if (recent_trend < 75) {
    adjustment = -0.05;
    reason = "Recent accuracy is fair (65-75%), slight confidence reduction";
  } else if (recent_trend > 85) {
    adjustment = 0.05;
    reason = "Recent accuracy is excellent (>85%), slight confidence boost";
  } else {
    reason = "Recent accuracy is good (75-85%), no adjustment needed";
  }

  return {
    success: true,
    calibration: {
      suggested_adjustment: adjustment,
      reason,
      historical_accuracy: recent_trend,
      sample_size: totalDecisions,
    },
  };
}

// =============================================================================
// Main Handler
// =============================================================================

// @ts-ignore - Deno global
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("AI Arbitrage Learner received request:", req.method);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: LearnerRequest = await req.json();
    const { action, data } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'action'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseClient();
    let result: unknown;

    switch (action) {
      case "record_trade":
        if (!data) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing trade data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await recordTrade(supabase, data as TradeRecord);
        break;

      case "record_outcome":
        if (!data) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing outcome data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await recordOutcome(supabase, data as TradeOutcome);
        break;

      case "record_snapshot":
        if (!data) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing snapshot data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await recordSnapshot(supabase, data as MarketSnapshot);
        break;

      case "record_decision":
        if (!data) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing decision data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await recordDecision(supabase, data as AIDecision);
        break;

      case "update_decision_accuracy":
        if (!data || !(data as { trade_id?: string }).trade_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing trade_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updateData = data as { trade_id: string; was_correct?: boolean; correctness_reason?: string };

        if (updateData.was_correct !== undefined) {
          await supabase
            .from("ai_decisions")
            .update({
              was_correct: updateData.was_correct,
              correctness_reason: updateData.correctness_reason,
            })
            .eq("trade_id", updateData.trade_id);
        }
        result = { success: true };
        break;

      case "extract_patterns":
        result = await extractPatterns(supabase);
        break;

      case "get_patterns":
        result = await getPatterns(supabase, data as PatternQuery);
        break;

      case "get_ai_accuracy":
        result = await getAIAccuracy(supabase);
        break;

      case "get_trade_history":
        const limit = (data as { limit?: number })?.limit || 50;
        result = await getTradeHistory(supabase, limit);
        break;

      case "calibrate_confidence":
        result = await calibrateConfidence(supabase);
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

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
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
