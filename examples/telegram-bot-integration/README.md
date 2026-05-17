# Telegram Bot Integration — TGE Discord Agent

Autonomous TGE monitoring agent that watches Discord, discovers markets via x402, and trades on Polymarket.

## Architecture

```
Discord Channel
  → TGE Discord Agent (Supabase Edge Function)
    → Step 1: Monitor Discord messages for TGE keywords
    → Step 2: x402 tool discovery (PayAI bazaar)
    → Step 3: Fetch market data via x402 → Dome API
    → Step 4: Execute trade via Polymarket CLOB
  → JSON Response
  → Telegram notification + trade confirmation
```

## Setup

1. Deploy PredictOS locally

```
cd supabase
supabase start
supabase functions serve --env-file .env.local
```

2. Required environment variables

```bash
# Edge function
DISCORD_TOKEN="your_discord_bot_token"
DOME_API_KEY="your_dome_api_key"
X402_DISCOVERY_URL="https://bazaar.payai.network/api/v1/resources"
POLYMARKET_WALLET_PRIVATE_KEY="your_eoa_private_key"
POLYMARKET_PROXY_WALLET_ADDRESS="your_safe_wallet_address"

# Python bot
PREDICTOS_URL="http://127.0.0.1:54321/functions/v1"
PREDICTOS_KEY="your_supabase_anon_key"
TELEGRAM_TOKEN="your_telegram_bot_token"
```

3. Install Python dependencies

```
pip install requests python-telegram-bot
```

4. Run the bot

```
python bot_example.py
```

## Usage

### One-time check (no trade)

```python
from client import PredictOSClient

client = PredictOSClient()
result = client.check_tge(channel_id="1072952844161916938")
```

### Auto-trade on detection

```python
result = client.check_tge(
    channel_id="1072952844161916938",
    market_slug="will-x-launch-tge-2025",
    auto_trade={
        "side": "YES",
        "budget_usdc": 10,
        "min_confidence": 0.6,
    },
)

if result.get("trade", {}).get("success"):
    print(f"Bought {result['trade']['size']} shares!")
```

### Telegram bot commands

- **Check TGE** — one-time check on a selected project
- **Start Monitor** — polls every 60s with auto-trade enabled
- **Stop Monitor** — stops the polling loop

## Production

```
supabase functions deploy tge-discord-agent
```

Update `PREDICTOS_URL` to your production Supabase URL.

## Integration Points

- **Privy**: Connect wallet on PredictOS frontend for browser-based trading
- **Custom bots**: Use `client.py` as HTTP wrapper from any Python app
- **Direct HTTP**: POST to `/functions/v1/tge-discord-agent` from any language

## Support

- Repo: https://github.com/PredictionXBT/PredictOS
- Twitter: @prediction_xbt
