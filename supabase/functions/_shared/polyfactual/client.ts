/**
 * Polyfactual Deep Research API Client
 * 
 * A client for the Polyfactual Deep Research API that provides
 * research capabilities with citations.
 * 
 * API Documentation:
 * - Base URL: https://deep-research-api.thekid-solana.workers.dev/
 * - Rate Limit: 60 requests per minute
 * - Query Limit: 1,000 characters
 * - Default Timeout: 5 minutes
 */

import type {
  PolyfactualAnswerRequest,
  PolyfactualResponse,
  PolyfactualSuccessResponse,
} from "./types.ts";

const POLYFACTUAL_BASE_URL = "https://deep-research-api.thekid-solana.workers.dev";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_QUERY_LENGTH = 1000;

/**
 * Get the Polyfactual API key from environment
 */
function getApiKey(): string {
  const apiKey = Deno.env.get("POLYFACTUAL_API_KEY");
  if (!apiKey) {
    throw new Error("POLYFACTUAL_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Make a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Check the health status of the Polyfactual API
 */
export async function checkPolyfactualHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${POLYFACTUAL_BASE_URL}/health`,
      { method: "GET" },
      10000, // 10 second timeout for health check
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate an answer with citations using the Polyfactual Deep Research API
 * 
 * @param query - The research question (max 1000 characters)
 * @param text - Whether to return text output (default: true)
 * @returns The research response with answer and citations
 * @throws Error if the API key is missing, query is too long, or the request fails
 */
export async function generatePolyfactualAnswer(
  query: string,
  text: boolean = true,
): Promise<PolyfactualSuccessResponse> {
  const apiKey = getApiKey();

  // Validate query length
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`);
  }

  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }

  const payload: PolyfactualAnswerRequest = {
    query,
    text,
  };

  console.log("Calling Polyfactual API with query:", query.substring(0, 100) + (query.length > 100 ? "..." : ""));

  const response = await fetchWithTimeout(
    `${POLYFACTUAL_BASE_URL}/answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    },
    DEFAULT_TIMEOUT_MS,
  );

  // Handle HTTP errors
  if (!response.ok) {
    let errorMessage: string;
    
    switch (response.status) {
      case 400:
        errorMessage = "Bad request: Invalid query format or validation error";
        break;
      case 401:
        errorMessage = "Unauthorized: Invalid API key";
        break;
      case 429:
        errorMessage = "Rate limit exceeded: Please wait before making another request";
        break;
      case 500:
        errorMessage = "Internal server error: Polyfactual service is temporarily unavailable";
        break;
      default:
        errorMessage = `Polyfactual API error: ${response.status} ${response.statusText}`;
    }

    // Try to get more details from response body
    try {
      const errorData: PolyfactualResponse = await response.json();
      if (!errorData.success && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use the default error message
    }

    throw new Error(errorMessage);
  }

  const data: PolyfactualResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error from Polyfactual API");
  }

  console.log("Polyfactual response received successfully");
  return data;
}

