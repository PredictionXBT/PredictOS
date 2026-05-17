/**
 * Supabase Edge Function: tge-discord-agent
 *
 * Autonomous TGE monitoring agent:
 * 1. Monitors Discord channels for TGE announcements
 * 2. Discovers market data tools via x402 protocol
 * 3. Fetches Polymarket data through x402 → Dome API
 * 4. Executes trades automatically via CLOB client
 */

import { DiscordMonitor } from "../_shared/discord/monitor.ts";
import {
  hasTGEKeywords,
  extractMatchedKeywords,
  extractProjectName,
  calculateConfidence,
} from "../_shared/discord/keywords.ts";
import type { DiscordMessage } from "../_shared/discord/types.ts";
import { getPolymarketMarkets } from "../_shared/dome/endpoints.ts";
import type { PolymarketMarket as DomeMarket } from "../_shared/dome/types.ts";
import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import { listBazaarSellers, callX402Seller } from "../_shared/x402/client.ts";
import type { X402SellerInfo } from "../_shared/x402/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Request / Response types ───────────────────────────────────────────────

interface TgeDiscordRequest {
  channelId: string;
  checkLatest?: boolean;
  limit?: number;
  /** Polymarket market slug — if omitted, agent tries x402→Dome discovery */
  marketSlug?: string;
  /** Free-text query for x402 market discovery */
  searchQuery?: string;
  /** Auto-trade configuration */
  autoTrade?: AutoTradeConfig;
}

interface AutoTradeConfig {
  enabled: boolean;
  side: "YES" | "NO";
  budgetUsdc: number;
  minConfidence?: number;
}

interface DetectionResult {
  message: DiscordMessage;
  detected: boolean;
  keywords: string[];
  project: string | null;
  confidence: number;
}

interface TradeExecution {
  success: boolean;
  orderId?: string;
  status?: string;
  side: "YES" | "NO";
  price: number;
  size: number;
  costUsd: number;
  marketSlug: string;
  marketTitle: string;
  error?: string;
}

interface X402Discovery {
  name: string;
  resourceUrl: string;
  priceUsdc: string;
  networks: string[];
  marketDataFromX402?: boolean;
}

// ─── Dome API helpers ────────────────────────────────────────────────────────

interface DomeMarketInfo {
  question: string;
  slug: string;
  outcome_prices: number[];
  volume: number;
  liquidity: number;
  active: boolean;
}

/**
 * Search Polymarket markets via Dome API (direct call).
 * This is the primary data path — required for the Dome API prize track.
 */
async function searchMarketsViaDome(query: string): Promise<DomeMarketInfo[]> {
  try {
    console.log("[tge-discord-agent] Dome API: searching markets for:", query);
    const response = await getPolymarketMarkets({
      slug: query,
      active: true,
      limit: 5,
    });

    if (response.markets && response.markets.length > 0) {
      console.log("[tge-discord-agent] Dome API: found", response.markets.length, "markets");
      return response.markets.map((m: DomeMarket) => ({
        question: m.question,
        slug: m.slug,
        outcome_prices: m.outcome_prices,
        volume: m.volume,
        liquidity: m.liquidity,
        active: m.active,
      }));
    }

    // Fallback: try market_slug parameter
    const response2 = await getPolymarketMarkets({
      market_slug: query,
      active: true,
      limit: 5,
    });

    if (response2.markets && response2.markets.length > 0) {
      console.log("[tge-discord-agent] Dome API (market_slug): found", response2.markets.length, "markets");
      return response2.markets.map((m: DomeMarket) => ({
        question: m.question,
        slug: m.slug,
        outcome_prices: m.outcome_prices,
        volume: m.volume,
        liquidity: m.liquidity,
        active: m.active,
      }));
    }

    return [];
  } catch (error) {
    console.warn("[tge-discord-agent] Dome API search failed:", error);
    return [];
  }
}

// ─── x402 helpers ───────────────────────────────────────────────────────────

function scoreSeller(seller: X402SellerInfo, tokens: string[]): number {
  const haystack = [
    seller.name,
    seller.description || "",
    seller.resourceUrl,
    seller.inputDescription || "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

async function discoverX402Tool(query: string): Promise<X402SellerInfo | null> {
  const discoveryUrl = Deno.env.get("X402_DISCOVERY_URL");
  if (!discoveryUrl) return null;

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  try {
    const sellers = await listBazaarSellers({ limit: 50, offset: 0 });
    let best: { seller: X402SellerInfo; score: number } | null = null;

    for (const seller of sellers) {
      const score = scoreSeller(seller, tokens);
      if (score > 0 && (!best || score > best.score)) {
        best = { seller, score };
      }
    }
    return best ? best.seller : null;
  } catch (error) {
    console.warn("[tge-discord-agent] x402 discovery failed:", error);
    return null;
  }
}

async function fetchMarketViaX402(
  searchQuery: string
): Promise<{ markets: Array<Record<string, unknown>>; usedX402: boolean }> {
  try {
    // Try explicit seller URL first, then discover
    let sellerUrl = Deno.env.get("X402_DOME_SELLER_URL");

    if (!sellerUrl) {
      const seller = await discoverX402Tool("polymarket dome market data");
      if (!seller) return { markets: [], usedX402: false };
      sellerUrl = seller.resourceUrl;
      console.log("[tge-discord-agent] Discovered x402 Dome seller:", sellerUrl);
    }

    const result = await callX402Seller(sellerUrl, searchQuery);
    if (result.success && result.data) {
      const data = result.data as Record<string, unknown>;
      const markets = Array.isArray(data)
        ? data
        : Array.isArray(data.markets)
        ? (data.markets as Array<Record<string, unknown>>)
        : [];
      return { markets, usedX402: true };
    }
    return { markets: [], usedX402: true };
  } catch (error) {
    console.warn("[tge-discord-agent] x402 market fetch failed:", error);
    return { markets: [], usedX402: false };
  }
}

// ─── Trade execution ────────────────────────────────────────────────────────

async function executeTrade(
  marketSlug: string,
  side: "YES" | "NO",
  budgetUsdc: number
): Promise<TradeExecution> {
  console.log("[tge-discord-agent] Executing trade:", { marketSlug, side, budgetUsdc });

  try {
    const client = createClientFromEnv();
    const market = await client.getMarketBySlug(marketSlug);

    if (!market) {
      return { success: false, side, price: 0, size: 0, costUsd: 0, marketSlug, marketTitle: "", error: `Market not found: ${marketSlug}` };
    }
    if (!market.acceptingOrders) {
      return { success: false, side, price: 0, size: 0, costUsd: 0, marketSlug, marketTitle: market.title, error: "Market is not accepting orders" };
    }
    if (market.closed) {
      return { success: false, side, price: 0, size: 0, costUsd: 0, marketSlug, marketTitle: market.title, error: "Market is closed" };
    }

    const tokenIds = client.extractTokenIds(market);
    const outcomes: string[] = JSON.parse(market.outcomes || '["Yes", "No"]');
    const prices: string[] = JSON.parse(market.outcomePrices || '["0.5", "0.5"]');

    const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes" || o.toLowerCase() === "up");
    const noIdx = outcomes.findIndex((o) => o.toLowerCase() === "no" || o.toLowerCase() === "down");

    let tokenId: string;
    let currentPrice: number;

    if (side === "YES") {
      tokenId = yesIdx === 0 ? tokenIds.up : tokenIds.down;
      currentPrice = parseFloat(prices[yesIdx >= 0 ? yesIdx : 0]);
    } else {
      tokenId = noIdx === 0 ? tokenIds.up : tokenIds.down;
      currentPrice = parseFloat(prices[noIdx >= 0 ? noIdx : 1]);
    }

    const size = budgetUsdc / currentPrice;

    if (Math.floor(size) < 5) {
      return {
        success: false, side, price: currentPrice, size: Math.floor(size),
        costUsd: budgetUsdc, marketSlug, marketTitle: market.title,
        error: `Budget too small. At ${(currentPrice * 100).toFixed(1)}% need min $${(5 * currentPrice).toFixed(2)}`,
      };
    }

    const orderResponse = await client.placeOrder({
      tokenId,
      price: currentPrice,
      size,
      side: "BUY",
    });

    return {
      success: orderResponse.success,
      orderId: orderResponse.orderId,
      status: orderResponse.status,
      side,
      price: currentPrice,
      size: Math.floor(size),
      costUsd: Math.round(Math.floor(size) * currentPrice * 100) / 100,
      marketSlug,
      marketTitle: market.title,
      error: orderResponse.errorMsg,
    };
  } catch (error) {
    console.error("[tge-discord-agent] Trade error:", error);
    return {
      success: false, side, price: 0, size: 0, costUsd: 0, marketSlug,
      marketTitle: "", error: error instanceof Error ? error.message : "Unknown trade error",
    };
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────

function isDiscordMessage(m: DiscordMessage | null): m is DiscordMessage {
  return m !== null;
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST.", detected: false }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const body = (await req.json()) as TgeDiscordRequest;
    const channelId = body.channelId ? String(body.channelId).trim() : "";

    if (!channelId) {
      return new Response(
        JSON.stringify({ error: "channelId is required", detected: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discordToken = Deno.env.get("DISCORD_TOKEN");
    if (!discordToken) throw new Error("DISCORD_TOKEN not configured");

    const checkLatest = body.checkLatest !== false;
    const limit = typeof body.limit === "number" && body.limit > 0
      ? Math.min(body.limit, 20)
      : 5;

    // ── Step 1: Monitor Discord ──────────────────────────────────────────

    const monitor = new DiscordMonitor(discordToken);
    const messages = checkLatest
      ? [await monitor.getLatestMessage(channelId)]
      : await monitor.getMessages(channelId, limit);

    const validMessages = messages.filter(isDiscordMessage);

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ detected: false, status_message: "No messages found in channel", checked_messages: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Detect TGE keywords ──────────────────────────────────────

    const results: DetectionResult[] = validMessages.map((message) => {
      const detected = hasTGEKeywords(message.content);
      const keywords = detected ? extractMatchedKeywords(message.content) : [];
      const project = detected ? extractProjectName(message.content) : null;
      const confidence = detected ? calculateConfidence(message.content, keywords) : 0;
      return { message, detected, keywords, project, confidence };
    });

    const bestMatch = results
      .filter((r) => r.detected)
      .sort((a, b) => b.confidence - a.confidence)[0];

    // ── Step 3: x402 tool discovery ──────────────────────────────────────

    const toolDiscovery = await discoverX402Tool("polymarket market data prediction");

    const x402Info: X402Discovery | null = toolDiscovery
      ? {
          name: toolDiscovery.name,
          resourceUrl: toolDiscovery.resourceUrl,
          priceUsdc: toolDiscovery.priceUsdc,
          networks: toolDiscovery.networks,
        }
      : null;

    // ── No TGE detected → return early ───────────────────────────────────

    if (!bestMatch) {
      return new Response(
        JSON.stringify({
          detected: false,
          checked_messages: validMessages.length,
          status_message: "No TGE announcements detected",
          tool_discovery: x402Info,
          processingTimeMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4a: Market data via Dome API (direct) ─────────────────────────

    const searchQuery = body.searchQuery || body.marketSlug || bestMatch.project || bestMatch.keywords.join(" ");

    let domeMarkets: DomeMarketInfo[] = [];
    if (searchQuery) {
      domeMarkets = await searchMarketsViaDome(searchQuery);
    }

    // ── Step 4b: Market discovery via x402 (enrichment) ──────────────────

    let x402MarketData: Array<Record<string, unknown>> = [];
    let usedX402ForMarket = false;

    if (searchQuery) {
      const x402Result = await fetchMarketViaX402(searchQuery);
      x402MarketData = x402Result.markets;
      usedX402ForMarket = x402Result.usedX402;
    }

    if (x402Info) {
      x402Info.marketDataFromX402 = usedX402ForMarket;
    }

    // ── Step 5: Trade execution ──────────────────────────────────────────

    let trade: TradeExecution | null = null;

    if (body.autoTrade?.enabled && body.marketSlug) {
      const minConfidence = typeof body.autoTrade.minConfidence === "number"
        ? Math.min(Math.max(body.autoTrade.minConfidence, 0), 1)
        : 0.6;

      if (bestMatch.confidence >= minConfidence) {
        trade = await executeTrade(
          body.marketSlug,
          body.autoTrade.side || "YES",
          body.autoTrade.budgetUsdc || 5
        );
      } else {
        trade = {
          success: false,
          side: body.autoTrade.side || "YES",
          price: 0, size: 0, costUsd: 0,
          marketSlug: body.marketSlug, marketTitle: "",
          error: `Confidence ${(bestMatch.confidence * 100).toFixed(0)}% below threshold ${(minConfidence * 100).toFixed(0)}%`,
        };
      }
    }

    // ── Step 6: Response ─────────────────────────────────────────────────

    const response = {
      detected: true,
      project: bestMatch.project || undefined,
      keywords: bestMatch.keywords,
      confidence: bestMatch.confidence,
      message: {
        id: bestMatch.message.id,
        content: bestMatch.message.content.substring(0, 500),
        author: bestMatch.message.author.username,
        timestamp: bestMatch.message.timestamp,
      },
      recommendation: bestMatch.confidence > 0.6
        ? `BUY ${body.autoTrade?.side || "YES"}`
        : "MONITOR",
      reasoning: `Detected ${bestMatch.keywords.length} TGE keyword(s) with ${Math.round(bestMatch.confidence * 100)}% confidence`,
      checked_messages: validMessages.length,

      // Dome API results (direct call)
      dome_markets: domeMarkets.length > 0 ? domeMarkets : undefined,

      // x402 protocol results
      tool_discovery: x402Info,
      x402_market_results: x402MarketData.length > 0 ? x402MarketData.slice(0, 5) : undefined,

      // Trade execution
      trade: trade || undefined,
      processingTimeMs: Date.now() - startTime,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tge-discord-agent] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        detected: false,
        processingTimeMs: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
