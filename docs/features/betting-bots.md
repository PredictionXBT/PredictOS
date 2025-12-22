# Betting Bots Setup

This document explains how to configure the environment variables required for the **Betting Bots** feature in PredictOS.

## Overview

The Betting Bots feature includes the **Polymarket 15 Minute Up/Down Arbitrage Bot**, which automatically places limit orders on Polymarket's 15-minute up/down markets to capture arbitrage opportunities.

**Two modes available:**
- **Vanilla Mode** — Single price straddle at a fixed probability level
- **Ladder Mode** — Multi-level orders across a price range with exponentially tapered allocation

> 🚀 More bots coming soon!

## Why It Works

> 📖 Reference: [x.com/hanakoxbt/status/1999149407955308699](https://x.com/hanakoxbt/status/1999149407955308699)

This strategy exploits a simple arbitrage opportunity in binary prediction markets:

1. **Find a 15m crypto market with high liquidity**
2. **Place limit orders:** buy YES at 48 cents and NO at 48 cents
3. **Wait until both orders are filled**
4. **Total cost:** $0.96 for shares on both sides

**Regardless of the outcome**, one side always pays out $1.00 — guaranteeing a **~4% profit** per trade when both orders fill.

### The Math

| Scenario | Cost | Payout | Profit |
|----------|------|--------|--------|
| "Yes" wins | $0.48 (Yes) + $0.48 (No) = $0.96 | $1.00 | +$0.04 (~4.2%) |
| "No" wins | $0.48 (Yes) + $0.48 (No) = $0.96 | $1.00 | +$0.04 (~4.2%) |

The bot automates this process every 15 minutes, placing straddle limit orders on both sides of the market to capture this arbitrage when both orders fill.

---

## Ladder Mode

> 📖 Reference: [x.com/hanakoxbt/status/1999149407955308699](https://x.com/hanakoxbt/status/1999149407955308699)
>
> 🎬 **Demo by community contributor:** [x.com/mininghelium1/status/2002399561520656424](https://x.com/mininghelium1/status/2002399561520656424)

**Ladder Mode** improves on the vanilla strategy by spreading your bankroll across multiple probability levels with exponentially tapered allocation — heavy at the top, light at the bottom. This approach maximizes fill rates and captures more arbitrage opportunities.

### How It Works

Instead of placing a single straddle at one price (e.g., 48%), Ladder Mode places orders at every probability level from your configured **Top Price** (e.g., 49%) down to your **Bottom Price** (e.g., 35%):

| Price Level | Allocation | Fill Likelihood | Profit if Filled |
|-------------|------------|-----------------|------------------|
| 49% | ~25% of bankroll | Most likely | ~2% profit |
| 48% | ~18% of bankroll | Very likely | ~4% profit |
| 47% | ~14% of bankroll | Likely | ~6% profit |
| ... | Tapers down | ... | ... |
| 35% | ~1% of bankroll | Rare | ~86% profit |

### Why Ladder Mode?

- **Higher fill rates** — Top rungs (49%, 48%) fill frequently for steady, consistent gains
- **Larger upside** — Lower rungs occasionally fill for much higher profit margins
- **Better capital efficiency** — Exponential taper concentrates most capital where fills are likely
- **Automatic rung adjustment** — If your bankroll is too small, the bot automatically reduces the number of rungs to ensure each order meets Polymarket's minimum 5-share requirement

### Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Top Price** | Highest probability level (receives most allocation) | 49% |
| **Bottom Price** | Lowest probability level (receives least allocation) | 35% |
| **Taper Factor** | Controls allocation curve steepness (1.0 = gentle, 2.5 = aggressive) | 1.5 |
| **Total Bankroll** | USD amount distributed across all ladder rungs per market | $50 |

### Taper Factor Explained

The taper factor controls how aggressively allocation decreases from top to bottom:

- **1.0 (Gentle)** — More even distribution across all price levels
- **1.5 (Moderate)** — Balanced approach (recommended)
- **2.0 (Aggressive)** — Heavy concentration at top prices
- **2.5 (Very Heavy Top)** — Most conservative, majority at highest fill probability

### Community Credit

Ladder Mode was contributed by the community:

| Contributor | Links |
|-------------|-------|
| **Mining helium** | [𝕏 @mininghelium1](https://x.com/mininghelium1) · [GitHub @fciaf420](https://github.com/fciaf420) · [Demo](https://x.com/mininghelium1/status/2002399561520656424) |

---

## Required Environment Variables

Add these to your `supabase/.env.local` file:

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

## Complete Example

Your `supabase/.env.local` file should include these for betting bots:

```env
# Polymarket Bot Configuration - Required for Betting Bots
POLYMARKET_WALLET_PRIVATE_KEY=0x...your_private_key_here
POLYMARKET_PROXY_WALLET_ADDRESS=0x...your_proxy_wallet_address_here
```

## Frontend Environment Variables

In addition to the backend variables above, you need to configure the frontend (`terminal/.env`):

```env
SUPABASE_URL=<API URL from supabase status>
SUPABASE_ANON_KEY=<anon key from supabase status>

# Edge Function URL (for local development)
SUPABASE_EDGE_FUNCTION_BETTING_BOT=http://127.0.0.1:54321/functions/v1/polymarket-up-down-15-markets
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

3. Navigate to [http://localhost:3000/betting-bots](http://localhost:3000/betting-bots)

4. Configure your bot parameters and start the bot to test

## Bot Parameters

### Vanilla Mode Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Asset Symbol | The cryptocurrency to trade (BTC, ETH, SOL, XRP) | BTC |
| Order Price | Probability level for straddle orders | 48% |
| Order Size | Amount in USDC per bet on each side | $25 |

### Ladder Mode Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Asset Symbol | The cryptocurrency to trade (BTC, ETH, SOL, XRP) | BTC |
| Top Price | Highest probability level (heavy allocation) | 49% |
| Bottom Price | Lowest probability level (light allocation) | 35% |
| Taper Factor | Allocation curve steepness (1.0-2.5) | 1.5 |
| Total Bankroll | Total USD distributed across all rungs | $50 |

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Private key not configured" | Add POLYMARKET_WALLET_PRIVATE_KEY to `.env.local` |
| "Proxy wallet not configured" | Add POLYMARKET_PROXY_WALLET_ADDRESS to `.env.local` |
| "Invalid private key" | Ensure your private key is correctly formatted (with or without 0x prefix) |
| "Insufficient balance" | Fund your Polymarket wallet with USDC |
| "Order failed" | Check that your proxy wallet is properly set up on Polymarket |

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit your private key** to version control
2. **Use a dedicated trading wallet** with limited funds
3. **Keep your `.env.local` file** in `.gitignore`
4. **Monitor your bot** regularly for unexpected behavior
5. **Start with small amounts** until you're confident in the bot's behavior

---

← [Back to main README](../../README.md)

