<p align="center">
  <img src="terminal/public/predict-os-banner.png" alt="PredictOS Banner" width="100%">
</p>

<h1 align="center">PredictOS</h1>

<p align="center"><strong>The leading all-in-one open-source framework for deploying custom AI agents and trading bots purpose-built for prediction markets - bring your own data, models, and strategies to dominate prediction forecasting</strong></p>

<p align="center"><em>Built by <a href="https://predictionxbt.fun">PredictionXBT</a>, the team behind <strong>Predict</strong> — The Layer 1 for Social Prediction Market</em></p>

<div align="center">

  <p><a href="https://predictionxbt.fun">🌐 Social Prediction Markets</a> · <a href="https://x.com/prediction_xbt">𝕏 PredictionXBT</a> · <a href="https://predictionxbt.fun/terminal">🖥️ Alpha/Arb Terminal</a> · <a href="https://x.com/predict_agent">🤖 Predict Agent</a></p>

  <a href="https://github.com/PredictionXBT/PredictOS/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/PredictionXBT/PredictOS"><img src="https://img.shields.io/badge/version-2.4.0-blue?style=for-the-badge" alt="Version"></a>

</div>

<br />

## ✨ What is PredictOS?

Prediction markets are having their moment. With platforms like **Kalshi** and **Polymarket** opening up their APIs to the public, there's now unprecedented access to real-time market data, order books, and trading capabilities. But raw API access is just the beginning — what's been missing is a unified framework that lets anyone tap into this new financial primitive.

> 💡 **Jupiter Support:** We also support [Jupiter prediction markets](https://jup.ag/prediction) since they're built on Kalshi events — just paste a Jupiter URL and PredictOS will analyze the underlying Kalshi market.

**PredictOS is that framework.**

### 🔓 Why Open Source?

Sure, there are hosted tools out there. But here's the problem:

- **Your data isn't yours.** Every query, every strategy signal, every trade you analyze — it all flows through their servers. Your alpha becomes their alpha. Your edge gets commoditized the moment you share it with a third party.

- **Your strategy isn't private.** Want to build a custom trading bot with proprietary signals? Maybe you've got insider domain knowledge, a unique data source, or a thesis nobody else is running. The moment you plug that into a hosted platform, you've handed over your playbook.

- **You can't customize what you don't own.** Need a specific feature? Want to integrate your own AI model? Good luck submitting a feature request and waiting 6 months.

With PredictOS, **you own everything**. Run it on your own infrastructure. Fork it. Modify it. Build your secret sauce without anyone watching. Your strategies stay yours. Your data never leaves your servers. And when you find an edge, you keep it.

---

PredictOS is an open-source, AI-powered operating system for prediction markets. It provides a unified interface to analyze markets across platforms, delivering real-time AI insights to help you find alpha opportunities and make informed trading decisions.

Whether you're a casual trader looking for quick market analysis or a power user building automated betting strategies with proprietary data, PredictOS gives you the tools to navigate prediction markets — on your own terms.

**What's next?** We're building towards a complete prediction market toolkit: automated betting bots, whale tracking, copytrading, cross-platform arbitrage, and more. See the [Coming Soon](#-coming-soon) section for the full roadmap.

<div align="center">
  <a href="https://domeapi.io/"><img src="https://img.shields.io/badge/Polymarket-Dome%20API-00D4AA?style=for-the-badge" alt="Dome API" /></a>
  <a href="https://pond.dflow.net/introduction"><img src="https://img.shields.io/badge/Kalshi-DFlow%20API-6366F1?style=for-the-badge" alt="DFlow API" /></a>
</div>

## 💎 The $PREDICT Token

**$PREDICT** serves as the foundational pillar of the open-source PredictOS framework, powering a decentralized, community-driven Layer 1 ecosystem for social prediction markets, trading, and participation.

As the primary utility token, $PREDICT is deeply integrated across the platform:

- **Launchpad Liquidity** — The launchpad will be seeded with $PREDICT liquidity to ensure depth, stability, and fair access for new project discoveries and token launches
- **No-Code Builder Access** — Essential for accessing upcoming no-code builder tools that allow anyone to effortlessly create custom prediction markets, agents, or interfaces with premium features unlocked through holding or using $PREDICT
- **Ecosystem Engagement** — Required for full participation in the broader Predict ecosystem, including creating markets, accessing advanced analytics, AI-driven signals, and governance

### 🔥 Staking & Rewards

A key feature driving adoption is the ability to **stake $PREDICT for attractive APY rewards**, delivering passive yields while empowering holders with enhanced capabilities:

- **Unlocked Trading Abilities** — Enhanced access to trading features and boosted capabilities
- **Prediction Market Access** — Boosted access to the native prediction market for betting on events, outcomes, or price movements
- **Long-Term Value** — Staking and liquidity provision promotes long-term holding, strengthens network security, and redistributes value directly to the community

> 💡 **$PREDICT is more than a token** — it's the core fuel powering adoption, liquidity, and innovation in the live PredictOS framework, establishing it as a leader in decentralized social prediction markets.

## 🧠 Introducing Predict Super Intelligence: PredictOS V2 Release

**Predict Super Intelligence** represents the next evolution of PredictOS — a powerful multi-agent AI system that enables intelligent, team-like analysis and execution across prediction markets.

### The Vision

Traditional market analysis tools give you a single perspective. Predict Super Intelligence breaks this paradigm by custom-bulding **multiple AI agents** and making them work together, each bringing unique capabilities, tools, and models to form a comprehensive market view.

### How It Works

Predict Super Intelligence operates through a sophisticated **agent pipeline**:

1. **Predict Agents** — Deploy one or more AI agents (using xAI Grok or OpenAI GPT models -- Gemini coming in future releases) to independently analyze prediction markets. Each agent can be equipped with different tools (X Search, Web Search, Polyfactual Research) and custom commands to focus their analysis.

2. **Predict Bookmaker Agent** — When multiple agents complete their analysis, the Bookmaker Agent acts as a "judge" that synthesizes all perspectives, weighs agreements and disagreements, and produces a consolidated recommendation with consensus metrics.

3. **Mapper Agent** — Translates analysis outputs into platform-specific order parameters ready for execution.

### Two Modes of Operation

| Mode | Description | Use Case |
|------|-------------|----------|
| **🔍 Supervised** | Agents analyze the market and provide recommendations. User reviews the analysis and can execute via OkBet one-click links. | Research, learning, manual trading |
| **⚡ Autonomous** | Agents analyze the market and automatically execute trades based on recommendations (within your budget limits). Currently, single Polymarket market is supported. Batch market + Kalshi coming soon. | Automated trading, hands-off execution |

### Key Features

- **Multi-Model Support** — Mix and match xAI Grok (4.1, 4), OpenAI GPT (5.2, 5.1, 4.1), and BlockRun models (20+ models via x402 micropayments)
- **Tool-Augmented Analysis** — Agents can use X (Twitter) search, Web search, Polyfactual deep research, and x402/PayAI sellers
- **Custom Commands** — Direct agent focus with natural language instructions
- **Real-Time Pipeline Visualization** — Watch agents work through the analysis pipeline
- **Consensus Metrics** — See how agents agree or disagree on recommendations
- **Budget Controls** — Set strict limits for autonomous execution (\$1-\$100)
- **🛡️ Verifiable Agents** — Permanently store agent analysis on [Irys](https://irys.xyz/) blockchain for transparent, verifiable AI predictions

> 📖 **[Full Setup Guide →](docs/features/super-intelligence.md)**

## 🎯 Current Features (v2.4.0)

| Feature | Status | Description | Setup Guide |
|---------|--------|-------------|-------------|
| **🌐 Supported Markets** | ✅ Released | **Kalshi**, **Polymarket**, and **Jupiter** (Kalshi-based). Data powered by [DFlow](https://pond.dflow.net/introduction) (Kalshi/Jupiter) and [Dome](https://domeapi.io/) (Polymarket). | — |
| **🧠 Super Intelligence** | ✅ Released | Multi-agent AI system with Supervised and Autonomous modes. Deploy multiple AI agents with different models and tools, aggregate insights via Bookmaker Agent, and execute trades automatically or via OkBet. Includes AI-powered market analysis and Polyfactual Deep Research. | [📖 Setup Guide](docs/features/super-intelligence.md) |
| **⚖️ Arbitrage Intelligence** | ✅ Released | AI-powered cross-platform arbitrage detection between Polymarket and Kalshi. Paste any market URL, and the system automatically searches for the same market on the other platform, compares prices, and provides actionable arbitrage strategies with profit calculations. | [📖 Setup Guide](docs/features/arbitrage-intelligence.md) |
| **🛡️ Verifiable Agents** | ✅ Released | Permanently store agent analysis on [Irys](https://irys.xyz/) blockchain for transparent, verifiable AI predictions. Supports both devnet (free, temporary) and mainnet (permanent). | [📖 Setup Guide](docs/features/verifiable-agents.md) |
| **💸 x402 / PayAI Integration** | ✅ Released | Access paid AI services and data providers through the x402 protocol. Browse the PayAI bazaar, select sellers, and pay with USDC on Solana or Base. Use as a tool in your Predict Agents. | [📖 Setup Guide](docs/features/x402-integration.md) |
| **Betting Bots** | ✅ Released | Polymarket 15 Minute Up/Down Arbitrage Bot — **Vanilla Mode** (single price straddle) and **Ladder Mode** (multi-level tapered allocation for maximized fill rates) | [📖 Setup Guide](docs/features/betting-bots.md) |
| **Wallet Tracking** | ✅ Released | Real-time order tracking for any Polymarket wallets using Dome SDK WebSockets — 10 seconds faster than hosted bots | [📖 Setup Guide](docs/features/wallet-tracking.md) |

## 🔮 Coming Soon

| Feature | Description |
|---------|-------------|
| **Agent Battles** | Pit AI agents against each other to discover winning strategies |
| **No Code Builder** | Build trading strategies without writing code |
| **Whale Tracking** | Automated alerts and analysis for large traders across markets |
| **Copytrading** | Automatically copy top-performing traders |
| **Perps Trading / Leverage** | Leveraged prediction market positions |
| **$Predict Staking** | Stake for APY rewards, unlock enhanced trading abilities, and get boosted access to prediction markets |
| **Predict Protocol SDK** | For trading Social markets built on Predict (currently Testnet on [predictionxbt.fun](https://predictionxbt.fun)) |

## 📦 Architecture

### Data Providers

PredictOS uses specialized data providers for each prediction market platform:

| Platform | Data Provider | API Endpoint | Features |
|----------|---------------|--------------|----------|
| **Kalshi** | 🔷 DFlow | `a.prediction-markets-api.dflow.net` | Event data, market prices, volume, liquidity, open interest |
| **Polymarket** | 🌐 Dome | `api.domeapi.io` | Market data, CLOB tokens, WebSocket feeds, order execution |

> 💡 **Note:** DFlow API requires an API key. Contact [DFlow](https://x.com/dflow) to obtain your `DFLOW_API_KEY`.

### Project Structure

```
PredictOS/
├── terminal/                        # Frontend (Next.js 14)
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── api/                 # API routes (proxy to Edge Functions)
│   │   │   │   ├── arbitrage-finder/   # Arbitrage Intelligence proxy
│   │   │   │   ├── bookmaker-agent/
│   │   │   │   ├── event-analysis-agent/
│   │   │   │   ├── get-events/
│   │   │   │   ├── irys-upload/        # Verifiable Agents - Irys blockchain upload
│   │   │   │   ├── mapper-agent/
│   │   │   │   ├── polyfactual-research/
│   │   │   │   ├── polymarket-put-order/
│   │   │   │   ├── wallet-tracking/
│   │   │   │   └── x402-seller/         # x402/PayAI integration
│   │   │   ├── arbitrage/           # Arbitrage Intelligence UI
│   │   │   ├── market-analysis/     # Super Intelligence UI
│   │   │   ├── betting-bots/        # Betting Bots UI
│   │   │   └── wallet-tracking/     # Wallet Tracking UI
│   │   ├── components/              # React components
│   │   │   ├── AgenticMarketAnalysis.tsx   # Super Intelligence component
│   │   │   ├── ArbitrageTerminal.tsx       # Arbitrage Intelligence component
│   │   │   ├── BettingBotTerminal.tsx
│   │   │   └── WalletTrackingTerminal.tsx
│   │   ├── lib/                     # Utility libraries
│   │   │   ├── irys.ts              # Irys blockchain integration
│   │   │   └── utils.ts
│   │   └── types/                   # TypeScript definitions
│   └── public/                      # Static assets
│
└── supabase/                        # Backend (Supabase Edge Functions)
    └── functions/
        ├── _shared/                 # Shared utilities
        │   ├── ai/                  # AI integrations (xAI Grok, OpenAI & BlockRun)
        │   │   ├── callGrok.ts
        │   │   ├── callOpenAI.ts
        │   │   ├── callBlockRun.ts  # BlockRun x402 integration (20+ models via micropayments)
        │   │   └── prompts/         # Agent prompts
        │   │       ├── arbitrageAnalysis.ts      # Arbitrage comparison prompt
        │   │       └── searchQueryGenerator.ts   # Cross-platform search prompt
        │   ├── dflow/               # DFlow API client (Kalshi data)
        │   │   ├── client.ts
        │   │   ├── endpoints.ts
        │   │   └── types.ts
        │   ├── dome/                # Dome API client (Polymarket data)
        │   │   ├── client.ts
        │   │   ├── endpoints.ts
        │   │   └── types.ts
        │   ├── polyfactual/         # Polyfactual Research client
        │   ├── polymarket/          # Polymarket trading client
        │   └── x402/                # x402/PayAI protocol client
        │       ├── client.ts        # Bazaar discovery & payment handling
        │       └── types.ts
        ├── arbitrage-finder/        # Arbitrage Intelligence endpoint
        ├── get-events/              # Fetch market data from URL
        ├── event-analysis-agent/    # Individual agent analysis
        ├── bookmaker-agent/         # Multi-agent aggregator
        ├── mapper-agent/            # Analysis-to-order translator
        ├── polymarket-put-order/    # Order execution
        ├── polyfactual-research/    # Deep research endpoint
        ├── x402-seller/             # x402/PayAI bazaar & seller calls
        └── polymarket-up-down-.../  # Betting bot endpoint
```

> 💡 **Extensibility:** New agents and features are added as Edge Functions under `supabase/functions/<feature-name>/` with shared logic in `_shared/`. The modular architecture allows mixing different AI providers, tools, and execution strategies.

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) v1.0+
- [Docker](https://www.docker.com/) (for local Supabase)

### 1. Clone the Repository

```bash
git clone https://github.com/PredictionXBT/PredictOS.git
cd PredictOS
```

### 2. Start the Backend (Supabase)

```bash
# Navigate to supabase directory
cd supabase

# Copy environment template and add your API keys
cp .env.example .env.local
```

Edit `.env.local` with the credentials required for the features you want to use:

> 📖 **Feature-specific setup guides:**
> - **Super Intelligence:** [docs/features/super-intelligence.md](docs/features/super-intelligence.md) — requires `DOME_API_KEY` (Polymarket) + `DFLOW_API_KEY` (Kalshi) + AI provider keys (`XAI_API_KEY` and/or `OPENAI_API_KEY`). Optional: `POLYFACTUAL_API_KEY` for Polyfactual tool. For Autonomous mode: `POLYMARKET_WALLET_PRIVATE_KEY` + `POLYMARKET_PROXY_WALLET_ADDRESS`.
> - **Betting Bots:** [docs/features/betting-bots.md](docs/features/betting-bots.md) — requires `POLYMARKET_WALLET_PRIVATE_KEY` + `POLYMARKET_PROXY_WALLET_ADDRESS`
> - **Wallet Tracking:** [docs/features/wallet-tracking.md](docs/features/wallet-tracking.md) — requires `DOME_API_KEY` (frontend only, no Supabase needed)

Example for Super Intelligence (full setup):

```env
# Market Data Providers
DOME_API_KEY=your_dome_api_key              # Get from https://dashboard.domeapi.io (for Polymarket)
DFLOW_API_KEY=your_dflow_api_key            # Contact DFlow: https://x.com/dflow (for Kalshi)

# AI Providers (configure one or more)
XAI_API_KEY=your_xai_api_key                # Get from https://x.ai
OPENAI_API_KEY=your_openai_api_key          # Get from https://platform.openai.com
BLOCKRUN_WALLET_KEY=your_base_wallet_key    # Base chain private key - no API key needed, just a wallet. Get USDC on Base.

# Polyfactual Tool (optional, enables Polyfactual research tool)
POLYFACTUAL_API_KEY=your_polyfactual_key    # Contact Polyfactual to obtain

# Autonomous Mode (optional, for auto-execution on Polymarket)
POLYMARKET_WALLET_PRIVATE_KEY=0x...         # Your wallet private key
POLYMARKET_PROXY_WALLET_ADDRESS=0x...       # Your Polymarket proxy wallet
```

> 💡 **Note:** See the setup guides linked above for detailed instructions on obtaining each API key and configuration.

Start the Supabase services:

```bash
supabase start
```

Once running, get your local credentials (you'll need these for the frontend):

```bash
supabase status
```

This will display your `API URL` and `anon key` — save these for the next step.

Now start the Edge Functions server (keep this running):

```bash
supabase functions serve --env-file .env.local
```

### 3. Start the Frontend (Terminal)

Open a **new** terminal:

```bash
# Navigate to terminal directory
cd terminal

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` with credentials from `supabase status`:

```env
SUPABASE_URL=<API URL from supabase status>
SUPABASE_ANON_KEY=<anon key from supabase status>

# Edge Function URLs (for local development)
# Note that the base url might vary depending on `supabase status`:

# Super Intelligence endpoints
SUPABASE_EDGE_FUNCTION_GET_EVENTS=http://127.0.0.1:54321/functions/v1/get-events
SUPABASE_EDGE_FUNCTION_EVENT_ANALYSIS_AGENT=http://127.0.0.1:54321/functions/v1/event-analysis-agent
SUPABASE_EDGE_FUNCTION_BOOKMAKER_AGENT=http://127.0.0.1:54321/functions/v1/bookmaker-agent
SUPABASE_EDGE_FUNCTION_MAPPER_AGENT=http://127.0.0.1:54321/functions/v1/mapper-agent
SUPABASE_EDGE_FUNCTION_POLYMARKET_PUT_ORDER=http://127.0.0.1:54321/functions/v1/polymarket-put-order
SUPABASE_EDGE_FUNCTION_POLYFACTUAL_RESEARCH=http://127.0.0.1:54321/functions/v1/polyfactual-research

# Betting Bots endpoint
SUPABASE_EDGE_FUNCTION_BETTING_BOT=http://127.0.0.1:54321/functions/v1/polymarket-up-down-15-markets
```

Start the development server:

```bash
npm run dev
```

Your PredictOS terminal will be running at [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

**Frontend:**
- [Next.js 14](https://nextjs.org/) — React framework with App Router
- [React 18](https://react.dev/) — UI library
- [TailwindCSS](https://tailwindcss.com/) — Utility-first CSS
- [Lucide React](https://lucide.dev/) — Icon library

**Backend:**
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — Serverless Deno runtime
- [DFlow API](https://pond.dflow.net/introduction) — Kalshi prediction market data
- [Dome API](https://domeapi.io/) — Polymarket data & trading
- [xAI Grok](https://x.ai/) — xAI's reasoning models (Grok 4, Grok 4.1)
- [OpenAI GPT](https://openai.com/) — OpenAI's language models (GPT-4.1, GPT-5)
- [Irys](https://irys.xyz/) — Permanent blockchain storage for Verifiable Agents
- [x402 / PayAI](https://www.payai.network/) — HTTP 402 payment protocol for paid AI services

## 🤝 Partners and Collaborators

<table>
<tr>
    <td width="120" align="center">
      <a href="https://x.com/jellyvideochats">
        <img src="terminal/public/jellyjelly_logo.jpg" alt="JellyJelly" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://x.com/jellyvideochats">JellyJelly</a></h3>
      <p><strong>Co-Founder of Venmo building anti-BrainRot social media.</strong> JellyJelly is pioneering Web3 social with a fresh take on engaging, meaningful content.</p>
      <p>🔗 PredictOS is thrilled to partner with JellyJelly to bring Web3 social into the world of Prediction Markets. This integration turns the JellyJelly ecosystem into a playground for predictions — SocialFi x Prediction Markets is here, and this is just the beginning.</p>
      <p><a href="https://x.com/jellyvideochats">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://iqai.com/">
        <img src="terminal/public/IQAI.jpg" alt="IQ AI" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://iqai.com/">IQ AI</a></h3>
      <p><strong>AI and DeFi technology powered by the IQ token. Agent Tokenization Platform.</strong> IQ AI is at the forefront of decentralized AI infrastructure, combining blockchain knowledge with powerful AI agents.</p>
      <p>🔗 PredictOS is partnering with IQ AI to advance decentralized AI and prediction markets! As part of this collaboration, we're integrating their powerful AI agent, AIDEN, into our community — making blockchain knowledge more accessible and seamless for prediction market users. PredictOS is also featured on <a href="https://iq.wiki/wiki/predict">IQ.Wiki</a>, the world's largest blockchain encyclopedia.</p>
      <p><a href="https://iqai.com/">🌐 Website</a> · <a href="https://x.com/IQAICOM">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://www.privy.io/">
        <img src="terminal/public/Privy_logo.png" alt="Privy" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://www.privy.io/">Privy</a></h3>
      <p><strong>Wallet infrastructure for winning teams.</strong> Recently acquired by Stripe, Privy powers 100M+ accounts and processes billions in volume every year with low-level APIs for onchain payments and asset management.</p>
      <p>🔗 PredictOS partners with Privy to supercharge wallet infrastructure across the Predict ecosystem — delivering more secure, seamless, and unified wallet integrations to make it easier than ever to onboard users with any wallet.</p>
      <p><a href="https://www.privy.io/">🌐 Website</a> · <a href="https://x.com/privy_io">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://pond.dflow.net/introduction">
        <img src="terminal/public/Dflow_logo.png" alt="DFlow" width="80" height="80" style="border-radius: 12px; background: #1e1b4b; padding: 8px;" />
      </a>
    </td>
    <td>
      <h3><a href="https://pond.dflow.net/introduction">DFlow</a></h3>
      <p><strong>High-precision, low-latency Solana DEX aggregator.</strong> DFlow delivers the most advanced trading infrastructure on Solana, unlocking cutting-edge financial markets for applications.</p>
      <p>Their Prediction Markets API provides a seamless, programmatic gateway to tokenized Kalshi event contracts — offering deep liquidity, broad coverage, and full onchain composability.</p>
      <p>🔗 PredictOS integrates DFlow's Prediction Markets API to bring tokenized <strong>Kalshi</strong> markets directly to Solana builders, empowering agentic workflows and multi-agent collaborations powered by real-world predictive intelligence.</p>
      <p><a href="https://pond.dflow.net/introduction">🌐 Website</a> · <a href="https://x.com/dflow">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://domeapi.io/">
        <img src="terminal/public/dome-icon-light.svg" alt="Dome API" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://domeapi.io/">Dome API</a></h3>
      <p><strong>The unified API for prediction markets.</strong> Dome provides seamless access to Polymarket through an elegant interface with WebSocket support for real-time data.</p>
      <p>🔗 PredictOS uses Dome for <strong>Polymarket</strong> market data, order execution, and real-time wallet tracking via WebSocket feeds.</p>
      <p><a href="https://domeapi.io/">🌐 Website</a> · <a href="https://dashboard.domeapi.io/">📊 Dashboard</a> · <a href="https://x.com/getdomeapi">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://www.payai.network/">
        <img src="terminal/public/payai.jpg" alt="PayAI" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://www.payai.network/">PayAI (x402)</a></h3>
      <p><strong>The HTTP 402 payment protocol for AI agents.</strong> PayAI enables seamless machine-to-machine payments using the x402 protocol, allowing AI agents to pay for API calls and services automatically with USDC on Solana or Base.</p>
      <p>🔗 PredictOS integrates PayAI to power the <strong>x402 Tool</strong> in Super Intelligence — enabling agents to discover and call paid AI services from the PayAI bazaar with automatic payment handling. Browse sellers, select services, and let your agents pay for premium data and analysis.</p>
      <p><a href="https://www.payai.network/">🌐 Website</a> · <a href="https://docs.payai.network/">📖 Docs</a> · <a href="https://x.com/PayAINetwork">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://irys.xyz/">
        <img src="terminal/public/iris.jpg" alt="IRYS" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://irys.xyz/">IRYS</a></h3>
      <p><strong>The high-performance datachain unifying storage and native smart contract execution.</strong></p>
      <p>🔗 PredictOS integrates IRYS to power <strong>Verifiable Agents</strong> — permanently storing all agent analysis, recommendations, and execution results on the blockchain for transparent, auditable AI predictions. This creates an immutable record of agent decisions that anyone can verify.</p>
      <p><a href="https://irys.xyz/">🌐 Website</a> · <a href="https://docs.irys.xyz/">📖 Docs</a> · <a href="https://x.com/irys_xyz">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://blockrun.ai/">
        <img src="https://blockrun.ai/icon-white.png" alt="BlockRun" width="80" height="80" style="background: #000; border-radius: 12px; padding: 8px;" />
      </a>
    </td>
    <td>
      <h3><a href="https://blockrun.ai/">BlockRun</a></h3>
      <p><strong>Discovery and gateway for x402 AI services.</strong> BlockRun provides pay-per-request access to 20+ AI models (GPT, Claude, Gemini, Grok, DeepSeek) via x402 micropayments. No API key needed — just a Base chain wallet.</p>
      <p>🔗 PredictOS integrates BlockRun as an alternative AI provider for Super Intelligence — enabling wallet-based, pay-per-request access to multiple LLM providers without managing separate API keys. Simply fund your wallet with USDC on Base and access any model.</p>
      <p><a href="https://blockrun.ai/">🌐 Website</a> · <a href="https://blockrun.ai/docs">📖 Docs</a> · <a href="https://x.com/BlockRunAI">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://tryokbet.com/">
        <img src="terminal/public/okbet.svg" alt="OKBet" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://tryokbet.com/">OKBet</a></h3>
      <p><strong>The FIRST all-in-one prediction markets bot.</strong> Available on Telegram and soon on web, OKBet makes it easy to trade prediction markets from anywhere.</p>
      <p>🔗 Our <a href="https://x.com/predict_agent">Predict_Agent</a> provides direct OKBet links to place bets on Kalshi and Polymarket in Telegram.</p>
      <p><a href="https://t.me/okdotbet_bot">🤖 Telegram</a> · <a href="https://tryokbet.com/">🌐 Website</a> · <a href="https://docs.tryokbet.com/">📖 Docs</a> · <a href="https://x.com/tryokbet">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://www.polyfactual.com/">
        <img src="terminal/public/polyfacts.svg" alt="Polyfactual" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://www.polyfactual.com/">Polyfactual</a></h3>
      <p><strong>Deep AI research & API layer for prediction markets.</strong> Polyfactual also provides Weekly Polymarket livestreams on news + ecosystem developments.</p>
      <p>🔗 PredictOS integrates Polyfactual's Deep Research API to power the Polyfactual tool in Super Intelligence — enabling agents to get comprehensive answers with citations.</p>
      <p><a href="https://www.polyfactual.com/">🌐 Website</a> · <a href="https://x.com/polyfactual">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://heyanon.ai/">
        <img src="terminal/public/heyanon.jpg" alt="Hey Anon" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://heyanon.ai/">Hey Anon</a></h3>
      <p><strong>Building AI tools for investors, traders, developers, and institutions — DeFAI.</strong> Hey Anon is launching Pandora, a fully permissionless prediction market where users can create their own markets and earn fees.</p>
      <p>🔗 PredictOS is partnering with Hey Anon to integrate Pandora and bring Alpha Terminal insights to permissionless markets — together we're building the future of decentralized prediction markets.</p>
      <p><a href="https://heyanon.ai/">🌐 Website</a> · <a href="https://x.com/HeyAnonai">𝕏 Twitter</a></p>
    </td>
  </tr>
  <tr>
    <td width="120" align="center">
      <a href="https://li.fi/">
        <img src="terminal/public/LIFI_logo.png" alt="LI.FI" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://li.fi/">LI.FI</a></h3>
      <p><strong>The universal market for digital assets.</strong> One API for swaps, bridging, or any action onchain. Integrated by Robinhood Wallet, MetaMask, Phantom + 800 partners.</p>
      <p>🔗 PredictOS is teaming up with LI.FI to make prediction markets faster and easier with cross-chain swaps & transfers. LI.FI provides one API for seamless swaps and bridging across EVM chains, Solana, and Bitcoin — trusted by Robinhood Wallet, MetaMask, Phantom, and 800+ partners. Together, we're powering optimized swaps, transfers, and payments across the Predict ecosystem, bringing universal liquidity to prediction markets and digital assets.</p>
      <p><a href="https://li.fi/">🌐 Website</a> · <a href="https://x.com/lifiprotocol">𝕏 Twitter</a></p>
    </td>
  </tr>
</table>

## 💪 Contributing

We welcome contributions from the community! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website:** [predictionxbt.fun](https://predictionxbt.fun)
- **Twitter/X:** [@prediction_xbt](https://x.com/prediction_xbt)
- **GitHub:** [PredictionXBT/PredictOS](https://github.com/PredictionXBT/PredictOS)

---

## Star History

<a href="https://star-history.com/#PredictionXBT/PredictOS&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=PredictionXBT/PredictOS&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=PredictionXBT/PredictOS&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=PredictionXBT/PredictOS&type=Date" />
  </picture>
</a>

---

<div align="center">
  <p>Built with ❤️ by the PredictionXBT team</p>
  <p><sub>Powered by <a href="https://domeapi.io/">Dome</a> (Polymarket) & <a href="https://pond.dflow.net/introduction">DFlow</a> (Kalshi)</sub></p>
</div>
