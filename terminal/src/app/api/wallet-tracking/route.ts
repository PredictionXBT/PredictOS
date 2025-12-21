import { DomeClient } from "@dome-api/sdk";
import { NextRequest } from "next/server";

// Store active connections and their WebSocket instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeConnections = new Map<string, {
  ws: ReturnType<DomeClient["polymarket"]["createWebSocket"]>;
  subscriptionId: string;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("wallet");

  if (!walletAddress) {
    return new Response(JSON.stringify({ error: "Wallet address is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate wallet address format
  if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return new Response(JSON.stringify({ error: "Invalid wallet address format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.DOME_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "DOME_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a streaming response using SSE
  const encoder = new TextEncoder();
  let isConnectionClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        if (isConnectionClosed) return;
        try {
          const message = JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Connection might be closed
        }
      };

      try {
        const dome = new DomeClient({
          apiKey,
        });

        const ws = dome.polymarket.createWebSocket({
          reconnect: {
            enabled: true,
            maxAttempts: 10,
            delay: 1000,
          },
        });

        // Handle connection events
        ws.on("open", () => {
          sendEvent("connected", { message: "WebSocket connected to Dome" });
        });

        ws.on("close", () => {
          sendEvent("disconnected", { message: "WebSocket disconnected" });
        });

        ws.on("error", (error) => {
          sendEvent("error", { error: error.message || "WebSocket error" });
        });

        // Handle order events
        ws.on("order", (order) => {
          sendEvent("order", {
            token_id: order.token_id,
            side: order.side,
            market_slug: order.market_slug,
            condition_id: order.condition_id,
            shares: order.shares,
            shares_normalized: order.shares_normalized,
            price: order.price,
            tx_hash: order.tx_hash,
            title: order.title,
            timestamp: order.timestamp,
            order_hash: order.order_hash,
            user: order.user,
          });
        });

        // Connect to WebSocket
        await ws.connect();

        // Subscribe to the wallet
        const subscription = await ws.subscribe({
          users: [walletAddress.toLowerCase()],
        });

        sendEvent("subscribed", { 
          subscription_id: subscription.subscription_id,
          message: `Subscribed to wallet: ${walletAddress}` 
        });

        // Store the connection for cleanup
        const connectionId = `${walletAddress}-${Date.now()}`;
        activeConnections.set(connectionId, {
          ws,
          subscriptionId: subscription.subscription_id,
        });

        // Send periodic heartbeats (every 30 seconds) - filtered on client side
        const heartbeatInterval = setInterval(() => {
          if (!isConnectionClosed) {
            sendEvent("heartbeat", { status: "alive" });
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        // Handle stream cancellation
        request.signal.addEventListener("abort", () => {
          isConnectionClosed = true;
          clearInterval(heartbeatInterval);
          ws.close();
          activeConnections.delete(connectionId);
        });

      } catch (error) {
        sendEvent("error", { 
          error: error instanceof Error ? error.message : "Failed to connect to Dome WebSocket" 
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

