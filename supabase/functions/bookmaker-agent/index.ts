/**
 * Supabase Edge Function: bookmaker-agent
 * 
 * Aggregates multiple agent analyses into a consolidated assessment.
 * Acts as a "judge" that weighs different agent opinions.
 */

import { bookmakerAnalysisPrompt } from "../_shared/ai/prompts/bookmakerAnalysis.ts";
import { callGrokResponses } from "../_shared/ai/callGrok.ts";
import { callOpenAIResponses } from "../_shared/ai/callOpenAI.ts";
import type { GrokMessage, GrokOutputText, OpenAIMessage, OpenAIOutputText } from "../_shared/ai/types.ts";
import type {
  AnalysisAggregatorRequest,
  AnalysisAggregatorResponse,
  AggregatedAnalysis,
  X402ResultInput,
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
    let requestBody: AnalysisAggregatorRequest;
    try {
      requestBody = await req.json();
      console.log("Request body received with", requestBody.analyses?.length, "analyses to aggregate");
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { analyses, x402Results, eventIdentifier, pmType, model } = requestBody;

    // Validate required parameters
    const hasAnalyses = analyses && Array.isArray(analyses) && analyses.length > 0;
    const hasX402Results = x402Results && Array.isArray(x402Results) && x402Results.length > 0;
    
    if (!hasAnalyses && !hasX402Results) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'analyses' or 'x402Results' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalResults = (analyses?.length || 0) + (x402Results?.length || 0);
    if (totalResults < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Need at least 2 data sources (analyses + PayAI results) to aggregate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Aggregating ${analyses?.length || 0} analyses + ${x402Results?.length || 0} PayAI results`);

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

    // Build prompt and call AI
    const agentAnalyses = (analyses || []).map(a => ({
      agentId: a.agentId,
      model: a.model,
      analysis: a.analysis,
    }));
    
    const { systemPrompt, userPrompt } = bookmakerAnalysisPrompt(agentAnalyses, x402Results || [], eventIdentifier, pmType);

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
      console.log("Calling Grok AI with model:", model);
      const grokResponse = await callGrokResponses(
        userPrompt,
        systemPrompt,
        "json_object",
        model,
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

    let aggregatedResult: AggregatedAnalysis;
    try {
      aggregatedResult = JSON.parse(text);
      console.log("Aggregated result:", aggregatedResult.recommendedAction, "consensus:", aggregatedResult.agentConsensus?.agreementLevel);
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
            agentsAggregated: analyses.length,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    const response: AnalysisAggregatorResponse = {
      success: true,
      data: aggregatedResult,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs,
        model: aiResponseModel,
        tokensUsed: aiTokensUsed,
        agentsAggregated: totalResults,
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
          agentsAggregated: 0,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

