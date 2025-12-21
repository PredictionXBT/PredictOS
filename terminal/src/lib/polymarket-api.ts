/**
 * Polymarket API utilities for frontend
 * Fetches market data from Gamma API (public, no auth required)
 */

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

/**
 * Supported assets for 15-minute up/down markets
 */
export type SupportedAsset = "BTC" | "SOL" | "ETH" | "XRP";

/**
 * Token IDs for UP and DOWN outcomes
 */
export interface TokenIds {
  up: string;
  down: string;
}

/**
 * Market data from Gamma API
 */
export interface MarketData {
  id: string;
  slug: string;
  title: string;
  question: string;
  conditionId: string;
  clobTokenIds: string;
  outcomes: string;
  outcomePrices: string;
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
}

/**
 * Build market slug for 15-min up/down market
 */
export function buildMarketSlug(asset: SupportedAsset, timestamp: number): string {
  return `${asset.toLowerCase()}-updown-15m-${timestamp}`;
}

/**
 * Get next 15-minute market timestamp
 */
export function getNext15MinTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.ceil(now / 900) * 900;
}

/**
 * Parse token IDs from clobTokenIds string
 * Format: '["token1", "token2"]' where first is UP, second is DOWN
 */
export function parseTokenIds(clobTokenIds: string): TokenIds {
  try {
    const parsed = JSON.parse(clobTokenIds);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return {
        up: parsed[0],
        down: parsed[1],
      };
    }
    throw new Error("Invalid clobTokenIds format");
  } catch (e) {
    throw new Error(`Failed to parse token IDs: ${e}`);
  }
}

/**
 * Fetch market data by slug via API route (avoids CORS)
 */
export async function getMarketBySlug(slug: string): Promise<MarketData | null> {
  try {
    const response = await fetch(`/api/market-data?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Failed to fetch market:", e);
    throw e;
  }
}

/**
 * Get token IDs for the next 15-minute market
 */
export async function getNextMarketTokenIds(
  asset: SupportedAsset
): Promise<{ tokenIds: TokenIds; marketSlug: string; marketEndTime: number } | null> {
  const timestamp = getNext15MinTimestamp();
  const slug = buildMarketSlug(asset, timestamp);

  const market = await getMarketBySlug(slug);
  if (!market) {
    return null;
  }

  const tokenIds = parseTokenIds(market.clobTokenIds);
  const marketEndTime = timestamp + 900; // 15 minutes after start

  return {
    tokenIds,
    marketSlug: slug,
    marketEndTime,
  };
}

/**
 * Get current prices from outcome prices
 */
export function parseOutcomePrices(outcomePrices: string): { upPrice: number; downPrice: number } {
  try {
    const parsed = JSON.parse(outcomePrices);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return {
        upPrice: parseFloat(parsed[0]),
        downPrice: parseFloat(parsed[1]),
      };
    }
    return { upPrice: 0.5, downPrice: 0.5 };
  } catch {
    return { upPrice: 0.5, downPrice: 0.5 };
  }
}
