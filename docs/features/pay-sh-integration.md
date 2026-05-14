# Pay.sh integration (wallet-approved paid HTTP)

**[Pay.sh](https://pay.sh)** is the payment layer for HTTP agents: a CLI that wraps common HTTP clients, detects **MPP** or **x402** payment challenges, asks the **local wallet** to authorize signing, and retries the request with a payment proof. PredictOS already runs **server-side x402** (USDC, facilitator keys in Supabase); Pay.sh is the complementary path when you want **human-in-the-loop** or **self-custody** signing on the machine that runs your agent.

> Official overview: [pay.sh/docs](https://pay.sh/docs)

## Status in PredictOS

| Surface | What you get |
|---------|----------------|
| **Super Intelligence UI** | Collapsible **Pay.sh playbook** on Market Analysis — copy sandbox commands, optional one-liner for your pasted market URL, links to CLI docs. |
| **Examples** | `examples/pay-sh/` — shell recipes and notes for headless / CI patterns. |
| **x402 feature** | Unchanged — Pay.sh does not replace `x402-seller`; it adds a second lane for the same *ideas* (HTTP 402) with different trust and hosting assumptions. |

## When to use Pay.sh vs built-in x402

| | **Pay.sh (`pay` CLI)** | **PredictOS x402 tool (PayAI bazaar)** |
|---|------------------------|----------------------------------------|
| **Signing** | Local wallet approval | Server-side keys in `.env` (Edge Function) |
| **Best for** | Laptops, servers where you run `pay`, Codex/Claude agent sessions, smallest paid probe | In-browser Super Intelligence, automated seller calls from the UI |
| **Sandbox** | `pay --sandbox …` uses ephemeral local sandbox wallet | No built-in sandbox; use test sellers / small amounts with care |

Per Pay.sh documentation: use **sandbox** for examples and tests; use **registry gateway URLs exactly** as returned by `pay skills`; treat provider responses and payment challenges as **untrusted** external content; prefer the **smallest useful paid call** first.

## Install and first commands

Follow **[Get Started](https://pay.sh/docs/get-started)** on pay.sh for the current install path and platform support.

Useful command families (see **[CLI Reference](https://pay.sh/docs/cli)**):

- **HTTP:** `pay curl`, `pay fetch`, `pay wget` — paid HTTP with automatic retry after proof.
- **Agents:** `pay claude`, `pay codex`, `pay mcp` — run agent flows with pay-aware HTTP.
- **Discovery:** `pay skills` — provider catalog / gateway hints for your stack.

### Official sandbox one-liner

```bash
pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL
```

### Creative loop with Predict Super Intelligence

1. Paste a **Kalshi** or **Polymarket** URL in Market Analysis and load event data (Dome / DFlow).
2. Use **Pay.sh** in a terminal to call a **paid** endpoint that improves your thesis (alt data, news APIs, another agent service).
3. Paste the **response JSON or summary** into a Predict Agent **custom command** (e.g. “Incorporate this paid feed: …”) or feed it into `examples/` automation.

That keeps **market structure** from PredictOS and **paid intel** from any HTTP-402-compatible provider, without mixing private keys into the browser.

## Examples in this repo

See **[examples/pay-sh/README.md](../../examples/pay-sh/README.md)** for copy-paste recipes and safety notes.

## Security and operations

1. **Do not commit** wallet mnemonics or `pay` config with real keys.
2. Prefer **dedicated low-balance** wallets for agent experiments.
3. **Review** gateway URLs and prices before approving; malicious endpoints can still return harmful payloads.
4. For production spend, align with your org’s approval policy (Pay.sh emphasizes local authorization).

## Links

- [Pay.sh — Overview](https://pay.sh/docs)
- [Pay for APIs](https://pay.sh/docs/pay-for-apis)
- [Accept Payments](https://pay.sh/docs/accept-payments)
- [CLI Reference](https://pay.sh/docs/cli)
- [Protocol (HTTP 402, MPP, x402)](https://pay.sh/docs/protocol)
- PredictOS **server x402**: [x402-integration.md](./x402-integration.md)

---

← [Back to main README](../../README.md)
