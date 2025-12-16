<p align="center">
  <img src="terminal/public/predict-os-banner.png" alt="PredictOS Banner" width="100%">
</p>

<h1 align="center">PredictOS</h1>

<p align="center"><strong>The leading all-in-one open-source framework for deploying custom AI agents and trading bots purpose-built for prediction markets - bring your own data, models, and strategies to dominate prediction forecasting</strong></p>

<p align="center"><em>Built by <a href="https://predictionxbt.fun">PredictionXBT</a>, the team behind <strong>Predict</strong> — The Layer 1 for Social Prediction Market</em></p>

<div align="center">

  <a href="https://github.com/PredictionXBT/PredictOS/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/PredictionXBT/PredictOS"><img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="Version"></a>
  <a href="https://predictionxbt.fun"><img src="https://img.shields.io/badge/Website-predictionxbt.fun-purple?style=for-the-badge" alt="Website"></a>
  <a href="https://x.com/prediction_xbt"><img src="https://img.shields.io/badge/Twitter-@prediction__xbt-black?style=for-the-badge&logo=x" alt="Twitter"></a>

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
  <a href="https://x.ai/"><img src="https://img.shields.io/badge/AI-xAI%20Grok-orange?style=for-the-badge" alt="xAI Grok" /></a>
  <a href="https://openai.com/"><img src="https://img.shields.io/badge/AI-OpenAI%20GPT-10a37f?style=for-the-badge" alt="OpenAI GPT" /></a>
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

## 🎯 Current Features (v0.1)

| Feature | Status | Description |
|---------|--------|-------------|
| **AI Market Analysis** | ✅ Released | Paste a Kalshi or Polymarket URL and get instant AI-powered analysis with probability estimates, confidence scores, and trading recommendations |

## 🔮 Coming Soon

| Feature | Description |
|---------|-------------|
| **Agent Battles (x402)** | Pit AI agents against each other to discover winning strategies |
| **Betting Bots** | Automated trading bots with customizable strategies |
| **No Code Builder** | Build trading strategies without writing code |
| **Whale Tracking** | Monitor and follow large traders across markets |
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
        │   └── dome/                # Dome API client
        ├── analyze-event-markets/   # Market analysis endpoint
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

Edit `.env.local` with your credentials:

```env
DOME_API_KEY=your_dome_api_key      # Get from https://domeapi.io

# AI Provider (only one is required)
XAI_API_KEY=your_xai_api_key        # Get from https://x.ai
OPENAI_API_KEY=your_openai_api_key  # Get from https://platform.openai.com
```

> 💡 **Note:** You only need ONE AI provider API key. If you have an xAI API key, you can use Grok models. If you have an OpenAI API key, you can use GPT models. You can also configure both to switch between providers.  
> 
> 🚀 **Coming soon:** You'll be able to run multiple agents in parallel for more powerful, concurrent analyses!

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

<div align="center">
  <table>
    <tr>
      <td align="center" width="300">
        <a href="https://domeapi.io/">
          <img src="terminal/public/dome-icon-light.svg" alt="Dome API" width="80" height="80" />
          <br />
          <strong>Dome API</strong>
        </a>
        <br />
        <sub>The unified API for prediction markets</sub>
        <br /><br />
        <a href="https://domeapi.io/">🌐 Website</a> · <a href="https://x.com/getdomeapi">𝕏 Twitter</a>
      </td>
    </tr>
  </table>
</div>

PredictOS is proudly powered by [Dome](https://domeapi.io/) — the unified API that provides seamless access to Kalshi, Polymarket, and other prediction market platforms through a single, elegant interface. Dome handles the complexity of multi-platform data aggregation so we can focus on building the best trading tools.

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

<div align="center">
  <p>Built with ❤️ by the PredictionXBT team</p>
  <p><sub>Powered by <a href="https://domeapi.io/">Dome</a></sub></p>
</div>

