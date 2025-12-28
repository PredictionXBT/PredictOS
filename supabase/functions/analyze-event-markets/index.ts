/**
 * Supabase Edge Function: analyze-event-markets
 * 
 * Analyzes all markets for a specific event to find alpha opportunities and predict outcomes.
 * Supports Kalshi and Polymarket prediction markets via Dome unified API.
 */

import { 
  getKalshiMarketsByEvent as getDomeKalshiMarketsByEvent,
  getPolymarketMarkets,
  buildKalshiMarketUrl as buildDomeKalshiMarketUrl,
  buildPolymarketUrl,
} from "../_shared/dome/endpoints.ts";
import {
  getKalshiMarketsByEvent as getDFlowKalshiMarketsByEvent,
  buildKalshiMarketUrl as buildDFlowKalshiMarketUrl,
} from "../_shared/dflow/endpoints.ts";
import { analyzeEventMarketsPrompt } from "../_shared/ai/prompts/analyzeEventMarkets.ts";
import { callGrokResponses } from "../_shared/ai/callGrok.ts";
import { callOpenAIResponses } from "../_shared/ai/callOpenAI.ts";
import type { GrokMessage, GrokOutputText, OpenAIMessage, OpenAIOutputText } from "../_shared/ai/types.ts";

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

/**
 * Determine if a model is an OpenAI model
 */
function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
}
import type {
  AnalyzeMarketRequest,
  MarketAnalysis,
  AnalyzeMarketResponse,
} from "./types.ts";

/**
 * Extracts event slug from a Polymarket URL
 * Handles URLs like:
 * - https://polymarket.com/event/fed-decision-in-december?tid=1765299517368
 * - https://polymarket.com/event/will-netflix-close-warner-brothers-acquisition-by-end-of-2026
 */
function extractPolymarketEventSlug(url: string): string | null {
  // Remove query parameters
  const urlWithoutParams = url.split('?')[0];
  // Split by '/' and take the last element
  const parts = urlWithoutParams.split('/');
  return parts[parts.length - 1] || null;
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
    let requestBody: AnalyzeMarketRequest;
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

    // Extract parameters
    const { url, question, pmType, model, dataProvider } = requestBody;
    
    // Use provided model or default to grok-4-1-fast-reasoning
    const selectedModel = model || "grok-4-1-fast-reasoning";
    const useOpenAI = isOpenAIModel(selectedModel);
    
    // Use provided dataProvider or default to dome
    const selectedDataProvider = dataProvider || "dome";

    // Validate required parameters
    if (!url) {
      console.log("Missing url parameter");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if market type is supported
    if (pmType !== "Kalshi" && pmType !== "Polymarket") {
      console.log("Unsupported market type:", pmType);
      return new Response(
        JSON.stringify({ success: false, error: "Market type not supported. Use 'Kalshi' or 'Polymarket'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!question) {
      console.log("Missing question parameter");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'question'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let eventIdentifier: string;
    let markets: unknown[];

    if (pmType === "Kalshi") {
      // Extract event ticker from Kalshi URL (last segment, capitalized)
      // e.g., https://kalshi.com/markets/kxcabout/next-cabinet-memeber-out/kxcabout-29 -> KXCABOUT-29
      const urlParts = url.split('/');
      const eventTicker = urlParts[urlParts.length - 1]?.toUpperCase();

      if (!eventTicker) {
        console.log("Could not extract event ticker from URL:", url);
        return new Response(
          JSON.stringify({ success: false, error: "Could not extract event ticker from 'url'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      eventIdentifier = eventTicker;
      const providerName = selectedDataProvider === 'dflow' ? 'DFlow' : 'Dome';
      console.log(`Starting Kalshi analysis via ${providerName} API:`, { eventTicker, question, dataProvider: selectedDataProvider });

      // Fetch all markets for the event via selected API (Dome or DFlow)
      try {
        if (selectedDataProvider === 'dflow') {
          markets = await getDFlowKalshiMarketsByEvent(eventTicker);
        } else {
          markets = await getDomeKalshiMarketsByEvent(eventTicker);
        }
        console.log(`Found ${markets.length} markets for Kalshi event via ${providerName}:`, eventTicker);
      } catch (error) {
        console.error(`Failed to fetch Kalshi markets via ${providerName}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
        return new Response(
          JSON.stringify({
            success: false,
            error: isNotFound
              ? `Event '${eventTicker}' not found on Kalshi (via ${providerName}). Please verify the URL is correct.`
              : `Failed to fetch markets from Kalshi for event '${eventTicker}' via ${providerName}: ${errorMessage}`,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              eventTicker,
              marketsCount: 0,
              question,
              processingTimeMs: Date.now() - startTime,
              platform: "Kalshi",
              dataProvider: selectedDataProvider,
            },
          }),
          { status: isNotFound ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Polymarket via Dome API
      // Extract event slug from URL (remove query params, take last segment)
      // e.g., https://polymarket.com/event/fed-decision-in-december?tid=1765299517368 -> fed-decision-in-december
      const eventSlug = extractPolymarketEventSlug(url);

      if (!eventSlug) {
        console.log("Could not extract event slug from URL:", url);
        return new Response(
          JSON.stringify({ success: false, error: "Could not extract event slug from 'url'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      eventIdentifier = eventSlug;
      console.log("Starting Polymarket analysis via Dome API:", { eventSlug, question });

      // Fetch markets via Dome API
      try {
        const response = await getPolymarketMarkets({ slug: eventSlug });
        markets = response.markets;
        console.log(`Found ${markets.length} markets for Polymarket event:`, eventSlug);
        console.log("Markets:", markets);
      } catch (error) {
        console.error("Failed to fetch Polymarket markets:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("not found");
        return new Response(
          JSON.stringify({
            success: false,
            error: isNotFound
              ? `Event '${eventSlug}' not found on Polymarket. Please verify the URL is correct.`
              : `Failed to fetch markets from Polymarket for event '${eventSlug}': ${errorMessage}`,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              eventTicker: eventSlug,
              marketsCount: 0,
              question,
              processingTimeMs: Date.now() - startTime,
              platform: "Polymarket",
            },
          }),
          { status: isNotFound ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if any markets were found
    if (markets.length === 0) {
      const platformName = pmType === "Kalshi" ? "Kalshi" : "Polymarket";
      const identifierType = pmType === "Kalshi" ? "event ticker" : "event slug";
      return new Response(
        JSON.stringify({
          success: false,
          error: `No markets found for ${identifierType} '${eventIdentifier}' on ${platformName}. Please verify the URL is correct and the event exists.`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            eventTicker: eventIdentifier,
            marketsCount: 0,
            question,
            processingTimeMs: Date.now() - startTime,
            platform: platformName,
          },
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt and call AI
    const { systemPrompt, userPrompt } = analyzeEventMarketsPrompt(markets, eventIdentifier, question, pmType);

    let aiResponseModel: string;
    let aiTokensUsed: number | undefined;
    let text: string;

    if (useOpenAI) {
      console.log("Calling OpenAI with model:", selectedModel);
      const openaiResponse = await callOpenAIResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        selectedModel,
        3
      );
      console.log("OpenAI response received, tokens:", openaiResponse.usage?.total_tokens);

      aiResponseModel = openaiResponse.model;
      aiTokensUsed = openaiResponse.usage?.total_tokens;

      // Parse OpenAI response
      const content: OpenAIOutputText[] = [];
      for (const item of openaiResponse.output) {
        if (item.type === "message") {
          const messageItem = item as OpenAIMessage;
          content.push(...messageItem.content);
        }
      }

      text = content
        .map((item) => item.text)
        .filter((t) => t !== undefined)
        .join("\n");
    } else {
      console.log("Calling Grok AI with model:", selectedModel);
      const grokResponse = await callGrokResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        selectedModel,
        3
      );
      console.log("Grok response received, tokens:", grokResponse.usage?.total_tokens);

      aiResponseModel = grokResponse.model;
      aiTokensUsed = grokResponse.usage?.total_tokens;

      // Parse Grok response
      const content: GrokOutputText[] = [];
      for (const item of grokResponse.output) {
        if (item.type === "message") {
          const messageItem = item as GrokMessage;
          content.push(...messageItem.content);
        }
      }

      text = content
        .map((item) => item.text)
        .filter((t) => t !== undefined)
        .join("\n");
    }

    let analysisResult: MarketAnalysis;
    try {
      analysisResult = JSON.parse(text);
      console.log("Analysis result:", analysisResult.ticker, analysisResult.recommendedAction);
    } catch (parseError) {
      console.error("Failed to parse Grok response:", text.substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse Grok response as JSON: ${text.substring(0, 200)}`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            eventTicker: eventIdentifier,
            marketsCount: markets.length,
            question,
            processingTimeMs: Date.now() - startTime,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success response
    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    // Build market URL based on platform
    let pmMarketUrl: string | undefined;
    if (analysisResult.ticker) {
      if (pmType === "Kalshi") {
        // Use the appropriate URL builder based on data provider
        const kalshiUrl = selectedDataProvider === 'dflow' 
          ? buildDFlowKalshiMarketUrl(analysisResult.ticker)
          : buildDomeKalshiMarketUrl(analysisResult.ticker);
        pmMarketUrl = `Market on @Kalshi: ${kalshiUrl}`;
      } else {
        // For Polymarket, use the event slug
        pmMarketUrl = `Market on @Polymarket: ${buildPolymarketUrl(eventIdentifier)}`;
      }
    }

    const response: AnalyzeMarketResponse = {
      success: true,
      data: analysisResult,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventTicker: eventIdentifier,
        marketsCount: markets.length,
        question,
        processingTimeMs,
        grokModel: aiResponseModel,
        grokTokensUsed: aiTokensUsed,
      },
      "pm-market-url": pmMarketUrl,
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
        metadata: { processingTimeMs: Date.now() - startTime },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

