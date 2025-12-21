# Auto-Claim Setup Guide

Auto-Claim automatically redeems your winning positions from resolved Polymarket markets, converting your winning outcome tokens back to USDC.

## Prerequisites

### Wallet Requirements

> **Important:** Auto-Claim only works with **browser wallet logins** (MetaMask, Rabby, etc.), NOT social logins (Google, Discord, Email/Magic).

| Login Method | Works with Auto-Claim? | Why? |
|--------------|------------------------|------|
| MetaMask | ✅ Yes | Creates a Gnosis Safe you control |
| Rabby | ✅ Yes | Creates a Gnosis Safe you control |
| Coinbase Wallet | ✅ Yes | Creates a Gnosis Safe you control |
| Google (Social) | ❌ No | Creates a Polymarket Proxy you don't control |
| Discord (Social) | ❌ No | Creates a Polymarket Proxy you don't control |
| Email/Magic | ❌ No | Creates a Polymarket Proxy you don't control |

### Why This Matters

When you log into Polymarket:

- **Browser wallets** create a **Gnosis Safe** (1-of-1 multisig) where your browser wallet is the owner. You have the private key, so you can sign transactions.

- **Social logins** create a **Polymarket Proxy** where Magic.link controls the underlying wallet. Even if you export the "private key", it's for a different wallet than the one that owns the proxy.

### Setting Up a Compatible Wallet

If you currently use social login and want to use Auto-Claim:

1. **Install a browser wallet** (we recommend [Rabby](https://rabby.io/))
2. **Create or import a wallet** with some POL for gas (~$5 worth is plenty)
3. **Go to Polymarket** and connect with your browser wallet
4. **Your new Safe address** will be shown in Polymarket's account settings
5. **Transfer funds** from your old account to your new one (if needed)

## Environment Variables

Add these to your `supabase/.env.local`:

```env
# Your browser wallet's private key (the one that owns the Safe)
POLYMARKET_WALLET_PRIVATE_KEY=0x...

# Your Polymarket proxy/Safe address (shown in Polymarket account settings)
POLYMARKET_PROXY_WALLET_ADDRESS=0x...

# Optional: Custom RPC URL (defaults to https://polygon-rpc.com)
POLYGON_RPC_URL=https://polygon-rpc.com
```

### Finding Your Addresses

1. **POLYMARKET_WALLET_PRIVATE_KEY**: Export from your browser wallet (Rabby/MetaMask settings)
2. **POLYMARKET_PROXY_WALLET_ADDRESS**: Found in Polymarket → Settings → Account → "Proxy Wallet" or "Safe Address"

### Verifying Your Setup

You can verify your wallet setup by running:

```bash
cd terminal
node test-safe-redeem.js
```

This will confirm:
- Your signer is an owner of the Safe
- The Safe threshold is 1 (single signature needed)
- Your POL balance for gas fees

## How It Works

1. **Scan**: Fetches your positions from Polymarket's Data API
2. **Filter**: Identifies winning positions (curPrice === 1) that are redeemable
3. **Claim**: Calls the CTF contract's `redeemPositions` through your Gnosis Safe
4. **Confirm**: Waits for transaction confirmation and updates your USDC balance

## Gas Fees

- Claims are executed on Polygon, so gas fees are minimal (~$0.01-0.05 per claim)
- Gas is paid from your **signer wallet** (browser wallet), not from the Safe
- Keep some POL in your signer wallet for gas fees

## Troubleshooting

### "Signer is not Safe owner"

Your private key doesn't match the Safe. Make sure you're using the private key from the browser wallet you used to log into Polymarket.

### "GS026: Invalid owner signature"

Same issue as above - the signer isn't authorized to execute transactions on the Safe.

### "No redeemable positions found"

Either:
- You have no winning positions
- Winning positions were already claimed
- Markets haven't resolved yet

### Transaction Stuck

Polygon can sometimes have network congestion. The auto-claim uses the Polygon Gas Station API to get optimal gas prices, but you can manually increase the gas if needed.
