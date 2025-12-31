/**
 * Supabase Edge Function: get-events
 * 
 * Extracts event data from prediction market URLs.
 * Supports Kalshi (via Dome/DFlow) and Polymarket (via Gamma API).
 */

import { 
  getKalshiMarketsByEvent as getDomeKalshiMarketsByEvent,
} from "../_shared/dome/endpoints.ts";
import {
  getKalshiMarketsByEvent as getDFlowKalshiMarketsByEvent,
} from "../_shared/dflow/endpoints.ts";
import type {
  GetEventsRequest,
  GetEventsResponse,
  PmType,
  UrlSource,
} from "./types.ts";

/**
 * Extracts event slug from a Polymarket URL
 */
function extractPolymarketEventSlug(url: string): string | null {
  const urlWithoutParams = url.split('?')[0];
  const parts = urlWithoutParams.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Polymarket event and markets response from Gamma API
 */
interface PolymarketGammaEvent {
  id: number | string;
  slug: string;
  title: string;
  description?: string;
  markets: PolymarketGammaMarket[];
  [key: string]: unknown;
}

interface PolymarketGammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  clobTokenIds: string[];
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  [key: string]: unknown;
}

/**
 * Fetches Polymarket event and markets from Gamma API
 * Returns both the event ID and the markets array in a single call
 */
async function getPolymarketEventAndMarkets(slug: string): Promise<{
  eventId: string | null;
  markets: PolymarketGammaMarket[];
}> {
  // Try the query parameter endpoint first, then the path-based endpoint
  const endpoints = [
    `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
    `https://gamma-api.polymarket.com/events/${encodeURIComponent(slug)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Fetching Polymarket event from Gamma API: ${endpoint}`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        console.warn(`Gamma API endpoint ${endpoint} returned ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      // Handle both array response and single object response
      const event: PolymarketGammaEvent | undefined = Array.isArray(data) ? data[0] : data;
      
      if (event && event.markets && Array.isArray(event.markets)) {
        const eventId = event.id !== undefined && event.id !== null ? String(event.id) : null;
        console.log(`Found Polymarket event via Gamma API: eventId=${eventId}, markets=${event.markets.length}`);
        return {
          eventId,
          markets: event.markets,
        };
      }
    } catch (error) {
      console.warn(`Error fetching from Gamma API ${endpoint}:`, error);
    }
  }
  
  console.warn(`Could not fetch Polymarket event for slug ${slug} from Gamma API`);
  return { eventId: null, markets: [] };
}

/**
 * Detect prediction market type and URL source from URL
 * Jupiter URLs (jup.ag/prediction/*) are treated as Kalshi since they use Kalshi event tickers
 */
function detectPmTypeAndSource(url: string): { pmType: PmType | null; urlSource: UrlSource | null } {
  const lowerUrl = url.toLowerCase();
  
  // Jupiter prediction markets are based on Kalshi events
  if (lowerUrl.includes('jup.ag/prediction')) {
    return { pmType: 'Kalshi', urlSource: 'jupiter' };
  }
  
  if (lowerUrl.includes('kalshi')) {
    return { pmType: 'Kalshi', urlSource: 'kalshi' };
  }
  
  if (lowerUrl.includes('polymarket')) {
    return { pmType: 'Polymarket', urlSource: 'polymarket' };
  }
  
  return { pmType: null, urlSource: null };
}

/**
 * Extract Kalshi event ticker from Jupiter URL
 * Jupiter URL format: https://jup.ag/prediction/TICKER (e.g., https://jup.ag/prediction/KXPRESNOMD-28)
 */
function extractJupiterEventTicker(url: string): string | null {
  const urlWithoutParams = url.split('?')[0];
  const parts = urlWithoutParams.split('/');
  const ticker = parts[parts.length - 1];
  return ticker && ticker.length > 0 ? ticker.toUpperCase() : null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Received request:", req.method, req.url);

  try {
    // Validate request method
    if (req.method !== "POST") {
      console.log("Invalid method:", req.method);
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: GetEventsRequest;
    try {
      requestBody = await req.json();
      console.log("Request body:", JSON.stringify(requestBody));
    } catch {
      console.error("Failed to parse request body");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url } = requestBody;

    // Validate URL
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect market type and URL source
    const { pmType, urlSource } = detectPmTypeAndSource(url);
    
    // Enforce data provider based on market type: Kalshi → dflow, Polymarket → dome
    const dataProvider = pmType === 'Kalshi' ? 'dflow' : 'dome';
    if (!pmType || !urlSource) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not detect prediction market type from URL. Use Kalshi, Polymarket, or Jupiter prediction market URLs." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let eventIdentifier: string;
    let eventId: string | undefined;
    let markets: unknown[];

    if (pmType === "Kalshi") {
      // Extract event ticker - handle both Kalshi URLs and Jupiter URLs
      let eventTicker: string | null;
      
      if (urlSource === 'jupiter') {
        // Jupiter URL format: https://jup.ag/prediction/TICKER
        eventTicker = extractJupiterEventTicker(url);
        console.log(`Detected Jupiter prediction market URL, extracted ticker: ${eventTicker}`);
      } else {
        // Kalshi URL format: https://kalshi.com/markets/.../EVENT_TICKER
        const urlParts = url.split('/');
        eventTicker = urlParts[urlParts.length - 1]?.toUpperCase() || null;
      }

      if (!eventTicker) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not extract event ticker from URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      eventIdentifier = eventTicker;
      const providerName = dataProvider === 'dflow' ? 'DFlow' : 'Dome';
      const sourceInfo = urlSource === 'jupiter' ? ' (via Jupiter)' : '';
      console.log(`Fetching Kalshi markets via ${providerName}${sourceInfo}:`, { eventTicker, dataProvider, urlSource });

      try {
        if (dataProvider === 'dflow') {
          markets = await getDFlowKalshiMarketsByEvent(eventTicker);
        } else {
          markets = await getDomeKalshiMarketsByEvent(eventTicker);
        }
        console.log(`Found ${markets.length} markets for Kalshi event via ${providerName}`);
      } catch (error) {
        console.error(`Failed to fetch Kalshi markets via ${providerName}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
        return new Response(
          JSON.stringify({
            success: false,
            error: isNotFound
              ? `Event '${eventTicker}' not found on Kalshi (via ${providerName}).`
              : `Failed to fetch markets: ${errorMessage}`,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
            },
          }),
          { status: isNotFound ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Polymarket via Gamma API (Polymarket's native API)
      const eventSlug = extractPolymarketEventSlug(url);

      if (!eventSlug) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not extract event slug from URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      eventIdentifier = eventSlug;
      console.log("Fetching Polymarket event and markets via Gamma API:", { eventSlug });

      try {
        // Fetch event and markets from Gamma API in a single call
        const { eventId: fetchedEventId, markets: fetchedMarkets } = await getPolymarketEventAndMarkets(eventSlug);
        markets = fetchedMarkets;
        eventId = fetchedEventId || undefined;
        console.log(`Found ${markets.length} markets for Polymarket event via Gamma API, eventId: ${eventId}`);
      } catch (error) {
        console.error("Failed to fetch Polymarket event from Gamma API:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
        return new Response(
          JSON.stringify({
            success: false,
            error: isNotFound
              ? `Event '${eventSlug}' not found on Polymarket.`
              : `Failed to fetch markets from Polymarket: ${errorMessage}`,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
            },
          }),
          { status: isNotFound ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if any markets were found
    if (markets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No markets found for '${eventIdentifier}' on ${pmType}.`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    // For Polymarket, we always use Gamma API; for Kalshi, use the requested provider
    const effectiveDataProvider = pmType === 'Polymarket' ? 'gamma' : dataProvider;

    const response: GetEventsResponse = {
      success: true,
      eventIdentifier,
      eventId,
      pmType,
      urlSource,
      markets,
      marketsCount: markets.length,
      dataProvider: effectiveDataProvider,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

