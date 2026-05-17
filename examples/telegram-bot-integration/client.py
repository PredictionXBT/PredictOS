"""
PredictOS TGE Discord Agent - Python Client

Two modes:
  1. Detection only — returns signal, your bot trades locally
  2. Auto-trade — agent trades with server wallet (for demo/standalone use)
"""

import os
from typing import Optional, Dict, Any

import requests


class PredictOSClient:
    """
    Client for PredictOS TGE Discord Agent.

    Detection mode (recommended for bots with their own wallets):
        client = PredictOSClient()
        signal = client.detect(channel_id="123", market_slug="will-x-tge")
        if signal["detected"] and signal["confidence"] >= 0.6:
            # Your bot trades with user's wallet from your DB
            your_clob_client.place_order(...)

    Auto-trade mode (for demo / standalone):
        result = client.detect_and_trade(
            channel_id="123",
            market_slug="will-x-tge",
            side="YES",
            budget_usdc=10,
        )
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> None:
        self.base_url = base_url or os.getenv("PREDICTOS_URL")
        self.api_key = api_key or os.getenv("PREDICTOS_KEY")

        if not self.base_url:
            raise ValueError("PREDICTOS_URL not set")

        self.headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    def _call(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            resp = requests.post(
                f"{self.base_url}/tge-discord-agent",
                headers=self.headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as exc:
            return {"detected": False, "error": str(exc)}

    # ── Mode 1: Detection only (recommended for bot integration) ─────────

    def detect(
        self,
        channel_id: str,
        market_slug: Optional[str] = None,
        limit: int = 10,
        search_query: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Check Discord channel for TGE signals. No trading.
        Your bot decides what to do with the signal.

        Returns:
            {
                "detected": bool,
                "confidence": float,       # 0-1
                "project": str | None,
                "keywords": ["TGE", ...],
                "recommendation": "BUY YES" | "MONITOR",
                "dome_markets": [...],      # Dome API market data
                "tool_discovery": {...},    # x402 discovery info
            }
        """
        payload: Dict[str, Any] = {
            "channelId": channel_id,
            "checkLatest": False,
            "limit": limit,
        }
        if market_slug:
            payload["marketSlug"] = market_slug
        if search_query:
            payload["searchQuery"] = search_query

        return self._call(payload)

    # ── Mode 2: Detection + trade (demo / standalone) ────────────────────

    def detect_and_trade(
        self,
        channel_id: str,
        market_slug: str,
        side: str = "YES",
        budget_usdc: float = 5,
        min_confidence: float = 0.6,
    ) -> Dict[str, Any]:
        """
        Check Discord + auto-trade via server wallet if TGE detected.
        Uses POLYMARKET_WALLET_PRIVATE_KEY from edge function env.
        """
        return self._call({
            "channelId": channel_id,
            "checkLatest": False,
            "limit": 10,
            "marketSlug": market_slug,
            "autoTrade": {
                "enabled": True,
                "side": side,
                "budgetUsdc": budget_usdc,
                "minConfidence": min_confidence,
            },
        })


if __name__ == "__main__":
    client = PredictOSClient()

    # Detection only — no trade
    signal = client.detect(channel_id="1072952844161916938")

    if signal.get("detected"):
        print(f"TGE: {signal.get('project')} | {signal.get('confidence'):.0%}")
        print(f"Keywords: {', '.join(signal.get('keywords', []))}")
        print(f"Action: {signal.get('recommendation')}")

        # Dome markets found
        for m in signal.get("dome_markets", []):
            print(f"  Market: {m['question']} | {m['slug']}")

        # x402 tool
        tool = signal.get("tool_discovery")
        if tool:
            print(f"  x402: {tool['name']}")
    else:
        print("No TGE detected")
