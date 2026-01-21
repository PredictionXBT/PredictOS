# BlockRun AI Provider Setup

**BlockRun** provides pay-per-request access to 20+ AI models via x402 micropayments. Unlike traditional AI providers that require API keys, BlockRun uses wallet-based authentication — simply fund a Base chain wallet with USDC and access any model instantly.

> ✅ **Status: Fully Integrated**
>
> BlockRun is integrated as an AI provider for Super Intelligence, enabling wallet-based access to models from OpenAI, Anthropic, xAI, Google, DeepSeek, and Qwen.

## Why BlockRun?

| Traditional AI Providers | BlockRun |
|-------------------------|----------|
| Requires API key per provider | Single wallet accesses all models |
| Monthly billing, minimum commitments | Pay exactly what you use |
| API keys can leak, require rotation | Private key stays on your machine |
| Separate accounts for each provider | One wallet, 20+ models |

**Key benefits:**
- **No API key management** — Bring your own wallet
- **Cost transparency** — On-chain micropayments, pay per request
- **Self-custody** — Your keys never leave your machine
- **Multi-provider access** — OpenAI, Anthropic, xAI, Google, DeepSeek, Qwen in one place

---

## Available Models

BlockRun provides access to models from 6 major AI providers:

### OpenAI Models
| Model | ID | Best For |
|-------|-----|----------|
| GPT-4o | `blockrun/gpt-4o` | General purpose, vision |
| GPT-4o Mini | `blockrun/gpt-4o-mini` | Fast, cost-effective |
| GPT-4.1 | `blockrun/gpt-4.1` | Latest GPT-4 variant |
| GPT-5 | `blockrun/gpt-5` | Most capable OpenAI model |
| o1 | `blockrun/o1` | Complex reasoning |
| o3-mini | `blockrun/o3-mini` | Fast reasoning |

### Anthropic Models
| Model | ID | Best For |
|-------|-----|----------|
| Claude Sonnet 4 | `blockrun/claude-sonnet-4` | Balanced performance |
| Claude Opus 4 | `blockrun/claude-opus-4` | Most capable Claude |
| Claude Haiku | `blockrun/claude-haiku` | Fast, cost-effective |

### xAI Models
| Model | ID | Best For |
|-------|-----|----------|
| Grok 3 | `blockrun/grok-3` | Full Grok capabilities |
| Grok 3 Fast | `blockrun/grok-3-fast` | Faster responses |
| Grok 3 Mini | `blockrun/grok-3-mini` | Cost-effective |

### Google Models
| Model | ID | Best For |
|-------|-----|----------|
| Gemini 2.5 Pro | `blockrun/gemini-2.5-pro` | Most capable Gemini |
| Gemini 2.5 Flash | `blockrun/gemini-2.5-flash` | Fast responses |

### DeepSeek Models
| Model | ID | Best For |
|-------|-----|----------|
| DeepSeek Chat | `blockrun/deepseek-chat` | General conversation |
| DeepSeek Reasoner | `blockrun/deepseek-reasoner` | Complex reasoning |

### Qwen Models
| Model | ID | Best For |
|-------|-----|----------|
| Qwen Max | `blockrun/qwen-max` | Most capable Qwen |
| Qwen Plus | `blockrun/qwen-plus` | Balanced performance |

---

## Setup Guide

### Step 1: Get a Base Chain Wallet

You need a wallet that can sign transactions on **Base mainnet**. You can use:

- **MetaMask** — Popular browser extension
- **Rabby** — Multi-chain wallet
- **Coinbase Wallet** — Easy onramp from Coinbase
- **Any EVM wallet** — That supports Base network

**Export your private key:**
1. Open your wallet settings
2. Find "Export Private Key" or "Show Private Key"
3. Copy the key (starts with `0x`)
4. **⚠️ Never share your private key with anyone**

### Step 2: Fund with USDC on Base

BlockRun payments use **USDC on Base mainnet**. To fund your wallet:

**Option A: Bridge from another chain**
1. Go to [bridge.base.org](https://bridge.base.org) or use [LI.FI](https://li.fi)
2. Bridge USDC from Ethereum, Arbitrum, or other chains to Base
3. Wait for confirmation

**Option B: Buy directly**
1. Use Coinbase to buy USDC
2. Withdraw to your wallet on Base network
3. Or use [Moonpay](https://www.moonpay.com/) / [Transak](https://transak.com/) for direct purchase

**Recommended starting amount:** $10-50 USDC covers many requests

> 💡 **Cost estimate:** Most requests cost $0.001 - $0.10 depending on model and tokens used

### Step 3: Configure Environment

Add your wallet private key to `supabase/.env.local`:

```env
# =============================================================================
# BLOCKRUN AI PROVIDER
# =============================================================================

# Base chain private key (0x-prefixed hex)
# This wallet will be used to sign x402 micropayments
# Fund with USDC on Base mainnet
BLOCKRUN_WALLET_KEY=0x_your_private_key_here
```

**Security notes:**
- Never commit your private key to version control
- Use a dedicated wallet with limited funds
- Keep `.env.local` in `.gitignore`

### Step 4: Restart Services

After adding the environment variable:

```bash
# Restart Supabase Edge Functions
cd supabase
supabase functions serve --env-file .env.local
```

---

## Using BlockRun in Super Intelligence

### Selecting BlockRun Models

1. Navigate to **Market Analysis** → **Super Intelligence**
2. Click on a **Predict Agent** to expand its configuration
3. In the **Model** dropdown, scroll to find BlockRun models (prefixed with `blockrun/`)
4. Select your preferred model

### Model Selection Tips

| Use Case | Recommended Model |
|----------|-------------------|
| General market analysis | `blockrun/gpt-4o` or `blockrun/claude-sonnet-4` |
| Deep reasoning tasks | `blockrun/o1` or `blockrun/deepseek-reasoner` |
| Fast, cost-effective | `blockrun/gpt-4o-mini` or `blockrun/claude-haiku` |
| Maximum capability | `blockrun/gpt-5` or `blockrun/claude-opus-4` |

### Mixed Provider Strategy

One of BlockRun's key advantages is mixing models from different providers in the same analysis:

**Example multi-agent setup:**
- **Agent 1:** `blockrun/gpt-5` — OpenAI's latest for broad analysis
- **Agent 2:** `blockrun/claude-opus-4` — Anthropic's best for nuanced reasoning
- **Agent 3:** `blockrun/grok-3` — xAI for X/Twitter-aware analysis
- **Aggregator:** `blockrun/gemini-2.5-pro` — Google's model for synthesis

This diversity of perspectives can improve prediction accuracy by avoiding single-model biases.

---

## How x402 Payments Work

BlockRun uses the **x402 protocol** for machine-to-machine payments:

```
┌─────────────────┐     ┌─────────────────┐
│  Your Agent     │────▶│  BlockRun API   │
│  (PredictOS)    │     │                 │
└─────────────────┘     └─────────────────┘
                               │
                        402 Payment Required
                               │
                               ▼
┌─────────────────┐     ┌─────────────────┐
│  Sign Payment   │◀────│  Price: $0.005  │
│  (EIP-712)      │     │  USDC on Base   │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  Retry with     │────▶│  Process &      │
│  X-Payment      │     │  Return Result  │
└─────────────────┘     └─────────────────┘
```

1. **Request** — Agent makes API call to BlockRun
2. **402 Response** — BlockRun returns payment requirements (price, recipient)
3. **Sign** — Agent signs EIP-712 payment authorization with your wallet
4. **Paid Request** — Agent retries with signed payment header
5. **Response** — BlockRun verifies payment and returns AI response

**All of this happens automatically** — you just see the response in your agent's analysis.

---

## Cost Tracking

BlockRun responses include payment cost in the metadata:

```json
{
  "blockrun": {
    "paymentCost": "$0.003500"
  }
}
```

You can monitor your spending by:
- Checking your USDC balance on Base
- Viewing transactions on [Basescan](https://basescan.org/)
- Reviewing agent logs which show cost per request

---

## Troubleshooting

### Common Errors

**"BLOCKRUN_WALLET_KEY environment variable is not set"**
- Add your Base chain private key to `supabase/.env.local`
- Restart the Edge Functions server

**"BlockRun does not accept Base network payments"**
- This shouldn't happen — BlockRun uses Base mainnet
- Contact BlockRun support if this persists

**"BlockRun payment failed"**
- Check your USDC balance on Base
- Ensure your wallet has enough funds
- Verify the private key is correct (0x-prefixed)

**Payment signature errors**
- Ensure your private key is valid hex format
- Check that you're using a Base-compatible wallet
- Try regenerating the key from your wallet

**Request timeout**
- BlockRun requests have a 2-minute timeout
- For long responses, try a faster model like `blockrun/gpt-4o-mini`
- Check your network connection

### Checking Your Balance

View your USDC balance on Base:
1. Go to [Basescan](https://basescan.org/)
2. Enter your wallet address
3. Click "Token Holdings" to see USDC balance

Or use your wallet app to view Base network balances.

---

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Use a dedicated wallet** — Create a new wallet specifically for BlockRun with only the funds you need
2. **Never commit private keys** — Keep `.env.local` in `.gitignore`
3. **Start with small amounts** — Fund with $10-20 initially to test
4. **Monitor spending** — Check your balance periodically
5. **Rotate keys if compromised** — Create a new wallet immediately if you suspect key exposure

---

## Links

- [BlockRun Website](https://blockrun.ai/)
- [BlockRun Documentation](https://blockrun.ai/docs)
- [BlockRun on X (Twitter)](https://x.com/BlockRunAI)
- [x402 Protocol Specification](https://www.x402.org/)
- [Base Network](https://base.org/)
- [Basescan Explorer](https://basescan.org/)

---

← [Back to main README](../../README.md)
