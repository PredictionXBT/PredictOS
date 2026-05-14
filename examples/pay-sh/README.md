# Pay.sh × PredictOS examples

Small, copy-paste **terminal** workflows for using [Pay.sh](https://pay.sh/docs) alongside PredictOS agents and Super Intelligence.

## Prerequisites

- Install `pay` using the official [Get Started](https://pay.sh/docs/get-started) instructions.
- Read the Pay.sh **agent summary**: prefer `--sandbox` for learning; treat providers as untrusted; use the smallest paid call that answers your question.

## Scripts

| File | Purpose |
|------|---------|
| [`recipes.sh`](./recipes.sh) | Runnable comments + the documented sandbox `curl` example (safe to run; uses sandbox). |

```bash
chmod +x recipes.sh
./recipes.sh
```

## Workflow: paid HTTP → Predict agent command

1. Run PredictOS Market Analysis and copy market context (URL, thesis).
2. In a terminal, call your paid endpoint with Pay.sh, e.g.  
   `pay --sandbox curl 'https://your-registry-or-402-url'`  
   (swap `--sandbox` only when you deliberately want mainnet spend).
3. Paste the **structured result** (or a tight summary) into a Predict Agent **custom command** so Grok/GPT reasons over **Dome/DFlow data + paid layer**.

## Workflow: `pay` + headless coding agents

If you use `pay claude`, `pay codex`, or `pay mcp`, keep **registry URLs** exactly as `pay skills` returns and cap exploration to avoid unclear pricing — same discipline as trading size on a new market.

## See also

- [docs/features/pay-sh-integration.md](../../docs/features/pay-sh-integration.md) — full PredictOS feature doc  
- [docs/features/x402-integration.md](../../docs/features/x402-integration.md) — in-app PayAI / facilitator flow  
