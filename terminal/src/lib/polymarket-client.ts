// src/lib/polymarket-client.ts
import { ClobClient } from "@polymarket/clob-client";
import * as ethersV5 from "ethers5"; // Use ethers v5 for Polymarket compatibility

interface ApiCredentials {
    key: string;
    secret: string;
    passphrase: string;
}

export class PolymarketClient {
    private baseUrl = "https://data-api.polymarket.com";
    private clobClient: ClobClient | null = null;
    private credentials: Map<string, ApiCredentials> = new Map();

    /**
     * Initialize the CLOB client with a wallet and handle API credentials
     */
    async initializeForWallet(walletAddress: string, signer: ethersV5.Wallet | ethersV5.providers.JsonRpcSigner) {
        console.log(`[Polymarket] Initializing client for wallet ${walletAddress}...`);

        // Step 1: Check if we have stored credentials
        let apiCreds = this.credentials.get(walletAddress);

        if (!apiCreds) {
            // Check environment variables
            if (
                process.env.POLYMARKET_API_KEY &&
                process.env.POLYMARKET_WALLET_ADDRESS === walletAddress
            ) {
                console.log(`[Polymarket] Using credentials from environment variables`);
                apiCreds = {
                    key: process.env.POLYMARKET_API_KEY,
                    secret: process.env.POLYMARKET_API_SECRET!,
                    passphrase: process.env.POLYMARKET_API_PASSPHRASE!
                };
                this.credentials.set(walletAddress, apiCreds);
            } else {    
                // Step 2: Create temporary client to derive credentials
                console.log(`[Polymarket] Creating temporary client to derive credentials...`);
                const tempClient = new ClobClient(
                    "https://clob.polymarket.com",
                    137,
                    signer
                );

                // Step 3: Derive API credentials
                console.log(`[Polymarket] Deriving API credentials (this may take a moment)...`);
                const derivedCreds = await tempClient.createOrDeriveApiKey();
                
                apiCreds = {
                    key: derivedCreds.key,
                    secret: derivedCreds.secret,
                    passphrase: derivedCreds.passphrase
                };
                
                this.credentials.set(walletAddress, apiCreds);
                
                // Log credentials to save
                console.log(`\n${"=".repeat(60)}`);
                console.log(`🔑 SAVE THESE POLYMARKET CREDENTIALS FOR: ${walletAddress}`);
                console.log(`Add to your .env file:`);
                console.log(`POLYMARKET_WALLET_ADDRESS=${walletAddress}`);
                console.log(`POLYMARKET_API_KEY=${apiCreds.key}`);
                console.log(`POLYMARKET_API_SECRET=${apiCreds.secret}`);
                console.log(`POLYMARKET_API_PASSPHRASE=${apiCreds.passphrase}`);
                console.log(`${"=".repeat(60)}\n`);
            }
        } else {
            console.log(`[Polymarket] Using cached credentials for ${walletAddress}`);
        }

        // Step 4: Determine signature type and funder
        // For Privy wallets (EOA), use signatureType = 0
        const SIGNATURE_TYPE = 0; // EOA
        const FUNDER_ADDRESS = walletAddress; // For EOA, funder is the wallet itself

        // Step 5: Create the FINAL client with ALL required parameters
        console.log(`[Polymarket] Creating authenticated CLOB client...`);
        console.log(`  Signature Type: ${SIGNATURE_TYPE} (EOA)`);
        console.log(`  Funder Address: ${FUNDER_ADDRESS}`);
        
        this.clobClient = new ClobClient(
            "https://clob.polymarket.com",
            137, // Polygon
            signer,
            apiCreds, // <-- CRITICAL: User API credentials
            SIGNATURE_TYPE, // <-- CRITICAL: Must match wallet type
            FUNDER_ADDRESS, // <-- CRITICAL: Where funds come from
            undefined, // additional options
            false // set default address
        );

        console.log(`[Polymarket] ✅ Client initialized successfully with full authentication`);
    }

    /**
     * Post an order to Polymarket
     */
    async postOrder(params: {
        tokenId: string;
        conditionId?: string;
        price: number;
        side: 'BUY' | 'SELL';
        size: number;
    }): Promise<any> {
        if (!this.clobClient) {
            throw new Error("CLOB Client not initialized. Call initializeForWallet() first.");
        }

        console.log(`[Polymarket] Preparing order...`);
        console.log(`  Token ID: ${params.tokenId.substring(0, 20)}...`);
        console.log(`  Side: ${params.side}`);
        console.log(`  Size: ${params.size}`);
        console.log(`  Price: ${params.price}`);

        try {
            // Get market info to get tickSize and negRisk
            let tickSize = "0.01"; // Default tick size
            let negRisk = false; // Default negRisk
            
            // Try to fetch market info using condition ID if available
            if (params.conditionId) {
                try {
                    console.log(`[Polymarket] Fetching market info using condition ID...`);
                    const market = await this.clobClient.getMarket(params.conditionId);
                    
                    if (market) {
                        tickSize = market.minimum_tick_size || tickSize;
                        negRisk = market.neg_risk || negRisk;
                        console.log(`[Polymarket] Market info retrieved:`);
                        console.log(`  Tick Size: ${tickSize}`);
                        console.log(`  Neg Risk: ${negRisk}`);
                    }
                } catch (error: any) {
                    console.warn(`[Polymarket] Could not fetch market info (using defaults):`, error.message);
                    console.log(`  Using default Tick Size: ${tickSize}`);
                    console.log(`  Using default Neg Risk: ${negRisk}`);
                }
            } else {
                console.log(`[Polymarket] No condition ID provided, using default market settings`);
                console.log(`  Tick Size: ${tickSize}`);
                console.log(`  Neg Risk: ${negRisk}`);
            }

            // Import required types
            const { Side, OrderType } = await import("@polymarket/clob-client");

            // Create and post order with market options
            console.log(`[Polymarket] Creating and posting order...`);
            const response = await this.clobClient.createAndPostOrder(
                {
                    tokenID: params.tokenId,
                    price: params.price,
                    size: params.size,
                    side: params.side === 'BUY' ? Side.BUY : Side.SELL
                },
                {
                    tickSize: tickSize,
                    negRisk: negRisk
                },
                OrderType.GTC // Good-Til-Cancelled
            );

            // Check if the response indicates an error
            // The CLOB client doesn't throw on API errors, it returns them in the response
            if (response.status && (response.status >= 400 || response.status < 200)) {
                console.error(`[CLOB Client] ❌ API Error - Status ${response.status}`);
                
                // Extract error message from response
                const errorMessage = response.error || response.data?.error || response.statusText || 'Unknown error';
                console.error(`[CLOB Client] Error: ${errorMessage}`);
                
                // Create a proper error object with the API error details
                const apiError: any = new Error(errorMessage);
                apiError.response = {
                    status: response.status,
                    statusText: response.statusText,
                    data: { error: errorMessage }
                };
                
                throw apiError;
            }

            console.log("[Polymarket] ✅ Order posted successfully!");
            console.log("  Order ID:", response.orderID);
            console.log("  Status:", response.status);
            
            return response;
        } catch (error: any) {
            console.error("[Polymarket] ❌ Failed to post order:", error);
            
            // Provide helpful error messages
            if (error.message?.includes("Invalid signature") || error.message?.includes("L2 auth not available")) {
                console.error("\n💡 TIP: This usually means:");
                console.error("  - Wrong signature type (should be 0 for Privy EOA wallets)");
                console.error("  - Wrong funder address");
                console.error("  - API credentials don't match the wallet");
            } else if (error.message?.includes("Unauthorized") || error.message?.includes("Invalid api key")) {
                console.error("\n💡 TIP: API credentials are invalid or expired");
                console.error("  - Delete credentials from .env and let them regenerate");
            } else if (error.message?.includes("balance") || error.message?.includes("allowance") || error.message?.includes("not enough")) {
                console.error("\n💡 INSUFFICIENT BALANCE ERROR");
                console.error("  ❌ Your wallet doesn't have enough USDC to execute this trade");
                console.error("  📍 To fix this:");
                console.error("     1. Get your bot wallet address from the logs above");
                console.error("     2. Send USDCe (Polygon) to that address");
                console.error("     3. Approve Polymarket contract to spend your USDC");
                console.error("  💰 Minimum recommended: $20-50 USDC for testing");
                
                // Throw a more user-friendly error
                throw new Error("Insufficient USDC balance or allowance. Please fund your bot wallet with USDCe on Polygon and approve the Polymarket contract.");
            }
            
            throw error;
        }
    }

    /**
     * Get user trades (no auth needed for public data)
     */
    async getUserTrades(walletAddress: string, limit: number = 20): Promise<any[]> {
        const url = `${this.baseUrl}/trades?limit=${limit}&user=${walletAddress}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Polymarket API Error (${response.status}): ${errorText}`);
                throw new Error(`Polymarket API Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            console.log("[Polymarket] Raw API response sample:", data[0]);
            
            // Map to unified format
            return data.map((t: any) => ({
                side: t.side,
                size: parseFloat(t.size),
                price: parseFloat(t.price),
                timestamp: t.timestamp,
                market_slug: t.slug || t.market,
                asset: t.asset || t.asset_id,
                conditionId: t.conditionId, // Include condition ID for market lookup
                title: t.title,
                outcome: t.outcome,
                transactionHash: t.transactionHash || t.transaction_hash
            }));

        } catch (error) {
            console.error("Failed to fetch Polymarket trades:", error);
            throw error;
        }
    }
}

export const createPolymarketClient = () => new PolymarketClient();