/**
 * Irys (Permanent Storage) Utility Functions
 * 
 * Provides functionality to upload agent analysis data to the Irys chain
 * for verifiable, permanent storage of AI predictions.
 * 
 * Supports both mainnet (permanent, paid) and devnet (temporary, free) environments.
 */

import type { 
  PmType,
  IrysAgentData, 
  IrysCombinedUploadPayload 
} from "@/types/agentic";

// Types for Irys upload
export interface IrysUploadResult {
  success: boolean;
  /** Transaction ID on Irys - can be used to retrieve the data */
  transactionId?: string;
  /** Full URL to view the uploaded data */
  gatewayUrl?: string;
  /** Error message if upload failed */
  error?: string;
  /** Environment used for upload */
  environment?: "mainnet" | "devnet";
}

/**
 * Generate a unique request ID for distinguishing uploads
 * This helps identify data from different users/instances on devnet
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const secondRandom = Math.random().toString(36).substring(2, 15);
  return `pred-${timestamp}-${randomPart}${secondRandom}`;
}

/**
 * Format combined analysis data for upload to Irys
 */
export function formatCombinedAnalysisForUpload(
  agentsData: IrysAgentData[],
  metadata: {
    requestId: string;
    pmType: PmType;
    eventIdentifier: string;
    eventId?: string;
    analysisMode: 'supervised' | 'autonomous';
  }
): IrysCombinedUploadPayload {
  return {
    requestId: metadata.requestId,
    timestamp: new Date().toISOString(),
    pmType: metadata.pmType,
    eventIdentifier: metadata.eventIdentifier,
    eventId: metadata.eventId,
    analysisMode: metadata.analysisMode,
    agentsData,
    schemaVersion: "1.0.0",
  };
}

/**
 * Get the Irys gateway URL for a transaction
 */
export function getGatewayUrl(transactionId: string): string {
  return `https://gateway.irys.xyz/${transactionId}`;
}

/**
 * Validate that required environment variables are set
 */
export function validateIrysConfig(): { valid: boolean; error?: string } {
  const environment = process.env.IRYS_CHAIN_ENVIRONMENT;
  const privateKey = process.env.IRYS_SOLANA_PRIVATE_KEY;
  
  if (!environment) {
    return { valid: false, error: "IRYS_CHAIN_ENVIRONMENT is not set" };
  }
  
  if (environment !== "mainnet" && environment !== "devnet") {
    return { valid: false, error: "IRYS_CHAIN_ENVIRONMENT must be 'mainnet' or 'devnet'" };
  }
  
  if (!privateKey) {
    return { valid: false, error: "IRYS_SOLANA_PRIVATE_KEY is not set" };
  }
  
  // For devnet, RPC URL is required
  if (environment === "devnet" && !process.env.IRYS_SOLANA_RPC_URL) {
    return { valid: false, error: "IRYS_SOLANA_RPC_URL is required for devnet" };
  }
  
  return { valid: true };
}

