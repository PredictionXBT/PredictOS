# Polymarket Copy Trading Bot

## Overview
The **Polymarket Copy Trading Bot** is an automated system designed to mimic the trades of profitable users on the Polymarket platform. By monitoring a target wallet, this system automatically executes identical trades (Buy/Sell) on the same markets, leveraging the insights of successful traders.

## Features
- **Leaderboard Integration:** View top traders by category (Politics, Sports, Crypto, etc.) and time period.
- **One-Click Copy:** Easily select a trader from the leaderboard to start copying.
- **Automated Execution:** Monitors the target wallet in real-time and executes trades instantly.
- **Configurable Trade Amounts:** Set a fixed USDC amount ("n USDC to trade") for every copied trade, managing your risk independent of the target's trade size.
- **Safety Mechanism:** Filters out large or risky trades based on configurable parameters (default: safe mode).

## System Architecture

### 1. Frontend (Next.js)
- Located at `/copy-trading`.
- Provides a dashboard to:
    - Search/Select target wallets.
    - View leaderboard statistics.
    - Configure trade paramters (Amount per trade).
    - View real-time logs of bot activity.

### 2. Backend (Next.js API Routes)
- **Monitoring Endpoint:** `/api/copy-trading/run`
- **Logic:**
    1. Fetches recent trades from the target wallet using Polymarket's Gamma API.
    2. Compares trade timestamps to identify new activity.
    3. If a new trade is found, it constructs a mirroring order.

### 3. Privy Integration (Security)
We use **Privy** for secure, server-side wallet management and signing.
- **Why Privy?** It allows the bot to sign transactions programmatically without exposing private keys in the frontend or requiring constant user confirmation (MetaMask popups).
- **Implementation:**
    - `src/lib/privy-client.ts`: Initializes the Privy client and manages the "Bot Wallet".
    - **Server-Side Signing:** The bot generates a special `PrivySigner` (ethers.js compatible) that intercepts signing requests and delegates them to Privy's secure enclave.
    - This ensures that your trading bot can run autonomously while your assets remain secure.

## Usage Guide

1. **Fund the Bot Wallet:**
   - Go to the Copy Trading Terminal.
   - Copy the "Bot Execution Wallet" address.
   - Send **USDC (Polygon)** for trading and **MATIC** for gas fees to this address.

2. **Select a Trader:**
   - Browse the "Top Traders Leaderboard".
   - Click "Copy" on a profitable trader, or manually enter a wallet address.

3. **Configure Amount:**
   - Enter the **"Trade Amount (USDC)"**.
   - *Example:* If you set this to **10 USDC**, the bot will buy $10 worth of shares for every trade the target makes, regardless of whether the target traded $100 or $10,000.

4. **Start the Bot:**
   - Click **"START COPY BOT"**.
   - Keep the terminal open to monitor logs.

## Development Verification
- **Test Market Fetching:** `node test-active-market.js`
- **Test Order Execution:** `node test-live-order.mjs` (Requires funded bot wallet)
