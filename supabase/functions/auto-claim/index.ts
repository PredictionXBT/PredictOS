/**
 * Auto-Claim Edge Function
 *
 * Simple function that:
 * 1. Fetches user positions
 * 2. Checks if any markets are resolved with winning positions
 * 3. Claims them via CTF contract
 *
 * Uses existing POLYMARKET_WALLET_PRIVATE_KEY and POLYMARKET_PROXY_WALLET_ADDRESS
 */

// @ts-ignore - Deno npm imports
import { Wallet, Contract, providers, BigNumber, utils } from "npm:ethers@5.7.2";

import type { BotLogEntry } from "../_shared/polymarket/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATA_API_URL = "https://data-api.polymarket.com";
const CLOB_API_URL = "https://clob.polymarket.com";
const POLYGON_GAS_STATION_URL = "https://gasstation.polygon.technology/v2";

// Contract addresses on Polygon
const CTF_CONTRACT_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

const CTF_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external",
];

// Gnosis Safe ABI for execTransaction
const SAFE_ABI = [
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function nonce() view returns (uint256)",
  "function getThreshold() view returns (uint256)",
];

// ERC20 ABI for balance check
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

interface WalletBalance {
  usdc: number;
  matic: number;
}

interface GasStationResponse {
  safeLow: { maxPriorityFee: number; maxFee: number };
  standard: { maxPriorityFee: number; maxFee: number };
  fast: { maxPriorityFee: number; maxFee: number };
  estimatedBaseFee: number;
}

/**
 * Get gas prices from Polygon Gas Station V2
 * Returns values in gwei
 */
async function getPolygonGasPrices(): Promise<{ maxPriorityFee: number; maxFee: number }> {
  try {
    const response = await fetch(POLYGON_GAS_STATION_URL);
    if (!response.ok) {
      throw new Error(`Gas station error: ${response.status}`);
    }
    const data: GasStationResponse = await response.json();
    // Use "fast" for quick inclusion
    return {
      maxPriorityFee: Math.ceil(data.fast.maxPriorityFee),
      maxFee: Math.ceil(data.fast.maxFee),
    };
  } catch {
    // Fallback to safe defaults for Polygon
    return { maxPriorityFee: 60, maxFee: 150 };
  }
}

/**
 * Get wallet balances (USDC from Safe, POL from signer for gas)
 */
async function getWalletBalances(
  provider: typeof providers.JsonRpcProvider.prototype,
  safeAddress: string,
  signerAddress: string
): Promise<WalletBalance> {
  try {
    // Get POL balance from signer (pays gas)
    const maticBalance = await provider.getBalance(signerAddress);
    const maticFormatted = parseFloat(maticBalance.toString()) / 1e18;

    // Get USDC balance from Safe (holds funds)
    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(safeAddress);
    const usdcFormatted = parseFloat(usdcBalance.toString()) / 1e6;

    return {
      usdc: Math.round(usdcFormatted * 100) / 100,
      matic: Math.round(maticFormatted * 10000) / 10000,
    };
  } catch {
    return { usdc: 0, matic: 0 };
  }
}

interface ClaimResult {
  conditionId: string;
  marketSlug: string;
  outcome: string;
  size: number;
  txHash?: string;
  error?: string;
}

interface RedeemablePosition {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  outcome: string;
  title: string;
  redeemable: boolean;
}

/**
 * Fetch redeemable positions directly from Data API
 * Uses curPrice === 1 to identify winning positions
 */
async function fetchRedeemableWinners(proxyAddress: string): Promise<RedeemablePosition[]> {
  try {
    const url = `${DATA_API_URL}/positions?user=${proxyAddress}&redeemable=true&sizeThreshold=0&limit=100`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const positions: RedeemablePosition[] = await response.json();

    // Filter for winning positions (curPrice === 1 means winner)
    return positions.filter(p => p.curPrice === 1 && p.size > 0);
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: BotLogEntry[] = [];
  const log = (level: BotLogEntry["level"], message: string, details?: Record<string, unknown>) => {
    logs.push({ timestamp: new Date().toISOString(), level, message, details });
    console.log(`[${level}] ${message}`, details || "");
  };

  const claimResults: ClaimResult[] = [];

  try {
    log("INFO", "Starting auto-claim check...");

    // @ts-ignore - Deno global
    const privateKey = Deno.env.get("POLYMARKET_WALLET_PRIVATE_KEY");
    // @ts-ignore - Deno global
    const proxyAddress = Deno.env.get("POLYMARKET_PROXY_WALLET_ADDRESS");
    // @ts-ignore - Deno global
    const polygonRpcUrl = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-rpc.com";

    if (!privateKey) {
      throw new Error("POLYMARKET_WALLET_PRIVATE_KEY not configured");
    }

    if (!proxyAddress) {
      throw new Error("POLYMARKET_PROXY_WALLET_ADDRESS not configured");
    }

    // Setup provider and wallet for claiming
    const provider = new providers.JsonRpcProvider(polygonRpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const signerAddress = await wallet.getAddress();

    // Fetch balance (USDC from Safe, POL from signer)
    const balance = await getWalletBalances(provider, proxyAddress, signerAddress);
    log("INFO", `Wallet balance: $${balance.usdc} USDC, ${balance.matic} POL (gas)`);

    // Fetch redeemable winning positions directly from Data API
    log("INFO", "Fetching redeemable positions from Data API...");
    const redeemable = await fetchRedeemableWinners(proxyAddress);

    if (redeemable.length === 0) {
      log("INFO", "No redeemable winning positions found");
      return new Response(JSON.stringify({
        success: true,
        message: "No redeemable positions",
        claims: [],
        balance,
        logs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalClaimable = redeemable.reduce((sum, p) => sum + p.size, 0);
    log("SUCCESS", `Found ${redeemable.length} winning position(s) worth $${totalClaimable.toFixed(2)}`, {
      positions: redeemable.map(p => ({ title: p.title, outcome: p.outcome, size: p.size })),
    });

    // Create contracts
    const ctfInterface = new Contract(CTF_CONTRACT_ADDRESS, CTF_ABI, provider).interface;
    const safeContract = new Contract(proxyAddress, SAFE_ABI, wallet);

    // Claim each winning position through Safe
    for (const position of redeemable) {
      const result: ClaimResult = {
        conditionId: position.conditionId,
        marketSlug: position.title || position.asset,
        outcome: position.outcome,
        size: position.size,
      };

      try {
        // Redeem both outcomes [1, 2] like the official Polymarket example
        const indexSets = [BigNumber.from(1), BigNumber.from(2)];

        // Format condition ID
        let conditionIdBytes32 = position.conditionId;
        if (!conditionIdBytes32.startsWith("0x")) {
          conditionIdBytes32 = "0x" + conditionIdBytes32;
        }

        log("INFO", `Claiming ${position.title || position.asset} (${position.outcome}, $${position.size.toFixed(2)})...`);

        // Encode the CTF redeemPositions call
        const redeemData = ctfInterface.encodeFunctionData("redeemPositions", [
          USDC_ADDRESS,
          ZERO_BYTES32,
          conditionIdBytes32,
          indexSets,
        ]);

        // Create signature for Safe (1-of-1 Safe, contract signature)
        // See: https://docs.safe.global/advanced/smart-account-signatures
        // Format: r (32 bytes) + s (32 bytes) + v (1 byte)
        // For v=1 (contract signature), r = address right-padded to 32 bytes
        const signerAddr = await wallet.getAddress();
        // r: 12 zero bytes + 20 byte address = 32 bytes
        // s: 32 zero bytes
        // v: 01 (contract signature - msg.sender is owner)
        const signature = "0x" +
          "000000000000000000000000" + signerAddr.slice(2).toLowerCase() +  // r: padded address
          "0000000000000000000000000000000000000000000000000000000000000000" +  // s: zeros
          "01";  // v: contract signature type

        log("INFO", `Using signature for owner: ${signerAddr}`);

        // Get gas prices from Polygon Gas Station V2
        const gasPrices = await getPolygonGasPrices();
        const priorityFee = utils.parseUnits(gasPrices.maxPriorityFee.toString(), "gwei");
        const maxFee = utils.parseUnits(gasPrices.maxFee.toString(), "gwei");

        log("INFO", `Gas (from Polygon Gas Station): priority=${gasPrices.maxPriorityFee} gwei, max=${gasPrices.maxFee} gwei`);

        // Execute through Safe with proper Polygon gas prices
        const tx = await safeContract.execTransaction(
          CTF_CONTRACT_ADDRESS,  // to
          0,                     // value
          redeemData,           // data
          0,                     // operation (0 = call)
          0,                     // safeTxGas
          0,                     // baseGas
          0,                     // gasPrice
          "0x0000000000000000000000000000000000000000",  // gasToken
          "0x0000000000000000000000000000000000000000",  // refundReceiver
          signature,            // signatures
          {
            gasLimit: 500000,
            maxPriorityFeePerGas: priorityFee,
            maxFeePerGas: maxFee,
            type: 2,  // EIP-1559
          }
        );

        log("INFO", `Transaction submitted: ${tx.hash}`);
        result.txHash = tx.hash;

        // Don't wait for confirmation (avoid edge function timeout)
        // User can check polygonscan for status
        log("SUCCESS", `Claim TX submitted! Check: https://polygonscan.com/tx/${tx.hash}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.error = errorMsg;

        // Check if already claimed
        if (errorMsg.includes("revert") || errorMsg.includes("execution reverted")) {
          log("WARN", `Position may already be claimed: ${position.title || position.asset}`);
        } else {
          log("ERROR", `Failed to claim ${position.title || position.asset}: ${errorMsg}`);
        }
      }

      claimResults.push(result);
    }

    const successCount = claimResults.filter(r => r.txHash).length;
    log("SUCCESS", `Auto-claim complete: ${successCount}/${redeemable.length} claimed`);

    // Refresh balance after claims
    const updatedBalance = await getWalletBalances(provider, proxyAddress, signerAddress);

    return new Response(JSON.stringify({
      success: true,
      message: `Claimed ${successCount} of ${redeemable.length} positions`,
      claims: claimResults,
      balance: updatedBalance,
      logs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log("ERROR", `Auto-claim failed: ${errorMsg}`);

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      claims: claimResults,
      balance: null,
      logs,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
