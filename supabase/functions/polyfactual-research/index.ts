/**
 * Supabase Edge Function: polyfactual-research
 * 
 * Provides deep research capabilities using the Polyfactual API.
 * Returns comprehensive answers with citations for any research query.
 */

import { generatePolyfactualAnswer } from "../_shared/polyfactual/client.ts";
import type { PolyfactualResearchRequest, PolyfactualResearchResponse } from "./types.ts";

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
        JSON.stringify({ 
          success: false, 
          error: "Method not allowed. Use POST.",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            query: "",
            processingTimeMs: Date.now() - startTime,
          }
        }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let requestBody: PolyfactualResearchRequest;
    try {
      requestBody = await req.json();
      console.log("Request body:", JSON.stringify(requestBody));
    } catch {
      console.error("Failed to parse request body");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON in request body",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            query: "",
            processingTimeMs: Date.now() - startTime,
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract and validate query
    const { query } = requestBody;

    if (!query || typeof query !== "string") {
      console.log("Missing or invalid query parameter");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required parameter: 'query'",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            query: "",
            processingTimeMs: Date.now() - startTime,
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      console.log("Empty query parameter");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Query cannot be empty",
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            query: "",
            processingTimeMs: Date.now() - startTime,
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting Polyfactual research for query:", trimmedQuery.substring(0, 100));

    // Call Polyfactual API
    const polyfactualResponse = await generatePolyfactualAnswer(trimmedQuery, true);

    // Extract answer and citations from response
    const answerData = polyfactualResponse.data;
    const answer = answerData?.answer || JSON.stringify(answerData);
    const citations = answerData?.citations || [];

    // Return success response
    const processingTimeMs = Date.now() - startTime;
    console.log("Request completed in", processingTimeMs, "ms");

    const response: PolyfactualResearchResponse = {
      success: true,
      answer: typeof answer === "string" ? answer : JSON.stringify(answer),
      citations: Array.isArray(citations) ? citations : [],
      data: answerData,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        query: trimmedQuery,
        processingTimeMs,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    const processingTimeMs = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          query: "",
          processingTimeMs,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

