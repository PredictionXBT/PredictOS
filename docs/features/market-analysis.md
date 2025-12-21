# Market Analysis Setup

This document explains how to configure the environment variables required for the **AI Market Analysis** feature in PredictOS.

## Overview

The Market Analysis feature provides two powerful research capabilities through a tabbed interface:

| Tab | Description | Requirements |
|-----|-------------|--------------|
| **Kalshi/Polymarket** | Paste a prediction market URL and get instant AI-powered analysis with probability estimates, confidence scores, and trading recommendations | Dome API + AI Provider (Grok/OpenAI) |
| **Polyfactual** | Ask any research question and get comprehensive AI-powered answers with citations | Polyfactual API Key |

## Tab Structure

### Kalshi/Polymarket Tab (Default)

The default tab allows you to analyze prediction markets:
- Paste a **Kalshi** or **Polymarket** event URL
- Select your preferred AI model (Grok or OpenAI variants)
- Get instant analysis including:
  - Probability estimates
  - Alpha opportunities
  - Trading recommendations
  - Risk factors

### Polyfactual Tab

The Polyfactual tab provides deep research capabilities:
- Ask any question in natural language
- Get comprehensive, well-researched answers
- Includes citations from authoritative sources
- No model selection needed — uses Polyfactual's Deep Research API

---

## Required Environment Variables

### Kalshi/Polymarket Tab Requirements

Add these to your `supabase/.env.local` file:

#### 1. Dome API Key (Required)

```env
DOME_API_KEY=your_dome_api_key
```

**What it's for:** Dome API provides unified access to prediction market data from Kalshi, Polymarket, and other platforms.

**How to get it:**
1. Go to [https://dashboard.domeapi.io](https://dashboard.domeapi.io)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key

#### 2. AI Provider API Key (One Required)

You need **at least one** of the following AI provider keys:

##### Option A: xAI Grok (Recommended)

```env
XAI_API_KEY=your_xai_api_key
```

**How to get it:**
1. Go to [https://x.ai](https://x.ai)
2. Create an account or sign in
3. Navigate to API section
4. Generate a new API key

##### Option B: OpenAI GPT

```env
OPENAI_API_KEY=your_openai_api_key
```

**How to get it:**
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API Keys
4. Generate a new API key

> 💡 **Note:** You can configure both providers to switch between them in the UI. If both are configured, Grok is selected by default.

---

### Polyfactual Tab Requirements

Add this to your `supabase/.env.local` file:

#### Polyfactual API Key (Required for Polyfactual tab)

```env
POLYFACTUAL_API_KEY=your_polyfactual_api_key
```

**What it's for:** Polyfactual Deep Research API provides comprehensive research answers with citations for any question.

**How to get it:**
- Contact Polyfactual to obtain an API key
- API limits: 1,000 character queries, 60 requests/minute, 5-minute timeout

> 💡 **Note:** The Polyfactual tab will only work if `POLYFACTUAL_API_KEY` is configured. The Kalshi/Polymarket tab works independently.

---

## Complete Example

Your `supabase/.env.local` file should look like this:

```env
# =============================================================================
# KALSHI/POLYMARKET TAB
# =============================================================================

# Dome API - Required for market data
DOME_API_KEY=your_dome_api_key

# AI Provider - At least one is required
XAI_API_KEY=your_xai_api_key        # Option A: xAI Grok
OPENAI_API_KEY=your_openai_api_key  # Option B: OpenAI GPT

# =============================================================================
# POLYFACTUAL TAB
# =============================================================================

# Polyfactual Deep Research API
POLYFACTUAL_API_KEY=your_polyfactual_api_key
```

## Frontend Environment Variables

In addition to the backend variables above, you need to configure the frontend (`terminal/.env`):

```env
SUPABASE_URL=<API URL from supabase status>
SUPABASE_ANON_KEY=<anon key from supabase status>

# Edge Function URLs (for local development)
SUPABASE_EDGE_FUNCTION_ANALYZE_EVENT_MARKETS=http://127.0.0.1:54321/functions/v1/analyze-event-markets
SUPABASE_EDGE_FUNCTION_POLYFACTUAL_RESEARCH=http://127.0.0.1:54321/functions/v1/polyfactual-research
```

## Verification

After setting up your environment variables:

1. Start the Supabase services:
   ```bash
   cd supabase
   supabase start
   supabase functions serve --env-file .env.local
   ```

2. Start the frontend:
   ```bash
   cd terminal
   npm run dev
   ```

3. Navigate to [http://localhost:3000/market-analysis](http://localhost:3000/market-analysis)

4. **Test Kalshi/Polymarket tab:** Paste a Kalshi or Polymarket URL to test the analysis feature

5. **Test Polyfactual tab:** Click the "Polyfactual" tab and ask any research question

## Troubleshooting

| Error | Solution |
|-------|----------|
| "DOME_API_KEY is not configured" | Add your Dome API key to `.env.local` |
| "No AI provider configured" | Add either XAI_API_KEY or OPENAI_API_KEY |
| "POLYFACTUAL_API_KEY is not set" | Add your Polyfactual API key to `.env.local` |
| "Invalid API key" | Double-check your API keys are correct and active |
| "Rate limit exceeded" | Wait a few minutes or upgrade your API plan |
| "Query exceeds maximum length" | Polyfactual queries must be under 1,000 characters |

---

← [Back to main README](../../README.md)
