/**
 * x402 Client for PredictOS
 * 
 * Provides functionality to:
 * 1. List sellers from the x402 bazaar
 * 2. Call x402-protected endpoints with automatic payment
 * 
 * Supports both EVM (Base) and Solana mainnet networks.
 * Automatically detects the seller's network and uses the correct private key.
 */

import type {
  X402BazaarSeller,
  X402SellerInfo,
  X402PaymentRequirements,
} from "./types.ts";

// Network identifiers - MAINNET ONLY
export const NETWORKS = {
  // EVM Networks (Base Mainnet)
  BASE_MAINNET: "eip155:8453",
  BASE: "base", // Legacy format used by some sellers
  // Solana Mainnet
  SOLANA_MAINNET: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  SOLANA: "solana", // Legacy format used by some sellers
} as const;

// Network name to chain ID mapping (mainnet only)
const NETWORK_CHAIN_IDS: Record<string, number> = {
  "base": 8453,
  "eip155:8453": 8453,
};

// USDC contract addresses (mainnet only)
const USDC_ADDRESSES: Record<string, string> = {
  // Base Mainnet
  [NETWORKS.BASE_MAINNET]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [NETWORKS.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  // Solana Mainnet
  [NETWORKS.SOLANA_MAINNET]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [NETWORKS.SOLANA]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

// EIP-3009 TransferWithAuthorization types for EIP-712 signing
const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/**
 * Get environment variables for x402
 */
function getX402Config() {
  const solanaPrivateKey = Deno.env.get("X402_SOLANA_PRIVATE_KEY");
  const evmPrivateKey = Deno.env.get("X402_EVM_PRIVATE_KEY");
  
  // Discovery URL - required, set in environment
  const discoveryUrl = Deno.env.get("X402_DISCOVERY_URL");
  
  // Facilitator URL - for payment verification
  const facilitatorUrl = Deno.env.get("X402_FACILITATOR_URL");
  
  // Log config for debugging
  console.log("[x402] Config loaded:");
  console.log("[x402]   - Discovery URL:", discoveryUrl || "(not set)");
  console.log("[x402]   - EVM Private Key:", evmPrivateKey ? "(set)" : "(not set)");
  console.log("[x402]   - Solana Private Key:", solanaPrivateKey ? "(set)" : "(not set)");
  
  return {
    solanaPrivateKey,
    evmPrivateKey,
    discoveryUrl,
    facilitatorUrl,
  };
}

/**
 * Check if a network is a Solana network
 * Handles both CAIP-2 format (solana:...) and legacy format (solana)
 */
export function isSolanaNetwork(network: string): boolean {
  return network === "solana" || network.startsWith("solana:");
}

/**
 * Check if a network is an EVM network (Base)
 * Handles both CAIP-2 format (eip155:...) and legacy format (base)
 */
export function isEvmNetwork(network: string): boolean {
  return network === "base" || network.startsWith("eip155:");
}

/**
 * Get chain ID from network identifier
 */
function getChainId(network: string): number {
  return NETWORK_CHAIN_IDS[network] || 8453; // Default to Base mainnet
}

/**
 * Parse price from atomic units to human-readable USDC
 */
export function parseUsdcPrice(atomicUnits: string | undefined, network: string): string {
  if (!atomicUnits) {
    return "Unknown";
  }
  
  try {
    const amount = BigInt(atomicUnits);
    // USDC has 6 decimals on both EVM and Solana
    const decimals = 6n;
    const divisor = 10n ** decimals;
    const dollars = Number(amount) / Number(divisor);
    return `$${dollars.toFixed(4)}`;
  } catch {
    return "Unknown";
  }
}

/**
 * Generate a random 32-byte nonce as hex string
 */
function createNonce(): `0x${string}` {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Create and sign an x402 payment header for EVM networks (Base)
 */
async function createEvmPaymentHeader(
  privateKey: string,
  paymentRequirements: X402PaymentRequirements,
  x402Version: number
): Promise<string> {
  console.log("[x402] Creating EVM payment header for Base mainnet...");
  
  const { ethers } = await import("npm:ethers@6");
  const wallet = new ethers.Wallet(privateKey);
  const fromAddress = wallet.address;
  
  console.log("[x402] From address:", fromAddress);
  
  // Create authorization
  const nonce = createNonce();
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 600; // 10 minutes before
  const validBefore = now + (paymentRequirements.maxTimeoutSeconds || 60);
  
  const authorization = {
    from: fromAddress,
    to: paymentRequirements.payTo,
    value: paymentRequirements.maxAmountRequired,
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce,
  };
  
  console.log("[x402] Authorization:", authorization);
  
  // Get EIP-712 domain parameters
  const extra = paymentRequirements.extra || { name: "USD Coin", version: "2" };
  const chainId = getChainId(paymentRequirements.network);
  
  const domain = {
    name: extra.name || "USD Coin",
    version: extra.version || "2",
    chainId,
    verifyingContract: paymentRequirements.asset,
  };
  
  console.log("[x402] Domain:", domain);
  
  // Sign the authorization
  const signature = await wallet.signTypedData(
    domain,
    EIP712_TYPES,
    {
      from: fromAddress,
      to: paymentRequirements.payTo,
      value: BigInt(paymentRequirements.maxAmountRequired),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    }
  );
  
  console.log("[x402] Signature created");
  
  // Create payment payload
  const paymentPayload = {
    x402Version,
    scheme: paymentRequirements.scheme || "exact",
    network: paymentRequirements.network,
    payload: {
      authorization,
      signature,
    },
  };
  
  // Base64 encode the payment header
  const paymentHeader = btoa(JSON.stringify(paymentPayload));
  
  return paymentHeader;
}

/**
 * Create and sign an x402 payment header for Solana mainnet
 * 
 * For Solana, the payload must contain a base64-encoded partially-signed transaction.
 * The transaction transfers SPL tokens from the payer to the seller.
 * The facilitator (fee payer) will add their signature and submit the transaction.
 */
async function createSolanaPaymentHeader(
  privateKey: string,
  paymentRequirements: X402PaymentRequirements,
  x402Version: number
): Promise<string> {
  console.log("[x402] Creating Solana payment header for mainnet...");
  
  // Import Solana web3.js and SPL token
  const { 
    Keypair, 
    PublicKey, 
    Transaction,
    TransactionInstruction,
    Connection,
    ComputeBudgetProgram,
  } = await import("npm:@solana/web3.js@1");
  const { 
    getAssociatedTokenAddress, 
    createTransferCheckedInstruction,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
  } = await import("npm:@solana/spl-token@0.4");
  const bs58 = await import("npm:bs58@5");
  
  // Decode the private key (base58 encoded)
  let keypair: InstanceType<typeof Keypair>;
  try {
    const secretKey = bs58.default.decode(privateKey);
    keypair = Keypair.fromSecretKey(secretKey);
  } catch {
    throw new Error("Invalid Solana private key. Must be base58 encoded.");
  }
  
  const fromAddress = keypair.publicKey;
  console.log("[x402] From address:", fromAddress.toBase58());
  
  // Get feePayer from payment requirements - required for Solana x402
  const feePayerAddress = paymentRequirements.extra?.feePayer as string;
  if (!feePayerAddress) {
    throw new Error("feePayer is required in paymentRequirements.extra for Solana payments");
  }
  const feePayer = new PublicKey(feePayerAddress);
  console.log("[x402] Fee payer:", feePayer.toBase58());
  
  // Get destination (seller) address and mint (token) address
  const toAddress = new PublicKey(paymentRequirements.payTo);
  const mintAddress = new PublicKey(paymentRequirements.asset);
  const amount = BigInt(paymentRequirements.maxAmountRequired);
  
  console.log("[x402] To address:", toAddress.toBase58());
  console.log("[x402] Mint (USDC):", mintAddress.toBase58());
  console.log("[x402] Amount:", amount.toString());
  
  // Get associated token accounts (ATAs) for source and destination
  const sourceATA = await getAssociatedTokenAddress(
    mintAddress,
    fromAddress,
    false,
    TOKEN_PROGRAM_ID
  );
  
  const destinationATA = await getAssociatedTokenAddress(
    mintAddress,
    toAddress,
    false,
    TOKEN_PROGRAM_ID
  );
  
  console.log("[x402] Source ATA:", sourceATA.toBase58());
  console.log("[x402] Destination ATA:", destinationATA.toBase58());
  
  // Create RPC connection to get latest blockhash
  const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  console.log("[x402] Got blockhash:", blockhash.substring(0, 20) + "...");
  
  // Build the transaction
  const transaction = new Transaction();
  
  // Set fee payer (the facilitator)
  transaction.feePayer = feePayer;
  transaction.recentBlockhash = blockhash;
  
  // Add compute budget instructions (standard for x402)
  const computeUnitLimit = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
  const computeUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 });
  
  transaction.add(computeUnitLimit);
  transaction.add(computeUnitPrice);
  
  // Add transfer instruction (USDC has 6 decimals)
  const transferIx = createTransferCheckedInstruction(
    sourceATA,        // source
    mintAddress,      // mint
    destinationATA,   // destination
    fromAddress,      // owner/authority
    amount,           // amount
    6,                // decimals (USDC = 6)
    [],               // multiSigners (empty)
    TOKEN_PROGRAM_ID  // program ID
  );
  
  transaction.add(transferIx);
  
  // Partially sign the transaction (only the payer/sender signs, not the fee payer)
  transaction.partialSign(keypair);
  
  console.log("[x402] Transaction created and partially signed");
  
  // Serialize transaction to base64
  const serializedTx = transaction.serialize({
    requireAllSignatures: false, // Fee payer hasn't signed yet
    verifySignatures: false,
  });
  const base64Transaction = serializedTx.toString("base64");
  
  console.log("[x402] Transaction serialized, length:", base64Transaction.length);
  
  // Create payment payload with transaction (Solana x402 format)
  const paymentPayload = {
    x402Version,
    scheme: paymentRequirements.scheme || "exact",
    network: paymentRequirements.network,
    payload: {
      transaction: base64Transaction,
    },
  };
  
  // Base64 encode the payment header
  const paymentHeader = btoa(JSON.stringify(paymentPayload));
  
  console.log("[x402] Payment header created");
  
  return paymentHeader;
}

/**
 * Extract a display name from a resource URL
 */
function extractSellerName(resourceUrl: string, metadata?: Record<string, unknown>): string {
  // Check metadata first
  if (metadata?.name && typeof metadata.name === "string") {
    return metadata.name;
  }
  if (metadata?.title && typeof metadata.title === "string") {
    return metadata.title;
  }
  
  try {
    const url = new URL(resourceUrl);
    // Get path segments and create a readable name
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      // Take the last meaningful path segment
      const lastPart = pathParts[pathParts.length - 1];
      // Convert kebab-case or snake_case to Title Case
      return lastPart
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    // Fallback to hostname
    return url.hostname;
  } catch {
    return resourceUrl.substring(0, 30) + "...";
  }
}

/**
 * Extract description from payment requirements or metadata
 */
function extractDescription(
  accepts: X402PaymentRequirements[],
  metadata?: Record<string, unknown>
): string | undefined {
  // Check metadata first
  if (metadata?.description && typeof metadata.description === "string") {
    return metadata.description;
  }
  
  // Check payment requirements
  for (const req of accepts) {
    if (req.description) return req.description;
    if (req.outputSchema?.input?.queryParams) {
      const params = Object.entries(req.outputSchema.input.queryParams);
      if (params.length > 0) {
        return `Accepts: ${params.map(([k, v]) => `${k} (${v.type})`).join(", ")}`;
      }
    }
  }
  
  return undefined;
}

/**
 * Transform a bazaar seller to simplified seller info
 */
export function transformSellerToInfo(seller: X402BazaarSeller): X402SellerInfo {
  // Safely extract networks, filtering out undefined values
  const networks = [...new Set(
    (seller.accepts || [])
      .map((a) => a?.network)
      .filter((n): n is string => !!n)
  )];
  
  // Find the lowest price among all payment options
  let lowestPrice = "Unknown";
  for (const req of (seller.accepts || [])) {
    if (!req?.maxAmountRequired) continue;
    const price = parseUsdcPrice(req.maxAmountRequired, req.network || "");
    if (price !== "Unknown" && (lowestPrice === "Unknown" || price < lowestPrice)) {
      lowestPrice = price;
    }
  }
  
  // Extract input description from schema
  let inputDescription: string | undefined;
  for (const req of (seller.accepts || [])) {
    if (req?.outputSchema?.input?.queryParams) {
      const params = Object.entries(req.outputSchema.input.queryParams);
      inputDescription = params
        .map(([key, val]) => `${key}: ${(val as { description?: string; type?: string })?.description || (val as { type?: string })?.type || "any"}`)
        .join(", ");
      break;
    }
    if (req?.outputSchema?.input?.bodyParams) {
      const params = Object.entries(req.outputSchema.input.bodyParams);
      inputDescription = params
        .map(([key, val]) => `${key}: ${(val as { description?: string; type?: string })?.description || (val as { type?: string })?.type || "any"}`)
        .join(", ");
      break;
    }
  }
  
  return {
    id: seller.resource || "",
    name: extractSellerName(seller.resource || "", seller.metadata),
    description: extractDescription(seller.accepts || [], seller.metadata),
    resourceUrl: seller.resource || "",
    priceUsdc: lowestPrice,
    networks,
    lastUpdated: seller.lastUpdated || new Date().toISOString(),
    inputDescription,
  };
}

/**
 * List sellers from the x402 bazaar
 */
export async function listBazaarSellers(options?: {
  network?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<X402SellerInfo[]> {
  const config = getX402Config();
  
  if (!config.discoveryUrl) {
    throw new Error("X402_DISCOVERY_URL environment variable is not set");
  }
  
  const queryParams = new URLSearchParams();
  if (options?.type) queryParams.set("type", options.type);
  if (options?.limit) queryParams.set("limit", options.limit.toString());
  if (options?.offset) queryParams.set("offset", options.offset.toString());
  
  const queryString = queryParams.toString();
  const endpoint = `${config.discoveryUrl}${queryString ? `?${queryString}` : ""}`;
  
  console.log("[x402] Fetching bazaar sellers from:", endpoint);
  
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      let errorMessage: string;
      
      if (contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorData.message || response.statusText;
      } else {
        errorMessage = `Received non-JSON response (status ${response.status}). Check discovery URL configuration.`;
      }
      
      throw new Error(`Failed to fetch bazaar sellers (${response.status}): ${errorMessage}`);
    }
    
    const data = await response.json();
    console.log("[x402] Raw response keys:", Object.keys(data));
    
    // Handle different response structures
    let rawSellers: X402BazaarSeller[] = [];
    if (Array.isArray(data)) {
      rawSellers = data;
    } else if (data.items && Array.isArray(data.items)) {
      rawSellers = data.items;
    } else if (data.resources && Array.isArray(data.resources)) {
      rawSellers = data.resources;
    } else {
      console.log("[x402] Unexpected response structure:", JSON.stringify(data).substring(0, 500));
      rawSellers = [];
    }
    
    console.log("[x402] Found", rawSellers.length, "sellers in bazaar");
    
    // Transform to simplified format, with error handling for individual sellers
    let sellers: X402SellerInfo[] = [];
    for (const rawSeller of rawSellers) {
      try {
        const transformed = transformSellerToInfo(rawSeller);
        sellers.push(transformed);
      } catch (err) {
        console.warn("[x402] Failed to transform seller:", rawSeller?.resource, err);
      }
    }
    
    if (options?.network) {
      sellers = sellers.filter((s) => s.networks.includes(options.network!));
    }
    
    return sellers;
  } catch (error) {
    console.error("[x402] Error fetching bazaar sellers:", error);
    
    if (error instanceof Error) {
      throw new Error(`x402 Bazaar error: ${error.message}. Discovery URL: ${endpoint}`);
    }
    throw error;
  }
}

/**
 * Call an x402-protected endpoint with payment
 * 
 * This implementation:
 * 1. Gets the payment requirements from the resource
 * 2. Detects the seller's network (Solana or EVM)
 * 3. Uses the appropriate private key and signing method
 * 4. Makes the request with X-Payment header
 */
export async function callX402Seller(
  resourceUrl: string,
  query: string,
  preferredNetwork?: string
): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  paymentInfo?: {
    txId?: string;
    cost?: string;
    network: string;
  };
}> {
  const config = getX402Config();
  
  console.log("[x402] Calling seller:", resourceUrl);
  console.log("[x402] Query:", query);
  if (preferredNetwork) {
    console.log("[x402] Preferred network:", preferredNetwork);
  }
  
  try {
    // Build the request URL with query parameters
    const url = new URL(resourceUrl);
    if (query) {
      // Try to parse query as JSON for structured params, otherwise use as single param
      try {
        const params = JSON.parse(query);
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      } catch {
        // If not JSON, use as a general query parameter
        url.searchParams.set("q", query);
      }
    }
    
    console.log("[x402] Request URL:", url.toString());
    
    // Step 1: Make initial request to get 402 response with payment requirements
    const initialResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    
    console.log("[x402] Initial response status:", initialResponse.status);
    
    // If it's not a 402, the endpoint might be free or already paid
    if (initialResponse.status !== 402) {
      if (initialResponse.ok) {
        const data = await initialResponse.json();
        return {
          success: true,
          data,
          paymentInfo: { network: "free" },
        };
      }
      const errorText = await initialResponse.text();
      throw new Error(`Unexpected response status: ${initialResponse.status}. Body: ${errorText.substring(0, 200)}`);
    }
    
    // Step 2: Parse payment requirements from 402 response
    const paymentRequirements = await initialResponse.json();
    console.log("[x402] Payment requirements received");
    
    // Get the x402 version
    const x402Version = paymentRequirements.x402Version || 1;
    
    // Find the best payment option based on available private keys
    const accepts: X402PaymentRequirements[] = paymentRequirements.accepts || [];
    
    // Determine which payment option to use based on what keys are available
    let paymentOption: X402PaymentRequirements | undefined;
    let useNetwork: "solana" | "evm" | undefined;
    
    // If user specified a preferred network, try that first
    if (preferredNetwork) {
      paymentOption = accepts.find((a) => a.network === preferredNetwork);
      if (paymentOption) {
        useNetwork = isSolanaNetwork(paymentOption.network) ? "solana" : "evm";
      }
    }
    
    // If no preference or not found, pick based on available keys
    if (!paymentOption) {
      // Try Solana first if we have a Solana key
      if (config.solanaPrivateKey) {
        paymentOption = accepts.find((a) => isSolanaNetwork(a.network));
        if (paymentOption) {
          useNetwork = "solana";
          console.log("[x402] Using Solana mainnet for payment");
        }
      }
      
      // Try EVM if no Solana option or no Solana key
      if (!paymentOption && config.evmPrivateKey) {
        paymentOption = accepts.find((a) => isEvmNetwork(a.network));
        if (paymentOption) {
          useNetwork = "evm";
          console.log("[x402] Using EVM (Base mainnet) for payment");
        }
      }
    }
    
    if (!paymentOption || !useNetwork) {
      const availableNetworks = accepts.map((a) => a.network).join(", ");
      const configuredKeys = [];
      if (config.evmPrivateKey) configuredKeys.push("EVM (Base)");
      if (config.solanaPrivateKey) configuredKeys.push("Solana");
      
      return {
        success: false,
        error: `No compatible payment option found. Seller accepts: [${availableNetworks}]. You have keys for: [${configuredKeys.join(", ") || "none"}].`,
      };
    }
    
    console.log("[x402] Selected payment network:", paymentOption.network);
    
    // Step 3: Create and sign the payment header based on network type
    let paymentHeader: string;
    
    if (useNetwork === "solana") {
      if (!config.solanaPrivateKey) {
        return {
          success: false,
          error: "Solana private key not configured. Set X402_SOLANA_PRIVATE_KEY environment variable.",
          paymentInfo: {
            cost: parseUsdcPrice(paymentOption.maxAmountRequired, paymentOption.network),
            network: paymentOption.network,
          },
        };
      }
      paymentHeader = await createSolanaPaymentHeader(
        config.solanaPrivateKey,
        paymentOption,
        x402Version
      );
    } else {
      if (!config.evmPrivateKey) {
        return {
          success: false,
          error: "EVM private key not configured. Set X402_EVM_PRIVATE_KEY environment variable.",
          paymentInfo: {
            cost: parseUsdcPrice(paymentOption.maxAmountRequired, paymentOption.network),
            network: paymentOption.network,
          },
        };
      }
      paymentHeader = await createEvmPaymentHeader(
        config.evmPrivateKey,
        paymentOption,
        x402Version
      );
    }
    
    console.log("[x402] Payment header created, making paid request...");
    
    // Step 4: Make the request with the X-Payment header
    const paidResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Payment": paymentHeader,
      },
    });
    
    console.log("[x402] Paid response status:", paidResponse.status);
    
    if (!paidResponse.ok) {
      const errorText = await paidResponse.text();
      console.error("[x402] Paid request failed:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return {
          success: false,
          error: errorJson.error || errorJson.message || `Payment failed: ${paidResponse.status}`,
          paymentInfo: {
            cost: parseUsdcPrice(paymentOption.maxAmountRequired, paymentOption.network),
            network: paymentOption.network,
          },
        };
      } catch {
        return {
          success: false,
          error: `Payment failed (${paidResponse.status}): ${errorText.substring(0, 200)}`,
          paymentInfo: {
            cost: parseUsdcPrice(paymentOption.maxAmountRequired, paymentOption.network),
            network: paymentOption.network,
          },
        };
      }
    }
    
    // Step 5: Parse and return the successful response
    const responseText = await paidResponse.text();
    console.log("[x402] Raw seller response (first 1000 chars):", responseText.substring(0, 1000));
    if (responseText.length > 1000) {
      console.log("[x402] Response truncated, total length:", responseText.length);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      const parsedStr = JSON.stringify(data, null, 2);
      console.log("[x402] Parsed seller response (first 1000 chars):", parsedStr.substring(0, 1000));
    } catch (parseError) {
      console.log("[x402] Response is not JSON, returning as text");
      data = { rawText: responseText };
    }
    
    // Check for payment receipt in response headers
    const paymentReceipt = paidResponse.headers.get("X-Payment-Receipt");
    console.log("[x402] Payment receipt header:", paymentReceipt || "none");
    
    return {
      success: true,
      data,
      paymentInfo: {
        txId: paymentReceipt || undefined,
        cost: parseUsdcPrice(paymentOption.maxAmountRequired, paymentOption.network),
        network: paymentOption.network,
      },
    };
    
  } catch (error) {
    console.error("[x402] Error calling seller:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Health check for x402 bazaar discovery
 */
export async function checkX402Health(): Promise<boolean> {
  const config = getX402Config();
  
  if (!config.discoveryUrl) {
    return false;
  }
  
  try {
    const response = await fetch(`${config.discoveryUrl}?limit=1`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
