# Betting Bots Setup

This document explains how to configure the environment variables required for the **Betting Bots** feature in PredictOS.

## Credits

<table>
<tr>
<td width="80">
<img src="https://pbs.twimg.com/profile_images/1853296548395520000/MWnmY-Bt_400x400.jpg" width="60" height="60" style="border-radius: 50%;" alt="mininghelium1" />
</td>
<td>
<strong>Ladder Bot & Dump Sniper</strong><br/>
Developed by <a href="https://x.com/mininghelium1">@mininghelium1</a><br/>
<em>Built the Ladder Mode arbitrage strategy with exponential tapering and the Dump Sniper for catching volatility dumps with real-time WebSocket price monitoring, auto-hedging, and USD profit tracking.</em>
</td>
</tr>
</table>

---

## Overview

The Betting Bots feature includes two strategies for Polymarket's 15-minute up/down markets:

| Bot | Strategy | Risk Profile |
|-----|----------|--------------|
| **Ladder Bot** | Spreads limit orders across price levels for consistent arbitrage | Low risk, consistent returns |
| **Dump Sniper** | Catches price dumps and locks in hedged profits | Higher risk, higher potential returns |

---

## Bot 1: Ladder Bot (Arbitrage)

> 📖 Reference: [x.com/hanakoxbt/status/1999149407955308699](https://x.com/hanakoxbt/status/1999149407955308699)

### Why It Works

This strategy exploits a simple arbitrage opportunity in binary prediction markets:

1. **Find a 15m crypto market with high liquidity**
2. **Place limit orders** on both YES (UP) and NO (DOWN) sides
3. **Wait until both orders are filled**
4. **Total cost** < $1.00 = guaranteed profit

**Regardless of the outcome**, one side always pays out $1.00 — guaranteeing profit when both orders fill.

### The Math

| Scenario | Cost | Payout | Profit |
|----------|------|--------|--------|
| "UP" wins | $0.48 (Up) + $0.48 (Down) = $0.96 | $1.00 | +$0.04 (~4.2%) |
| "DOWN" wins | $0.48 (Up) + $0.48 (Down) = $0.96 | $1.00 | +$0.04 (~4.2%) |

### Ladder Mode

Instead of placing orders at a single price, Ladder Mode spreads your bankroll across multiple price levels with exponential tapering:

```
Price Level    Allocation
49%  ████████████████  (heaviest - most likely to fill)
48%  ████████████
47%  ██████████
46%  ████████
...
35%  ██  (lightest - best price if it fills)
```

**Benefits:**
- Higher fill probability at top rungs
- Better average price if market dumps
- More consistent returns across different market conditions

### Ladder Bot Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Asset | Cryptocurrency to trade (BTC, ETH, SOL, XRP) | BTC |
| Total Bankroll | Total USD to distribute across ladder | $25 |
| Max Price | Highest price level (e.g., 49%) | 49% |
| Min Price | Lowest price level (e.g., 35%) | 35% |
| Taper Factor | How aggressively to reduce allocation (1.0-3.0) | 1.5 |

---

## Bot 2: Dump Sniper

### Why It Works

The Dump Sniper exploits temporary price inefficiencies during high volatility at the start of each 15-minute round:

1. **Wait for market to start** (next :00/:15/:30/:45 mark)
2. **Watch for rapid price dumps** (15%+ drop in 3 seconds) during the watch window
3. **Buy the dumped side immediately** (Leg 1) at a discount via LIMIT order
4. **Wait for hedge opportunity**: Leg1 price + opposite ask ≤ target (e.g., 95¢)
5. **Buy opposite side** (Leg 2) via LIMIT order to lock in guaranteed profit

### Example Trade

```
1. Start sniper at 1:52 PM → waits for 2:00 PM market
2. 2:00 PM: Market starts, bot begins watching for dumps
3. BTC DOWN dumps from 50¢ → 35¢ in 3 seconds (17% drop)
4. Bot places LIMIT BUY: 10 DOWN @ 35¢ = $3.50 (Leg 1)
5. UP is trading at 56¢
6. 35¢ + 56¢ = 91¢ ≤ 95¢ target ✓
7. Bot places LIMIT BUY: 10 UP @ 56¢ = $5.60 (Leg 2)
8. Total cost: $9.10, Payout: $10.00
9. Profit locked: +$0.90 (+9.9% return)
```

### Timing Behavior

The Dump Sniper waits for the **next** 15-minute market round before watching for dumps:

```
NOW ──────────────────────────────────────────────> TIME
     │                    │                    │
  1:52 PM              2:00 PM             2:02 PM
  (started)         (market start)      (window ends)
     │                    │                    │
     └── WAITING ────────►├── WATCHING ───────►│
         FOR MARKET       │   FOR DUMP         │
                          │                    │
                    Start checking       Stop if no
                    for 15% dumps        dump detected
```

### Order Type

All orders are placed as **FOK (Fill-Or-Kill)** orders:
- **Leg 1**: FOK BUY at the post-dump price
- **Leg 2**: FOK BUY at the current opposite price when hedge condition is met

FOK orders either fill immediately and completely, or fail entirely. This gives you immediate confirmation whether the order executed, rather than having hanging orders that might fill later.

### Risk Warning

> ⚠️ **Important**: Profit is NOT guaranteed until **both legs fill**.
>
> After Leg 1 fills, you hold an **unhedged directional position**. If Leg 2 never triggers (opposite side doesn't drop enough) and the market resolves against your position, you can lose your entire Leg 1 investment.
>
> | Scenario | Outcome |
> |----------|---------|
> | Both legs fill | ✅ Guaranteed profit |
> | Leg 1 fills, Leg 2 never fills, your side wins | ✅ Lucky profit |
> | Leg 1 fills, Leg 2 never fills, your side loses | ❌ Lose Leg 1 cost |
> | No dump detected | ⚪ No trade, no loss |

### Dump Sniper Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Asset | Cryptocurrency to watch (BTC, ETH, SOL, XRP) | BTC |
| USD per Leg | USD amount to spend per leg (shares calculated from price) | $5 |
| Sum Target | Maximum pair cost to trigger Leg 2 (e.g., 95¢) | 95¢ |
| Dump Threshold | Minimum drop % to trigger Leg 1 | 15% |
| Watch Window | Minutes from market start to watch for dumps | 2 min |
| Auto-Repeat | Continue watching for next round after completion | OFF |

### UI Features

The Dump Sniper UI displays real-time information:
- **Live prices** for UP, DOWN, and SUM (updated via WebSocket)
- **Countdown timers**: "Market starts in" and "Watch window left"
- **USD costs** for each leg (shares × price)
- **Profit display**: Total cost, guaranteed payout, and locked profit in USD

### How the WebSocket Works

The Dump Sniper uses Polymarket's WebSocket API for real-time price monitoring:

```
WebSocket: wss://ws-subscriptions-clob.polymarket.com/ws/market

1. Subscribe to UP and DOWN token IDs
2. Receive `book` event (initial orderbook snapshot)
3. Receive `price_change` events (real-time updates)
4. Track prices in rolling 3-second window
5. Trigger when drop >= threshold
```

## Required Environment Variables

Add these to your `supabase/.env.local` file:

> **Note:** The betting bots work with any Polymarket login method (social or browser wallet). However, if you also want to use **Auto-Claim** to automatically redeem winning positions, you must use a browser wallet login. See [Auto-Claim Setup](auto-claim.md) for details.

### 1. Polymarket Wallet Private Key (Required)

```env
POLYMARKET_WALLET_PRIVATE_KEY=your_wallet_private_key
```

**What it's for:** This is the private key of your Ethereum wallet that will be used to sign transactions on Polymarket.

**How to get it:**
1. Create an account on P [https://polymarket.com](https://polymarket.com)
2. `profile drop-down` -> `settings` -> `Export Private Key`
3. **⚠️ IMPORTANT:** Never share your private key or commit it to version control

> 🔒 **Security Best Practice:** Create a dedicated wallet for bot trading with only the funds you're willing to risk. Never use your main wallet's private key.

### 2. Polymarket Proxy Wallet Address (Required)

```env
POLYMARKET_PROXY_WALLET_ADDRESS=your_proxy_wallet_address
```

**What it's for:** This is your Polymarket proxy wallet address, which is used for placing orders on Polymarket's CLOB (Central Limit Order Book).

**How to get it:**
1. Create an account on [https://polymarket.com](https://polymarket.com)
2. Your proxy wallet will be created automatically
3. `profile drop-down` --> `under username` --> `click copy`


> 💡 **Note:** The proxy wallet is different from your main wallet. It's a smart contract wallet that Polymarket creates for you to interact with their order book.

### 3. API Credentials (Required - Auto-Generated)

After adding your private key and proxy address, you MUST generate API credentials:

```bash
cd terminal
npm install  # First time only
node ../scripts/derive-polymarket-creds.js
```

This script will:
1. Derive your unique API credentials from your private key
2. **Automatically update** your `supabase/.env.local` file

> ⚠️ **Re-run this script whenever you change wallets.** Each wallet has unique API credentials.

### 4. Signature Type (Required for Browser Wallets)

```env
POLYMARKET_SIGNATURE_TYPE=2
```

**What it's for:** Tells Polymarket how to verify your order signatures.

| Login Method | Signature Type | Value |
|--------------|----------------|-------|
| Google/Discord/Email (Magic) | Polymarket Proxy | `1` (default) |
| MetaMask/Rabby/Coinbase Wallet | Gnosis Safe | `2` |
| Direct EOA (rare) | No proxy | `0` |

> ⚠️ **If you use a browser wallet (MetaMask, Rabby, etc.), you MUST set `POLYMARKET_SIGNATURE_TYPE=2`** or your orders will silently fail.

## Complete Example

Your `supabase/.env.local` file should include these for betting bots:

```env
# Polymarket Bot Configuration - Required for Betting Bots
POLYMARKET_WALLET_PRIVATE_KEY=0x...your_private_key_here
POLYMARKET_PROXY_WALLET_ADDRESS=0x...your_proxy_wallet_address_here

# API Credentials (auto-generated by derive-polymarket-creds.js)
POLYMARKET_API_KEY=...
POLYMARKET_API_SECRET=...
POLYMARKET_API_PASSPHRASE=...

# Signature type: 1=Social login, 2=Browser wallet
POLYMARKET_SIGNATURE_TYPE=2
```

## Frontend Environment Variables

In addition to the backend variables above, you need to configure the frontend (`terminal/.env`):

```env
SUPABASE_URL=<API URL from supabase status>
SUPABASE_ANON_KEY=<anon key from supabase status>

# Edge Function URLs (for local development)
SUPABASE_EDGE_FUNCTION_LIMIT_ORDER_BOT=http://127.0.0.1:54321/functions/v1/polymarket-up-down-15-markets-limit-order-bot
SUPABASE_EDGE_FUNCTION_SNIPER_ORDER=http://127.0.0.1:54321/functions/v1/polymarket-sniper-order
SUPABASE_EDGE_FUNCTION_POSITION_TRACKER=http://127.0.0.1:54321/functions/v1/polymarket-position-tracker
```

## Full Environment File

If you're using both Market Analysis and Betting Bots, your complete `supabase/.env.local` should look like:

```env
# ============================================
# Market Analysis Configuration
# ============================================

# Dome API - Required for market data
DOME_API_KEY=your_dome_api_key

# AI Provider - At least one is required
XAI_API_KEY=your_xai_api_key
OPENAI_API_KEY=your_openai_api_key

# ============================================
# Betting Bots Configuration
# ============================================

# Polymarket Bot - Required for Betting Bots
POLYMARKET_WALLET_PRIVATE_KEY=0x...your_private_key
POLYMARKET_PROXY_WALLET_ADDRESS=0x...your_proxy_wallet

# API Credentials (auto-generated - run: node scripts/derive-polymarket-creds.js)
POLYMARKET_API_KEY=...
POLYMARKET_API_SECRET=...
POLYMARKET_API_PASSPHRASE=...
```

## Local Development Setup

After adding your wallet private key and proxy address to `supabase/.env.local`:

1. **Generate API credentials** (required once per wallet):
   ```bash
   cd terminal
   npm install
   node ../scripts/derive-polymarket-creds.js
   ```
   This will auto-update your `.env.local` file.

2. **Start Supabase services:**
   ```bash
   cd supabase
   supabase start
   supabase functions serve --env-file .env.local
   ```

3. **Start the frontend:**
   ```bash
   cd terminal
   npm run dev
   ```

4. Navigate to [http://localhost:3000/betting-bots](http://localhost:3000/betting-bots)

5. Use the tabs to switch between **Ladder Bot** and **Dump Sniper**

## Production Deployment

To deploy edge functions to Supabase Cloud:

```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy individually
supabase functions deploy polymarket-up-down-15-markets-limit-order-bot
supabase functions deploy polymarket-sniper-order
supabase functions deploy polymarket-position-tracker
```

Set secrets in production:
```bash
supabase secrets set POLYMARKET_WALLET_PRIVATE_KEY=0x...
supabase secrets set POLYMARKET_PROXY_WALLET_ADDRESS=0x...
```

## Edge Functions

| Function | Purpose | Used By |
|----------|---------|---------|
| `polymarket-up-down-15-markets-limit-order-bot` | Places ladder/straddle orders | Ladder Bot |
| `polymarket-sniper-order` | Places single orders by token ID | Dump Sniper |
| `polymarket-position-tracker` | Tracks positions and P&L | Both |

## APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Gamma API | `https://gamma-api.polymarket.com` | Market data, token IDs |
| CLOB API | `https://clob.polymarket.com` | Order placement |
| Data API | `https://data-api.polymarket.com` | Positions, activity |
| WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Real-time prices |

## Troubleshooting

### General Errors

| Error | Solution |
|-------|----------|
| "Private key not configured" | Add POLYMARKET_WALLET_PRIVATE_KEY to `.env.local` |
| "Proxy wallet not configured" | Add POLYMARKET_PROXY_WALLET_ADDRESS to `.env.local` |
| "Invalid private key" | Ensure your private key is correctly formatted (with or without 0x prefix) |
| "Insufficient balance" | Fund your Polymarket wallet with USDC |
| "Order failed" | Check that your proxy wallet is properly set up on Polymarket |

### Ladder Bot Errors

| Error | Solution |
|-------|----------|
| "Market not found" | Market may not be created yet. Try closer to the 15-min mark |
| "Bankroll too small for full ladder" | Increase bankroll or reduce price range |
| "< 5 shares" | Minimum 5 shares required per order. Increase bankroll |

### Dump Sniper Errors

| Error | Solution |
|-------|----------|
| "Market not found" | Market may not be created yet. Try closer to the 15-min mark |
| "WebSocket connection error" | Check network connection, will auto-reconnect |
| "Time window expired" | No dump detected within watch window. Normal behavior |
| "Leg 2 failed" | Hedge opportunity passed. Leg 1 position remains open |

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit your private key** to version control
2. **Use a dedicated trading wallet** with limited funds
3. **Keep your `.env.local` file** in `.gitignore`
4. **Monitor your bot** regularly for unexpected behavior
5. **Start with small amounts** until you're confident in the bot's behavior

---

← [Back to main README](../../README.md)

