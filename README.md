<p align="center">
  <img src="terminal/public/predict-os-banner.png" alt="PredictOS Banner" width="100%">
</p>

<h1 align="center">PredictOS</h1>

<p align="center"><strong>The leading all-in-one open-source framework for deploying custom AI agents and trading bots purpose-built for prediction markets - bring your own data, models, and strategies to dominate prediction forecasting</strong></p>

<p align="center"><em>Built by <a href="https://predictionxbt.fun">PredictionXBT</a>, the team behind <strong>Predict</strong> — The Layer 1 for Social Prediction Market</em></p>

<div align="center">

  <p><a href="https://predictionxbt.fun">🌐 Social Prediction Markets</a> · <a href="https://x.com/prediction_xbt">𝕏 PredictionXBT</a> · <a href="https://predictionxbt.fun/terminal">🖥️ Alpha/Arb Terminal</a> · <a href="https://x.com/predict_agent">🤖 Predict Agent</a></p>

  <a href="https://github.com/PredictionXBT/PredictOS/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/PredictionXBT/PredictOS"><img src="https://img.shields.io/badge/version-1.0.1-blue?style=for-the-badge" alt="Version"></a>

</div>

<br />

## ✨ What is PredictOS?

Prediction markets are having their moment. With platforms like **Kalshi** and **Polymarket** opening up their APIs to the public, there's now unprecedented access to real-time market data, order books, and trading capabilities. But raw API access is just the beginning — what's been missing is a unified framework that lets anyone tap into this new financial primitive.

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
  <a href="https://domeapi.io/"><img src="https://img.shields.io/badge/Powered%20by-Dome%20API-00D4AA?style=for-the-badge" alt="Dome API" /></a>
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

## 🎯 Current Features (v1.0.1)

| Feature | Status | Description | Setup Guide |
|---------|--------|-------------|-------------|
| **AI Market Analysis** | ✅ Released | Paste a Kalshi or Polymarket URL and get instant AI-powered analysis with probability estimates, confidence scores, and trading recommendations. Includes **Polyfactual Deep Research** — ask any question and get comprehensive AI-powered answers with citations. | [📖 Setup Guide](docs/features/market-analysis.md) |
| **Betting Bots** | ✅ Released | Polymarket 15 Minute Up/Down Arbitrage Bot (more bots coming) | [📖 Setup Guide](docs/features/betting-bots.md) |
| **Wallet Tracking** | ✅ Released | Real-time order tracking for any Polymarket wallets using Dome SDK WebSockets — 10 seconds faster than hosted bots | [📖 Setup Guide](docs/features/wallet-tracking.md) |

## 🔮 Coming Soon

| Feature | Description |
|---------|-------------|
| **Agent Battles (x402)** | Pit AI agents against each other to discover winning strategies |
| **No Code Builder** | Build trading strategies without writing code |
| **Whale Tracking** | Automated alerts and analysis for large traders across markets |
| **Copytrading** | Automatically copy top-performing traders |
| **Arbitrage Opportunity** | Detect and exploit cross-platform price differences |
| **Perps Trading / Leverage** | Leveraged prediction market positions |
| **$Predict Staking** | Stake for APY rewards, unlock enhanced trading abilities, and get boosted access to prediction markets |
| **Predict Protocol SDK** | For trading Social markets built on Predict (currently Testnet on [predictionxbt.fun](https://predictionxbt.fun)) |

## 📦 Architecture

```
PredictOS/
├── terminal/                        # Frontend (Next.js 14)
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   ├── components/              # React components
│   │   └── types/                   # TypeScript definitions
│   └── public/                      # Static assets
│
└── supabase/                        # Backend (Supabase)
    ├── migrations/                  # DB migrations (future features)
    └── functions/
        ├── _shared/                 # Shared utilities
        │   ├── ai/                  # AI integrations (xAI Grok & OpenAI)
        │   ├── dome/                # Dome API client
        │   └── polyfactual/         # Polyfactual Deep Research client
        ├── analyze-event-markets/   # Market analysis endpoint
        ├── polyfactual-research/    # Deep research endpoint
        └── <feature-name>/          # Future edge functions
```

> 💡 **Extensibility:** New features are added as Edge Functions under `supabase/functions/<feature-name>/` with shared logic in `_shared/`. Database schemas live in `supabase/migrations/`.

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
> - **Market Analysis:** [docs/features/market-analysis.md](docs/features/market-analysis.md) — requires `DOME_API_KEY` + AI provider key (`XAI_API_KEY` or `OPENAI_API_KEY`). Polyfactual tab requires `POLYFACTUAL_API_KEY`.
> - **Betting Bots:** [docs/features/betting-bots.md](docs/features/betting-bots.md) — requires `POLYMARKET_WALLET_PRIVATE_KEY` + `POLYMARKET_PROXY_WALLET_ADDRESS`
> - **Wallet Tracking:** [docs/features/wallet-tracking.md](docs/features/wallet-tracking.md) — requires `DOME_API_KEY` (frontend only, no Supabase needed)

Example for Market Analysis:

```env
DOME_API_KEY=your_dome_api_key      # Get from https://dashboard.domeapi.io

# AI Provider (only one is required)
XAI_API_KEY=your_xai_api_key        # Get from https://x.ai
OPENAI_API_KEY=your_openai_api_key  # Get from https://platform.openai.com

# Polyfactual Deep Research (optional, for Polyfactual tab)
POLYFACTUAL_API_KEY=your_polyfactual_api_key  # Contact Polyfactual to obtain
```

Example for Betting Bots:

```env
POLYMARKET_WALLET_PRIVATE_KEY=0x...  # Your wallet private key
POLYMARKET_PROXY_WALLET_ADDRESS=0x...  # Your Polymarket proxy wallet
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
SUPABASE_EDGE_FUNCTION_ANALYZE_EVENT_MARKETS=http://127.0.0.1:54321/functions/v1/analyze-event-markets  # Required for Market Analysis
SUPABASE_EDGE_FUNCTION_POLYFACTUAL_RESEARCH=http://127.0.0.1:54321/functions/v1/polyfactual-research    # Required for Polyfactual tab
SUPABASE_EDGE_FUNCTION_BETTING_BOT=http://127.0.0.1:54321/functions/v1/polymarket-up-down-15-markets    # Required for Betting Bots
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
- [Dome API](https://domeapi.io/) — Unified prediction market data
- [xAI Grok](https://x.ai/) — xAI's reasoning models (Grok 4, Grok 4.1)
- [OpenAI GPT](https://openai.com/) — OpenAI's language models (GPT-4.1, GPT-5)

## 🤝 Partners

<table>
  <tr>
    <td width="120" align="center">
      <a href="https://domeapi.io/">
        <img src="terminal/public/dome-icon-light.svg" alt="Dome API" width="80" height="80" />
      </a>
    </td>
    <td>
      <h3><a href="https://domeapi.io/">Dome API</a></h3>
      <p><strong>The unified API for prediction markets.</strong> Dome provides seamless access to Kalshi, Polymarket, and other prediction market platforms through a single, elegant interface.</p>
      <p>🔗 PredictOS is proudly powered by Dome — they handle the complexity of multi-platform data aggregation so we can focus on building the best trading tools.</p>
      <p><a href="https://domeapi.io/">🌐 Website</a> · <a href="https://dashboard.domeapi.io/">📊 Dashboard</a> · <a href="https://x.com/getdomeapi">𝕏 Twitter</a></p>
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
      <p>🔗 PredictOS integrates Polyfactual's Deep Research API to power the Polyfactual tab in Market Analysis — ask any question and get comprehensive answers with citations.</p>
      <p><a href="https://www.polyfactual.com/">🌐 Website</a> · <a href="https://x.com/polyfactual">𝕏 Twitter</a></p>
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

## Star History [![Star History Chart](https://api.star-history.com/svg?repos=PredictionXBT/PredictOS&type=Date&theme=dark&v=1)](https://star-history.com/#PredictionXBT/PredictOS&Date)

---

<div align="center">
  <p>Built with ❤️ by the PredictionXBT team</p>
  <p><sub>Powered by <a href="https://domeapi.io/">Dome</a></sub></p>
</div>

