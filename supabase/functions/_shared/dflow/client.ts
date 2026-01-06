/**
 * Base HTTP client for DFlow API
 * DFlow provides Kalshi market data as an alternative to Dome
 */

const DFLOW_API_BASE_URL = 'https://a.prediction-markets-api.dflow.net/api/v1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Gets the DFlow API key from environment variables
 * @returns The API key or throws an error if not configured
 */
function getDFlowApiKey(): string {
  const apiKey = Deno.env.get('DFLOW_API_KEY');
  if (!apiKey) {
    throw new Error('DFLOW_API_KEY is not configured. Get your API key from DFlow: https://x.com/dflow');
  }
  return apiKey;
}

/**
 * Makes a request to the DFlow API
 * @param endpoint The API endpoint (e.g., '/event/{event_ticker}')
 * @param options Request options including method, headers, and params
 * @returns Promise resolving to the parsed JSON response
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, params = {} } = options;
  const apiKey = getDFlowApiKey();

  // Build query string from params
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const url = `${DFLOW_API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DFlow API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

