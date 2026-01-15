# Auto-Claim Feature

Automatically redeem winning positions on Polymarket with intelligent gas pricing and configurable check intervals.

## Overview

The Auto-Claim feature monitors your Polymarket positions and automatically redeems winning shares when markets are resolved. It uses Polygon Gas Station V2 for optimal gas pricing and supports both browser wallets (Gnosis Safe signatures) and private key wallets.

## Features

- **Automatic Position Monitoring** - Checks for claimable positions at configurable intervals (5-60 minutes)
- **Polygon Gas Station V2 Integration** - Uses real-time gas prices for cost-effective transactions
- **Gnosis Safe Support** - Compatible with browser wallet users through Gnosis Safe signature format
- **Wallet Balance Display** - Shows current USDC and POL (for gas) balances
- **Manual Override** - Option to manually claim positions at any time
- **Persistent Settings** - Stores configuration in localStorage for convenience

## How It Works

1. **Position Detection** - The system queries your Polymarket positions and identifies resolved markets with winning shares
2. **Gas Price Optimization** - Fetches current gas prices from Polygon Gas Station V2 (standard, fast, rapid)
3. **Automatic Redemption** - Executes redeem transactions on the CTF Exchange contract when positions are claimable
4. **Transaction Confirmation** - Waits for transaction confirmation and updates your wallet balance

## Configuration

### Environment Variables

Add these to your `supabase/.env.local`:

```env
POLYMARKET_WALLET_PRIVATE_KEY=your_private_key
POLYMARKET_PROXY_WALLET_ADDRESS=your_proxy_address
```

### Edge Function URL

Add to `terminal/.env`:

```env
NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_AUTO_CLAIM=http://127.0.0.1:54321/functions/v1/auto-claim
```

## Usage

### Via UI Component

1. Navigate to the Auto-Claim panel in the terminal
2. Configure your check interval (5, 10, 15, 30, or 60 minutes)
3. Click "Start Auto-Claim" to begin monitoring
4. View claimable positions and wallet balances in real-time
5. Optionally click "Claim All" to manually trigger redemption

### Via API

Send a POST request to the edge function:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/auto-claim \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false
  }'
```

**Parameters:**
- `dryRun` (optional, boolean) - If true, only checks for claimable positions without claiming

**Response:**
```json
{
  "success": true,
  "data": {
    "claimablePositions": [
      {
        "conditionId": "0x...",
        "marketSlug": "btc-2026-01-15-0800",
        "marketTitle": "BTC 15-min market",
        "outcome": "Yes",
        "shares": 100.5,
        "payoutAmount": 100.5
      }
    ],
    "claimedPositions": [
      {
        "conditionId": "0x...",
        "marketSlug": "btc-2026-01-15-0800",
        "success": true,
        "txHash": "0x..."
      }
    ],
    "totalClaimable": 100.5,
    "totalClaimed": 100.5,
    "walletBalances": {
      "usdc": "1250.50",
      "pol": "0.5"
    }
  },
  "logs": [...]
}
```

## Wallet Types

The Auto-Claim feature supports multiple wallet types:

### Private Key Wallets
- Standard Ethereum wallets using private keys
- Most common for automated trading
- Signature type: `1`

### Browser Wallets (Gnosis Safe)
- MetaMask, WalletConnect, etc.
- Uses Gnosis Safe signature format
- Signature type: `2`

Set the signature type via environment variable:
```env
POLYMARKET_SIGNATURE_TYPE=1  # or 2 for Gnosis Safe
```

## Gas Pricing

The system uses Polygon Gas Station V2 for gas price recommendations:

- **Standard** (~30 Gwei) - Slower, cheaper
- **Fast** (~40 Gwei) - Recommended default
- **Rapid** (~50 Gwei) - Fastest, more expensive

The Auto-Claim feature uses **Fast** gas prices by default for a balance of speed and cost.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never share your private key** - Keep it secure and never commit to version control
2. **Use dedicated wallets** - Consider using a separate wallet for auto-claim with limited funds
3. **Monitor gas costs** - High gas prices can reduce profitability on small positions
4. **Check POL balance** - Ensure sufficient POL in your wallet for gas fees
5. **Review transactions** - Regularly review auto-claim activity logs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient gas" | Add POL to your wallet for gas fees |
| "No claimable positions" | Wait for markets to resolve or check if positions are already claimed |
| "Transaction failed" | Check gas price settings and POL balance |
| "Connection error" | Verify Polygon RPC endpoint is accessible |
| "Invalid credentials" | Ensure POLYMARKET_WALLET_PRIVATE_KEY and POLYMARKET_PROXY_WALLET_ADDRESS are correct |

## Technical Details

### Smart Contracts

- **CTF Exchange**: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` (Polygon)
- **USDC Token**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` (Polygon)

### RPC Endpoint

Default: `https://polygon-rpc.com`

For better reliability, consider using a private RPC endpoint from:
- Alchemy
- Infura
- QuickNode

### Redemption Process

1. Call `redeemPositions()` on CTF Exchange contract
2. Provide: collateral token (USDC), condition ID, index sets
3. Contract transfers winning payout to your wallet
4. Transaction confirmed on Polygon network

## Future Enhancements

- Support for batch redemptions (multiple positions in one transaction)
- Configurable gas price strategies
- Email/webhook notifications when positions are claimed
- Gas cost tracking and profitability analysis
- Support for other prediction market platforms

---

← [Back to Features](../README.md)
