# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PredictOS is an open-source AI-powered framework for deploying custom trading bots and analysis tools for prediction markets (Kalshi and Polymarket). The architecture is split into a Next.js frontend ("terminal") and Supabase Edge Functions backend running on Deno.

## Development Environment Setup

### Prerequisites
- Node.js v18+
- Docker (required for local Supabase)
- On Windows, use `npx supabase` instead of installing globally (npm global install not supported)

### Initial Setup

1. **Backend (Supabase):**
   ```bash
   cd supabase
   cp .env.example .env.local
   # Edit .env.local with required API keys
   npx supabase start
   npx supabase status  # Get credentials for frontend
   ```

2. **Start Edge Functions server (keep running):**
   ```bash
   cd supabase
   npx supabase functions serve --env-file .env.local
   ```

3. **Frontend (Terminal):**
   ```bash
   cd terminal
   npm install
   cp .env.example .env
   # Edit .env with credentials from `supabase status`
   npm run dev
   ```

Access UI at http://localhost:3000

### Common Commands

**Backend:**
- `npx supabase start` - Start local Supabase stack
- `npx supabase stop` - Stop all services
- `npx supabase status` - Get local credentials
- `npx supabase functions serve --env-file .env.local` - Run Edge Functions
- `npx supabase db reset` - Reset database

**Frontend:**
- `npm run dev` - Start dev server (http://localhost:3000)
- `npm run build` - Production build
- `npm run lint` - Run ESLint

## Architecture

### Two-Tier Architecture

**Frontend (`terminal/`):**
- Next.js 14 with App Router
- React 18 client components
- TailwindCSS for styling
- Runs on port 3000

**Backend (`supabase/`):**
- Supabase Edge Functions (Deno runtime)
- Runs on port 54321
- API routes proxy to Edge Functions for security

### Key Architectural Patterns

1. **Edge Function Structure:**
   - Each feature lives in `supabase/functions/<feature-name>/index.ts`
   - Shared utilities in `supabase/functions/_shared/`
   - Edge Functions export a `Deno.serve()` handler
   - All use CORS headers for browser access

2. **Frontend-Backend Communication:**
   - Frontend calls Next.js API routes (`terminal/src/app/api/`)
   - API routes proxy to Supabase Edge Functions
   - This keeps Supabase credentials server-side
   - Example flow: UI → `/api/limit-order-bot` → Edge Function

3. **Shared Code Organization:**
   ```
   supabase/functions/_shared/
   ├── ai/          # AI provider integrations (xAI, OpenAI)
   ├── dome/        # Dome API client (market data)
   └── polymarket/  # Polymarket CLOB client
       ├── client.ts   # Main client with order placement
       ├── types.ts    # TypeScript definitions
       └── utils.ts    # Helper functions
   ```

## Environment Variables

### Backend (`supabase/.env.local`)

**Market Analysis Feature:**
- `DOME_API_KEY` - Required (https://dashboard.domeapi.io)
- `XAI_API_KEY` or `OPENAI_API_KEY` - At least one required

**Betting Bots Feature:**
- `POLYMARKET_WALLET_PRIVATE_KEY` - Your wallet private key (0x...)
- `POLYMARKET_PROXY_WALLET_ADDRESS` - Polymarket proxy wallet (0x...)

### Frontend (`terminal/.env`)

Get values from `npx supabase status`:
- `SUPABASE_URL` - Usually http://127.0.0.1:54321
- `SUPABASE_ANON_KEY` - Anonymous key from supabase status

Edge Function URLs (auto-configured but can override):
- `SUPABASE_EDGE_FUNCTION_ANALYZE_EVENT_MARKETS`
- `SUPABASE_EDGE_FUNCTION_BETTING_BOT`

## Feature-Specific Guidance

### Betting Bots (Polymarket Arbitrage)

**Bot Behavior:**
- Client-side timer runs in browser (not server-side)
- Interval: 15 minutes (`POLL_INTERVAL_MS = 15 * 60 * 1000`)
- Bot stops if user navigates away from `/betting-bots` page
- Component in `terminal/src/components/BettingBotTerminal.tsx`

**Important Limitations:**
1. **No order monitoring** - Bot only places orders, doesn't track fills
2. **No auto-cancellation** - Unfilled orders remain on Polymarket
3. **No profit claiming** - User must manually claim winnings on Polymarket
4. **No partial fill protection** - If only one side fills, user has directional exposure

**Order Placement:**
- Uses Polymarket CLOB client (`@polymarket/clob-client`)
- Places GTC (Good Till Cancelled) limit orders
- Default price: 0.48 (48 cents)
- Minimum order size: $3 (Polymarket requires 5+ shares)
- Orders placed via `PolymarketClient.placeStraddleOrders()`

**Key Files:**
- `supabase/functions/polymarket-up-down-15-markets-limit-order-bot/index.ts`
- `supabase/functions/_shared/polymarket/client.ts`
- `terminal/src/components/BettingBotTerminal.tsx`
- `terminal/src/app/api/limit-order-bot/route.ts`

### Market Analysis

**Integration Points:**
- Dome API for market data (Kalshi + Polymarket)
- xAI Grok or OpenAI for analysis
- Edge Function: `analyze-event-markets`

## TypeScript Patterns

**Edge Functions (Deno):**
- Use `// @ts-ignore` for Deno npm imports
- Access env vars via `Deno.env.get()`
- Import npm packages with `npm:package-name@version`

**Frontend:**
- Client components: `"use client"` directive
- Type definitions in `terminal/src/types/`
- Shared types between frontend and Edge Functions duplicated

## Critical Implementation Details

### Polymarket Integration

1. **Client Initialization:**
   ```typescript
   // Creates CLOB client with API credentials
   const client = new ClobClient(host, chainId, signer, creds, signatureType, proxyAddress)
   ```

2. **Order Placement:**
   - Price in decimal (0.48 = 48%)
   - Size must be integer shares
   - Uses `OrderType.GTC` (Good Till Cancelled)
   - Default tick size: "0.01"

3. **Market Slugs:**
   - Format: `{asset}-{timestamp}` (e.g., "btc-1234567890")
   - Timestamp is Unix epoch rounded to 15-min intervals
   - Function: `buildMarketSlug()` in `_shared/polymarket/utils.ts`

### Supabase Local Development

- All services run in Docker containers
- Default ports:
  - API/Functions: 54321
  - Database: 54322
  - Studio: 54323
  - Inbucket (email): 54324
- Config in `supabase/config.toml`
- Uses Deno 2.x for Edge Runtime

## Adding New Features

1. Create Edge Function: `supabase/functions/<feature-name>/index.ts`
2. Add shared utilities to `supabase/functions/_shared/`
3. Create Next.js API route: `terminal/src/app/api/<feature>/route.ts`
4. Add frontend components in `terminal/src/components/`
5. Add types to `terminal/src/types/`
6. Update environment variable templates (`.env.example`)

## Testing Workflow

**Local Development:**
1. Start Supabase: `npx supabase start`
2. Start Edge Functions: `npx supabase functions serve --env-file .env.local`
3. Start frontend: `npm run dev` (in terminal/)
4. Access: http://localhost:3000

**Testing Betting Bot:**
- Navigate to http://localhost:3000/betting-bots
- Bot requires USDC balance on Polymarket
- Monitor Polymarket UI for order fills
- Positions must be claimed manually on Polymarket

## Known Issues & Gotchas

1. **Windows Users:** Must use `npx supabase` - global npm install fails
2. **Browser Tab Required:** Betting bot stops when tab is closed or navigated away
3. **Cold Starts:** Edge Functions may timeout on first call (API route has retry logic)
4. **No Order Tracking:** Bot doesn't monitor or cancel orders after placement
5. **Manual Claiming:** Winnings must be claimed manually on Polymarket website
6. **Partial Fill Risk:** No protection if only one side of arbitrage fills

## Security Notes

- Never commit `.env.local` or `.env` files
- Private keys stored in `supabase/.env.local` (backend only)
- Frontend only receives Supabase public keys
- Use dedicated wallet with limited funds for bot trading
- `.gitignore` includes all environment files
