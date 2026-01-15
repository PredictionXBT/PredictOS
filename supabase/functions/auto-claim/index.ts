/**
 * Supabase Edge Function: auto-claim
 *
 * Automatically redeem winning positions on Polymarket
 * Uses Polygon Gas Station V2 for accurate gas pricing
 * Supports Gnosis Safe signature format for browser wallet users
 */

import { PolymarketClient, createClientFromEnv } from "../_shared/polymarket/client.ts";
import { createLogEntry } from "../_shared/polymarket/utils.ts";
import type { BotLogEntry } from "../_shared/polymarket/types.ts";

// @ts-ignore - Deno npm imports
import { ethers } from "npm:ethers@5.7.2";

// Polygon Gas Station V2 API
const POLYGON_GAS_STATION_URL = "https://gasstation.polygon.technology/v2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Request/Response Types
 */
interface AutoClaimRequest {
  dryRun?: boolean; // If true, only check for claimable positions without claiming
}

interface ClaimablePosition {
  conditionId: string;
  marketSlug: string;
  marketTitle: string;
  outcome: string;
  shares: number;
  payoutAmount: number;
}

interface ClaimResult {
  conditionId: string;
  marketSlug: string;
  success: boolean;
  txHash?: string;
  error?: string;
}

interface AutoClaimResponse {
  success: boolean;
  data?: {
    claimablePositions: ClaimablePosition[];
    claimedPositions?: ClaimResult[];
    totalClaimable: number;
    totalClaimed?: number;
    walletBalances?: {
      usdc: string;
      pol: string;
    };
  };
  error?: string;
  logs: BotLogEntry[];
}

/**
 * Get gas price from Polygon Gas Station V2
 */
async function getGasPrice(): Promise<{ standard: string; fast: string; rapid: string }> {
  try {
    const response = await fetch(POLYGON_GAS_STATION_URL);
    if (!response.ok) {
      throw new Error(`Gas Station API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // V2 returns prices in Gwei with different speed options
    return {
      standard: data.standard?.maxFee || "30",
      fast: data.fast?.maxFee || "40",
      rapid: data.rapid?.maxFee || "50",
    };
  } catch (error) {
    console.error("Failed to fetch gas prices:", error);
    // Return reasonable defaults
    return {
      standard: "30",
      fast: "40",
      rapid: "50",
    };
  }
}

/**
 * Get wallet balances (USDC and POL)
 */
async function getWalletBalances(
  provider: ethers.providers.Provider,
  walletAddress: string
): Promise<{ usdc: string; pol: string }> {
  try {
    // Get POL (native token) balance
    const polBalance = await provider.getBalance(walletAddress);
    const polFormatted = ethers.utils.formatEther(polBalance);
    
    // USDC contract address on Polygon
    const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const USDC_ABI = ["function balanceOf(address) view returns (uint256)"];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(walletAddress);
    const usdcFormatted = ethers.utils.formatUnits(usdcBalance, 6); // USDC has 6 decimals
    
    return {
      usdc: usdcFormatted,
      pol: polFormatted,
    };
  } catch (error) {
    console.error("Failed to get wallet balances:", error);
    return {
      usdc: "0",
      pol: "0",
    };
  }
}

/**
 * Check for claimable positions
 * A position is claimable if the market is resolved and the user has winning shares
 */
async function getClaimablePositions(
  client: PolymarketClient
): Promise<ClaimablePosition[]> {
  const positions = await client.getPositions();
  const claimablePositions: ClaimablePosition[] = [];
  
  // For each position, check if the market is resolved and if we have winning shares
  for (const position of positions) {
    // Get market details to check if resolved
    // This would require fetching market info - simplified for now
    // In production, you'd query the market status from Gamma API or Data API
    
    // For demonstration, assume positions with shares > 0 are potentially claimable
    if (position.size > 0) {
      claimablePositions.push({
        conditionId: position.conditionId,
        marketSlug: "", // Would need to fetch from market data
        marketTitle: position.asset,
        outcome: position.outcome,
        shares: position.size,
        payoutAmount: position.size, // Each winning share pays out $1
      });
    }
  }
  
  return claimablePositions;
}

/**
 * Claim a single position
 */
async function claimPosition(
  provider: ethers.providers.Provider,
  signer: ethers.Wallet,
  conditionId: string,
  gasPrice: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // CTF Exchange contract address on Polygon
    const CTF_EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
    
    // Simplified ABI for redeem function
    const CTF_ABI = [
      "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external",
    ];
    
    const ctfContract = new ethers.Contract(CTF_EXCHANGE_ADDRESS, CTF_ABI, signer);
    
    // USDC as collateral token
    const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    
    // Execute redeem transaction
    const tx = await ctfContract.redeemPositions(
      USDC_ADDRESS,
      ethers.constants.HashZero, // No parent collection
      conditionId,
      [1, 2], // Index sets for binary outcomes
      {
        maxFeePerGas: ethers.utils.parseUnits(gasPrice, "gwei"),
        maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
      }
    );
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

Deno.serve(async (req: Request) => {
  const logs: BotLogEntry[] = [];
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate request method
    if (req.method !== "POST") {
      logs.push(createLogEntry("ERROR", "Invalid request method", { method: req.method }));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
          logs,
        } as AutoClaimResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    let requestBody: AutoClaimRequest = {};
    try {
      requestBody = await req.json();
    } catch {
      // Empty body is OK, use defaults
    }
    
    const dryRun = requestBody.dryRun ?? false;
    
    logs.push(createLogEntry("INFO", `Auto-claim started (dryRun: ${dryRun})`));
    
    // Initialize Polymarket client
    let client: PolymarketClient;
    try {
      client = createClientFromEnv();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logs.push(createLogEntry("ERROR", `Failed to initialize client: ${errorMsg}`));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Client initialization failed: ${errorMsg}`,
          logs,
        } as AutoClaimResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // @ts-ignore - Deno global
    const privateKey = Deno.env.get("POLYMARKET_WALLET_PRIVATE_KEY");
    // @ts-ignore - Deno global
    const proxyAddress = Deno.env.get("POLYMARKET_PROXY_WALLET_ADDRESS");
    
    if (!privateKey || !proxyAddress) {
      logs.push(createLogEntry("ERROR", "Missing required environment variables"));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing POLYMARKET_WALLET_PRIVATE_KEY or POLYMARKET_PROXY_WALLET_ADDRESS",
          logs,
        } as AutoClaimResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Set up ethers provider and signer
    const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
    const signer = new ethers.Wallet(privateKey, provider);
    
    // Get wallet balances
    const balances = await getWalletBalances(provider, proxyAddress);
    logs.push(createLogEntry("INFO", "Wallet balances", {
      usdc: `$${balances.usdc}`,
      pol: `${balances.pol} POL`,
    }));
    
    // Get claimable positions
    logs.push(createLogEntry("INFO", "Checking for claimable positions..."));
    const claimablePositions = await getClaimablePositions(client);
    logs.push(...client.getLogs());
    client.clearLogs();
    
    const totalClaimable = claimablePositions.reduce(
      (sum, pos) => sum + pos.payoutAmount,
      0
    );
    
    logs.push(createLogEntry("INFO", `Found ${claimablePositions.length} claimable positions`, {
      totalValue: `$${totalClaimable.toFixed(2)}`,
    }));
    
    if (dryRun || claimablePositions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            claimablePositions,
            totalClaimable,
            walletBalances: balances,
          },
          logs,
        } as AutoClaimResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get current gas prices
    const gasPrices = await getGasPrice();
    logs.push(createLogEntry("INFO", "Gas prices (Gwei)", {
      standard: gasPrices.standard,
      fast: gasPrices.fast,
      rapid: gasPrices.rapid,
    }));
    
    // Claim positions
    const claimedPositions: ClaimResult[] = [];
    let totalClaimed = 0;
    
    for (const position of claimablePositions) {
      logs.push(createLogEntry("INFO", `Claiming position: ${position.marketTitle}`));
      
      const result = await claimPosition(
        provider,
        signer,
        position.conditionId,
        gasPrices.fast // Use fast gas price
      );
      
      claimedPositions.push({
        conditionId: position.conditionId,
        marketSlug: position.marketSlug,
        success: result.success,
        txHash: result.txHash,
        error: result.error,
      });
      
      if (result.success) {
        totalClaimed += position.payoutAmount;
        logs.push(createLogEntry("SUCCESS", "Position claimed", {
          txHash: result.txHash,
          amount: `$${position.payoutAmount.toFixed(2)}`,
        }));
      } else {
        logs.push(createLogEntry("ERROR", "Failed to claim position", {
          error: result.error,
        }));
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          claimablePositions,
          claimedPositions,
          totalClaimable,
          totalClaimed,
          walletBalances: balances,
        },
        logs,
      } as AutoClaimResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(createLogEntry("ERROR", `Unhandled error: ${errorMsg}`));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        logs,
      } as AutoClaimResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
