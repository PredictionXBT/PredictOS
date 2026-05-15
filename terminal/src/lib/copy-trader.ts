import { PolymarketClient } from './polymarket-client';
import { privy, getSystemWallet } from './privy-client';

const DEFAULT_TARGET_WALLET = "0x7ec4ffce0be6d9b30bb6c962166cde129dba00ad";
const POLYMARKET_EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"; 

// Simple in-memory store for last processed timestamp
let lastProcessedTimestamp = 0;

export class CopyTrader {
    private polyClient: PolymarketClient;
    private botWallet?: { id: string; address: string };

    constructor() {
        this.polyClient = new PolymarketClient();
    }

    async run(targetAddress?: string, tradeAmount: number = 5) {
        const target = targetAddress || DEFAULT_TARGET_WALLET;
        const logs: string[] = [];
        
        console.log(`[CopyTrader] Checking for new trades from ${target}...`);
        console.log(`[CopyTrader] Trade amount configured: ${tradeAmount} USDC`);
        
        logs.push(`🔍 Checking for new trades from target wallet...`);
        logs.push(`  Target: ${target.substring(0, 10)}...${target.substring(target.length - 8)}`);
        logs.push(`  Trade Amount: ${tradeAmount} USDC`);

        try {
            // 1. Fetch recent trades from Target
            logs.push(`📡 Fetching recent trades from Polymarket API...`);
            const trades = await this.polyClient.getUserTrades(target);
            
            if (!trades || trades.length === 0) {
                logs.push(`⚠️ No trades found for this wallet`);
                return { status: "No trades found", executed: false, logs };
            }
            
            logs.push(`✅ Found ${trades.length} trade(s) from target wallet`);

            // 2. Sort by timestamp descending (newest first)
            const latestTrade = trades[0];
            logs.push(`🔎 Analyzing latest trade...`);
            logs.push(`  Timestamp: ${new Date(latestTrade.timestamp * 1000).toLocaleString()}`);
            
            // 3. Check if new
            if (latestTrade.timestamp <= lastProcessedTimestamp) {
                logs.push(`⏭️ Trade already processed (timestamp: ${lastProcessedTimestamp})`);
                logs.push(`📊 Latest Trade Info:`);
                logs.push(`  Market: ${latestTrade.title || latestTrade.market_slug}`);
                logs.push(`  Side: ${latestTrade.side} | Outcome: ${latestTrade.outcome}`);
                logs.push(`  Size: ${latestTrade.size} | Price: $${latestTrade.price}`);
                return { status: "No new trades", executed: false, latestParams: latestTrade, logs };
            }

            console.log(`[CopyTrader] NEW TRADE DETECTED:`, latestTrade);
            logs.push(`🎯 NEW TRADE DETECTED!`);
            logs.push(`  Side: ${latestTrade.side}`);
            logs.push(`  Market: ${latestTrade.title || latestTrade.market_slug || 'Unknown'}`);
            logs.push(`  Outcome: ${latestTrade.outcome}`);
            logs.push(`  Size: ${latestTrade.size}`);
            logs.push(`  Price: $${latestTrade.price}`);
            if (latestTrade.asset) {
                logs.push(`  Asset ID: ${latestTrade.asset.substring(0, 20)}...`);
            }
            
            lastProcessedTimestamp = latestTrade.timestamp;
            logs.push(`✅ Updated last processed timestamp: ${lastProcessedTimestamp}`);

            // 4. Analyze/Filter Trade
            // Example Policy: Only copy small trades < $1000 size for safety
            // const size = parseFloat(latestTrade.size);
            // if (size > 1000) {
            //    return { status: "Trade filtered (Size too large)", executed: false, trade: latestTrade };
            // }

            // 5. Execute Copy
            // Get System Wallet
            logs.push(`🔐 Fetching bot wallet from Privy...`);
            const botWallet = await getSystemWallet();
            if (!botWallet) {
                logs.push(`❌ Bot wallet not available`);
                throw new Error("Bot wallet not available");
            }

            // Store wallet for error messages
            this.botWallet = botWallet;

            console.log(`[CopyTrader] Executing trade with Bot Wallet: ${botWallet.address}`);
            console.log(`[CopyTrader] Trade size: ${tradeAmount} USDC`);
            
            logs.push(`✅ Bot Wallet Retrieved: ${botWallet.address}`);
            logs.push(`💰 Preparing to execute trade with ${tradeAmount} USDC`);
            
            const txHash = await this.executeTrade(botWallet, latestTrade, tradeAmount, logs);

            logs.push(`✅ TRADE EXECUTED SUCCESSFULLY!`);
            logs.push(`  TX Hash: ${txHash}`);

            return { 
                status: "Copy Trade Executed", 
                executed: true, 
                txHash,
                logs,
                trade: {
                    market: latestTrade.market_slug,
                    side: latestTrade.side,
                    size: latestTrade.size,
                    price: latestTrade.price,
                    timestamp: latestTrade.timestamp,
                    outcome: latestTrade.outcome
                }
            };

        } catch (error) {
            console.error("[CopyTrader] Error:", error);
            logs.push(`❌ ERROR OCCURRED!`);
            
            if (error instanceof Error) {
                logs.push(`  Message: ${error.message}`);
                if (error.stack) {
                    const stackLines = error.stack.split('\n').slice(0, 3);
                    logs.push(`  Stack: ${stackLines.join(' | ')}`);
                }
            } else {
                logs.push(`  Details: ${String(error)}`);
            }
            
            return { 
                status: "Error occurred", 
                executed: false, 
                logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async executeTrade(wallet: { id: string, address: string }, trade: any, tradeAmount: number, logs: string[]) {
        // Validate trade amount
        if (tradeAmount <= 0) {
            throw new Error("Trade amount must be positive");
        }

        logs.push(`⚙️ Initializing Polymarket client...`);
        
        console.log(`[CopyTrader] Executing trade with Bot Wallet: ${wallet.address}`);
        console.log(`[CopyTrader] Trade size: ${tradeAmount} USDC`);

        // Import Privy signer creator
        const { createPrivySigner } = await import('./privy-client');
        
        // Create Privy signer for this wallet
        logs.push(`🔐 Creating Privy signer for wallet...`);
        const signer = await createPrivySigner(wallet.id, wallet.address);
        logs.push(`✅ Privy signer created`);

        // Initialize Polymarket client with Privy signer
        logs.push(`🔗 Initializing Polymarket CLOB client...`);
        await this.polyClient.initializeForWallet(wallet.address, signer);
        logs.push(`✅ Polymarket client initialized`);

        // Prepare order parameters
        logs.push(`⚙️ Preparing order parameters...`);
        logs.push(`  Market: ${trade.title || trade.market_slug || 'Unknown'}`);
        logs.push(`  Side: ${trade.side}`);
        if (trade.asset) {
            logs.push(`  Token ID: ${trade.asset.substring(0, 20)}...`);
        }
        logs.push(`  Size: ${tradeAmount} USDC`);
        logs.push(`  Price: $${trade.price}`);
        
        // Validate that we have the required asset ID
        if (!trade.asset) {
            logs.push(`❌ Missing asset ID - cannot execute trade`);
            throw new Error("Trade is missing asset ID");
        }

        // Execute the trade using the SDK
        logs.push(`📝 Creating and signing order via Polymarket SDK...`);
        
        try {
            const response = await this.polyClient.postOrder({
                tokenId: trade.asset,
                conditionId: trade.conditionId, // Pass condition ID for proper market lookup
                price: parseFloat(trade.price),
                side: trade.side,
                size: tradeAmount
            });

            // Check if order was actually created
            if (response.orderID) {
                logs.push(`✅ Order Posted Successfully!`);
                logs.push(`  Order ID: ${response.orderID}`);
                logs.push(`  TX Hash: ${response.transactionHash || 'Pending'}`);;
            } else {
                logs.push(`⚠️ Order response received but no Order ID`);
                logs.push(`  Order ID: undefined`);
            }

            return response.transactionHash || response.orderID || "OrderPosted";
        } catch (error: any) {
            // Log the API error details
            logs.push(`❌ Order Submission Failed!`);
            
            // Extract the specific error message from the API response
            let errorMessage = 'Unknown error';
            
            if (error.response?.data?.error) {
                // This is the specific error from Polymarket API (e.g., "not enough balance / allowance")
                errorMessage = error.response.data.error;
                logs.push(`  ❌ ERROR: ${errorMessage}`);
            } else if (error.message) {
                errorMessage = error.message;
                logs.push(`  Error: ${errorMessage}`);
            } else {
                logs.push(`  Error: ${String(error)}`);
            }
            
            // Add helpful context for common errors
            if (errorMessage.includes('balance') || errorMessage.includes('allowance')) {
                logs.push(`  💡 Your bot wallet needs USDC funding`);
                logs.push(`  📍 Wallet: ${this.botWallet?.address || 'Unknown'}`);
                logs.push(`  💰 Send USDCe (Polygon) to this address`);
            }
            
            logs.push(`  Order ID: undefined`);
            
            throw error; // Re-throw to be caught by outer try-catch
        }
    }

    async testExecution() {
        console.log("[CopyTrader] Starting Manual Test Execution...");
        // 1. Get System Wallet
        const botWallet = await getSystemWallet();
        if (!botWallet) {
            throw new Error("Bot wallet not available");
        }
        console.log(`[Test] Using Bot Wallet: ${botWallet.address}`);

        // 2. Create Dummy Trade (e.g. Yes on a popular market)
        // Trump Inauguration Market Token ID (Example) or just a random one for testing signature
        // Using a real Token ID is better to get a real error from Polymarket if funds are low
        const TEST_TOKEN_ID = "21742633143463906290569050155826241533067272736897614382201930560761571152424"; // Random valid-looking ID
        
        const testTrade = {
            side: "BUY",
            asset: TEST_TOKEN_ID,
            size: "1",
            price: "0.5",
            market_slug: "test-market",
            timestamp: Date.now(),
            outcome: "Yes"
        };

        // 3. Execut
        try {
            const result = await this.executeTrade(botWallet, testTrade);
            return { status: "Test Execution Attempted", result };
        } catch (error: any) {
            console.error("[Test] Execution Failed (Expected if no funds):", error);
            return { status: "Test Execution Failed (Likely Insufficient Funds)", error: error.message };
        }
    }
}
