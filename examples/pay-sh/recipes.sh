#!/usr/bin/env bash
# PredictOS + Pay.sh — safe sandbox recipes
# Docs: https://pay.sh/docs | Protocol: https://pay.sh/docs/protocol

set -euo pipefail

echo "== PredictOS Pay.sh recipes (sandbox) =="
echo ""
echo "1) Documented sandbox quote (from pay.sh overview — no PredictOS API key required):"
echo "   pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL"
echo ""

if command -v pay >/dev/null 2>&1; then
  echo "Running the sandbox example via local 'pay' binary..."
  pay --sandbox curl https://payment-debugger.vercel.app/mpp/quote/AAPL
else
  echo "'pay' not found in PATH — install from https://pay.sh/docs/get-started then re-run."
  exit 0
fi
