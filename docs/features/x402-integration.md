# 💸 x402 / PayAI Integration

**x402 Integration** brings the power of paid AI services and data providers to PredictOS through the [x402 protocol](https://www.x402.org/). Discover and call x402-protected endpoints with automatic USDC payments on Solana or Base networks.

> **Related:** For **wallet-approved** HTTP 402 / MPP calls from your own terminal or coding agents (instead of server-side keys), see **[Pay.sh integration](pay-sh-integration.md)** and [pay.sh/docs](https://pay.sh/docs).

> ✅ **Status: Fully Integrated**
> 
> x402 integration is complete and production-ready. PredictOS supports both **PayAI** and **Coinbase CDP** facilitators interchangeably — simply configure your preferred facilitator URL in the environment variables.

## Buyer Agents vs Seller Agents

PredictOS operates within the x402 ecosystem in two distinct roles:

### 🛒 Buyer Agents (Your Agents)

Agents built with PredictOS are **buyer agents**. They can:
- Discover and browse x402 sellers from the bazaar
- Automatically pay for premium information from other AI agents
- Access specialized data sources, research, and analysis on demand
- Use x402 sellers as tools during market analysis

When you configure a Predict Agent with a PayAI tool, it becomes a buyer that can pay for premium intel from seller agents across the x402 network.

### 💰 Seller Agents (PredictOS Services)

PredictOS also exposes its own intelligence as a **seller agent** — making PredictOS-powered analysis available to any x402 buyer in the ecosystem.

**Arb Agent** (Arbitrage Discovery Agent) is a seller agent that provides live Polymarket vs Kalshi arbitrage opportunities:

| | |
|---|---|
| **Public Endpoint** | `https://nqyocjuqubsdrguazcjz.supabase.co/functions/v1/get-polymarket-kalshi-arbitrage` |
| **Service** | Live arbitrage opportunities between Polymarket and Kalshi |
| **Price** | $1 per call |
| **Network** | Solana |
| **x402.watch** | [View on x402.watch](https://x402.watch/seller/predictos-live-polymarket-vs-kalshi-arbitrage) |
| **X (Twitter)** | [@predict_agent](https://x.com/predict_agent) |

> 💡 **Access via x402:** Any x402 buyer agent can call the Arb Agent endpoint directly using the CDP facilitator. Configure your buyer to use `https://api.cdp.coinbase.com/platform/v2/x402` as the facilitator and call the public endpoint above.

---

## What is x402?

The **x402 protocol** is an HTTP-based payment standard that enables machine-to-machine payments. When an AI agent calls an x402-protected API endpoint, it automatically handles the payment flow:

1. **Request** → Agent makes an API call
2. **402 Response** → Server returns payment requirements (price, network, recipient)
3. **Payment Authorization** → Agent signs a payment authorization
4. **Paid Request** → Agent retries with `X-Payment` header containing the signed authorization
5. **Response** → Server verifies payment and returns the data

This creates a seamless pay-per-call model for AI services — no subscriptions, no API keys to manage, just USDC payments at the moment of use.

## Why x402 in PredictOS?

x402 integration enables your Predict Agents to become intelligent buyers in the AI economy. Your agents can autonomously discover, evaluate, and pay for premium information from seller agents across the network.

### Benefits for Your Buyer Agents

- **Premium Intelligence** — Access specialized market data, research, and analysis from x402 sellers
- **AI-to-AI Commerce** — Your agents pay other AI agents for their expertise automatically
- **No Vendor Lock-in** — Pay only for what you use, switch providers instantly
- **Transparent Pricing** — Every seller displays their price upfront in USDC
- **Multi-Network Support** — Pay with USDC on Solana (fast, cheap) or Base (EVM compatible)
- **Tool Integration** — Add any x402 seller as a tool for your Predict Agents

## 🔄 Interchangeable Facilitators

PredictOS supports **two facilitators** that can be used interchangeably. Simply update your environment variables to switch between them:

### PayAI Facilitator

```env
X402_DISCOVERY_URL=https://facilitator.payai.network/discovery/resources
X402_FACILITATOR_URL=https://facilitator.payai.network/
```

### Coinbase CDP Facilitator

```env
X402_DISCOVERY_URL=https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
```

Both facilitators provide access to the x402 seller ecosystem. The CDP facilitator is required for accessing Arb Agent and other sellers listed on Coinbase's x402 bazaar.

> 💡 **Use Arb Agent directly in PredictOS!** In the PayAI Seller Modal, use the **Custom Endpoint** input to call the Arb Agent directly with its public endpoint URL.

---

## How It Works in PredictOS

### The PayAI Bazaar

PredictOS connects to the **PayAI Bazaar** — a discovery layer that indexes all available x402 sellers. From the bazaar, you can:

- Browse available services
- Filter by network (Solana or Base)
- View pricing in USDC
- See input/output schemas
- Select a seller to use as an agent tool

> ⚠️ **Important: No Vetting Process**
> 
> Sellers listed in the PayAI Bazaar are **not vetted or verified** by PayAI or PredictOS. Anyone can register a seller endpoint and have it appear in the discovery layer. **Always research a seller before sending them money** — check their website, documentation, reputation, and ensure they are legitimate before using their service.

> 💡 **Note: Seller-Specific Input Formats**
> 
> Each seller may accept **different query formats and parameters**. While PredictOS sends your agent's command as the query input, some sellers expect JSON objects with specific fields, while others accept plain text queries. **Check the seller's documentation or website** to understand what input format they expect for best results.

### Using x402 as an Agent Tool (Buyer Flow)

In **Super Intelligence**, your Predict Agents act as **buyers** that can pay for premium information from x402 sellers:

1. **Open Agent Configuration** — Click on a Predict Agent to expand its settings
2. **Select x402 Tool** — Click the "PayAI" tool option
3. **Browse Bazaar** — A modal opens showing available sellers with their prices
4. **Select a Seller** — Click on a seller to add it as the agent's tool (or use Custom Endpoint for direct URLs like Arb Agent)
5. **Configure Query** — Your agent's command will be sent as the query to the seller
6. **Run Analysis** — The agent automatically pays the seller and incorporates the response into its analysis

Your agent handles the entire payment flow automatically — discovering the price, signing the payment authorization, and retrying with the payment header.

### Payment Flow

When your agent calls an x402 seller:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Predict Agent  │────▶│  x402 Endpoint  │────▶│  Payment Check  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌─────────────────┐             │ 402 Response
                        │  Sign Payment   │◀────────────┘
                        │  Authorization  │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │  Retry with     │
                        │  X-Payment      │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │  Receive Data   │
                        └─────────────────┘
```

## Configuration

### Environment Variables

Add these to your `supabase/.env.local` file:

```env
# =========================================================================================
# x402 / PayAI CONFIGURATION
# =========================================================================================

# Solana Private Key (base58 encoded) - for payments on Solana mainnet
# Generate with: solana-keygen new --no-passphrase
X402_SOLANA_PRIVATE_KEY=your_solana_private_key_base58

# EVM Private Key - for payments on Base mainnet
# Your Ethereum wallet private key (with 0x prefix)
X402_EVM_PRIVATE_KEY=0x_your_evm_private_key

# Discovery URL - endpoint to list available sellers in the bazaar
# PayAI:    https://facilitator.payai.network/discovery/resources
# CDP:      https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
X402_DISCOVERY_URL=https://facilitator.payai.network/discovery/resources

# Facilitator URL - used for payment verification
# PayAI:    https://facilitator.payai.network/
# CDP:      https://api.cdp.coinbase.com/platform/v2/x402
X402_FACILITATOR_URL=https://facilitator.payai.network/

# Optional: Solana RPC URL (defaults to mainnet-beta)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

> 💡 **Tip:** Switch between PayAI and CDP facilitators by updating `X402_DISCOVERY_URL` and `X402_FACILITATOR_URL`. Both work with the same wallet keys.

### Network Configuration

x402 in PredictOS supports **mainnet only** for real payments:

| Network | Chain ID | USDC Address | Use Case |
|---------|----------|--------------|----------|
| **Solana Mainnet** | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Fast, low fees |
| **Base Mainnet** | `eip155:8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | EVM compatible |

> 💡 **Tip:** Solana payments are typically faster and cheaper. The client automatically selects the best network based on seller support and your configured keys.

### Setting Up Wallets

#### For Solana Payments

1. **Generate a Solana keypair:**
   ```bash
   solana-keygen new --no-passphrase -o x402-wallet.json
   ```

2. **Get your public key:**
   ```bash
   solana-keygen pubkey x402-wallet.json
   ```

3. **Fund with USDC on Solana mainnet**

4. **Export the private key** (base58 format) to your `.env.local`

#### For Base (EVM) Payments

1. **Use an existing EVM wallet** or create a new one
2. **Fund with USDC on Base mainnet**
3. **Add the private key** (with 0x prefix) to your `.env.local`

## Frontend Configuration

Add the edge function URL to your `terminal/.env`:

```env
# x402 Seller endpoint
SUPABASE_EDGE_FUNCTION_X402_SELLER=http://127.0.0.1:54321/functions/v1/x402-seller
```

## API Reference

### List Sellers

Fetch available sellers from the PayAI bazaar:

```typescript
// POST /api/x402-seller
{
  "action": "list",
  "network": "solana", // optional: filter by network
  "type": "http",      // optional: protocol type
  "limit": 100,        // optional: pagination
  "offset": 0          // optional: pagination
}

// Response
{
  "success": true,
  "sellers": [
    {
      "id": "https://example.x402.bot/api",
      "name": "Example Service",
      "description": "AI-powered analysis",
      "resourceUrl": "https://example.x402.bot/api",
      "priceUsdc": "$0.0100",
      "networks": ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
      "lastUpdated": "2025-12-30T00:00:00Z",
      "inputDescription": "query: string"
    }
  ],
  "metadata": {
    "requestId": "...",
    "timestamp": "...",
    "processingTimeMs": 150,
    "total": 42
  }
}
```

### Call Seller

Call an x402-protected endpoint with automatic payment:

```typescript
// POST /api/x402-seller
{
  "action": "call",
  "resourceUrl": "https://example.x402.bot/api",
  "query": "What is the latest news about Bitcoin?",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" // optional
}

// Response
{
  "success": true,
  "data": {
    // ... seller's response data
  },
  "metadata": {
    "requestId": "...",
    "timestamp": "...",
    "processingTimeMs": 2500,
    "paymentTxId": "...",
    "costUsdc": "$0.0100",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
  }
}
```

### Health Check

Check if the bazaar is accessible:

```typescript
// POST /api/x402-seller
{
  "action": "health"
}

// Response
{
  "success": true,
  "healthy": true,
  "config": {
    "discoveryUrl": "https://bazaar.payai.network/resources",
    "preferredNetwork": "solana"
  }
}
```

## Architecture

### Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/x402/client.ts` | Core x402 client with payment signing |
| `supabase/functions/_shared/x402/types.ts` | TypeScript types for x402 protocol |
| `supabase/functions/x402-seller/index.ts` | Edge function handling bazaar & seller calls |
| `terminal/src/app/api/x402-seller/route.ts` | Next.js API route proxy |
| `terminal/src/components/X402SellerModal.tsx` | Bazaar browser modal UI |
| `terminal/src/types/x402.ts` | Frontend TypeScript types |

### Payment Signing

The x402 client supports two payment methods:

#### Solana Payments
- Creates a partially-signed SPL token transfer transaction
- Uses `TransferChecked` instruction for USDC
- Fee payer (facilitator) completes and submits the transaction

#### EVM Payments (Base)
- Uses EIP-3009 `TransferWithAuthorization` for gasless USDC transfers
- Signs EIP-712 typed data with the configured private key
- Facilitator executes the authorized transfer

## UI Overview

### PayAI Seller Modal

When selecting an x402 tool, the PayAI Seller Modal displays:

- **Search bar** — Filter sellers by name, description, or URL
- **Seller cards** — Name, price (in USDC), description, supported networks
- **Pagination** — Browse through hundreds of available sellers
- **Network badges** — Visual indicator for Solana vs EVM support

### In Agent Configuration

Once selected, the x402 seller appears as a tool badge on your Predict Agent:

```
┌────────────────────────────────────────────────────┐
│ PREDICT AGENT 1                                    │
├────────────────────────────────────────────────────┤
│ Model: grok-4-1-fast-reasoning                     │
│ Tools: [PayAI: Biz News] [X Search]               │
│ Command: Analyze Bitcoin sentiment...              │
└────────────────────────────────────────────────────┘
```

## Example Use Cases

### 1. Arbitrage Discovery with Arb Agent
Use the PredictOS Arb Agent to find arbitrage opportunities:
```
Seller: PredictOS Arb Agent
Endpoint: https://nqyocjuqubsdrguazcjz.supabase.co/functions/v1/get-polymarket-kalshi-arbitrage
Cost: $1.00 per call
Returns: Live Polymarket vs Kalshi arbitrage opportunities
```

### 2. Premium News Analysis
Use a paid news aggregator to get real-time market sentiment:
```
Seller: biznews.x402.bot
Query: "Latest news about Polymarket and prediction markets"
Cost: $0.01 per call
```

### 3. Alternative Data Sources
Access specialized data providers not available through free APIs:
```
Seller: market-data.x402.bot  
Query: {"symbol": "BTC", "timeframe": "1h"}
Cost: $0.05 per call
```

### 4. AI-to-AI Consultation
Let your agent consult another AI for a second opinion:
```
Seller: ai-analyst.x402.bot
Query: "What's your probability estimate for Trump winning 2028?"
Cost: $0.10 per call
```

## Troubleshooting

### Common Issues

**"X402_DISCOVERY_URL environment variable is not set"**
- Add `X402_DISCOVERY_URL=https://bazaar.payai.network/resources` to `supabase/.env.local`
- Restart the Edge Functions server

**"No compatible payment option found"**
- The seller only accepts networks you haven't configured
- Add the appropriate private key (`X402_SOLANA_PRIVATE_KEY` or `X402_EVM_PRIVATE_KEY`)

**"Solana private key not configured"**
- Add your base58-encoded Solana private key to `X402_SOLANA_PRIVATE_KEY`

**"EVM private key not configured"**
- Add your Ethereum private key (with 0x prefix) to `X402_EVM_PRIVATE_KEY`

**"Invalid Solana private key. Must be base58 encoded."**
- Ensure your Solana key is in base58 format, not hex
- Export from your wallet or use `solana-keygen`

**Payment fails with insufficient funds**
- Ensure your wallet has enough USDC on the correct network
- For Solana: Check USDC balance in your wallet
- For Base: Check USDC balance on Base mainnet

**Seller returns error**
- Check the query format — some sellers expect JSON, others plain text
- Review the seller's `inputDescription` for expected parameters

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit private keys** to version control
2. **Use dedicated wallets** for x402 payments with limited funds
3. **Keep `.env.local`** in `.gitignore`
4. **Monitor spending** — payments are automatic when agents call sellers
5. **Review seller prices** before adding them as tools
6. **Start with small amounts** — fund wallets with only what you need
7. **Research sellers before use** — sellers are NOT vetted; verify legitimacy through their website, docs, and community reputation before sending any funds
8. **Check seller input formats** — each seller may expect different query formats; consult their documentation to avoid wasted payments on malformed requests

## Links

- [x402 Protocol Specification](https://www.x402.org/)
- [x402.watch](https://x402.watch/) — Discover x402 sellers
- [PayAI Website](https://www.payai.network/)
- [PayAI Documentation](https://docs.payai.network/)
- [PayAI Bazaar](https://bazaar.payai.network/)
- [Coinbase CDP x402](https://docs.cdp.coinbase.com/x402/docs/welcome) — CDP Facilitator documentation
- [PredictOS Arb Agent on x402.watch](https://x402.watch/seller/predictos-live-polymarket-vs-kalshi-arbitrage)

---

← [Back to main README](../../README.md)

