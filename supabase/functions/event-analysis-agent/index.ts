/**
 * Supabase Edge Function: event-analysis-agent
 * 
 * Individual analysis agent that takes market data and returns AI analysis.
 * Supports multiple AI models (Grok and OpenAI).
 */

import { analyzeEventMarketsPrompt } from "../_shared/ai/prompts/analyzeEventMarkets.ts";
import { callGrokResponses } from "../_shared/ai/callGrok.ts";
import { callOpenAIResponses } from "../_shared/ai/callOpenAI.ts";
import type { GrokMessage, GrokOutputText, OpenAIMessage, OpenAIOutputText } from "../_shared/ai/types.ts";
import type {
  EventAnalysisAgentRequest,
  EventAnalysisAgentResponse,
  MarketAnalysis,
  GrokTool,
} from "./types.ts";

// OpenAI model identifiers
const OPENAI_MODELS = ["gpt-5.2", "gpt-5.1", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];

/**
 * Determine if a model is an OpenAI model
 */
function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.includes(model) || model.startsWith("gpt-");
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
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: EventAnalysisAgentRequest;
    try {
      requestBody = await req.json();
      console.log("Request body received with", requestBody.markets?.length, "markets");
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { markets, eventIdentifier, pmType, model, question, tools } = requestBody;

    // Validate required parameters
    if (!markets || !Array.isArray(markets) || markets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'markets' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!eventIdentifier) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'eventIdentifier'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pmType || (pmType !== "Kalshi" && pmType !== "Polymarket")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid 'pmType'. Must be 'Kalshi' or 'Polymarket'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: 'model'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useOpenAI = isOpenAIModel(model);
    const defaultQuestion = "What is the best trading opportunity in this market? Analyze the probability and provide a recommendation.";
    const analysisQuestion = question || defaultQuestion;

    // Build prompt and call AI (pass tools to include source requirements in prompt)
    const { systemPrompt, userPrompt } = analyzeEventMarketsPrompt(markets, eventIdentifier, analysisQuestion, pmType, tools);

    let aiResponseModel: string;
    let aiTokensUsed: number | undefined;
    let text: string;

    if (useOpenAI) {
      console.log("Calling OpenAI with model:", model);
      const openaiResponse = await callOpenAIResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        model,
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
      console.log("Calling Grok AI with model:", model, "tools:", tools);
      const grokResponse = await callGrokResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        model,
        3,
        tools as GrokTool[] | undefined
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
    } catch {
      console.error("Failed to parse AI response:", text.substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse AI response as JSON`,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
            model: aiResponseModel,
            tokensUsed: aiTokensUsed,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    const response: EventAnalysisAgentResponse = {
      success: true,
      data: analysisResult,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs,
        model: aiResponseModel,
        tokensUsed: aiTokensUsed,
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
          model: "unknown",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

