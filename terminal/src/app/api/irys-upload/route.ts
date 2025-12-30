import { NextRequest, NextResponse } from "next/server";
import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";
import { 
  validateIrysConfig, 
  getGatewayUrl,
  type IrysUploadResult,
} from "@/lib/irys";
import type { IrysCombinedUploadPayload } from "@/types/agentic";

/**
 * Get configured Irys uploader based on environment
 */
async function getIrysUploader() {
  const environment = process.env.IRYS_CHAIN_ENVIRONMENT as "mainnet" | "devnet";
  const privateKey = process.env.IRYS_SOLANA_PRIVATE_KEY!;
  const rpcUrl = process.env.IRYS_SOLANA_RPC_URL;

  if (environment === "devnet") {
    // Devnet requires RPC URL
    const irysUploader = await Uploader(Solana)
      .withWallet(privateKey)
      .withRpc(rpcUrl!)
      .devnet();
    return { uploader: irysUploader, environment };
  } else {
    // Mainnet configuration
    const irysUploader = await Uploader(Solana)
      .withWallet(privateKey);
    return { uploader: irysUploader, environment };
  }
}

/**
 * POST /api/irys-upload
 * 
 * Uploads combined agent analysis data to Irys chain for permanent, verifiable storage.
 * 
 * Request body: IrysCombinedUploadPayload
 * Response: IrysUploadResult
 */
export async function POST(request: NextRequest): Promise<NextResponse<IrysUploadResult>> {
  const startTime = Date.now();
  
  try {
    // Validate environment configuration
    const configValidation = validateIrysConfig();
    if (!configValidation.valid) {
      console.error("[Irys Upload] Configuration error:", configValidation.error);
      return NextResponse.json(
        {
          success: false,
          error: `Irys configuration error: ${configValidation.error}`,
        },
        { status: 500 }
      );
    }

    // Parse request body
    const payload: IrysCombinedUploadPayload = await request.json();

    // Validate payload
    if (!payload.requestId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: requestId" },
        { status: 400 }
      );
    }
    if (!payload.agentsData || payload.agentsData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required field: agentsData" },
        { status: 400 }
      );
    }

    console.log(`[Irys Upload] Starting upload for request ${payload.requestId}`);
    console.log(`[Irys Upload] Agents count: ${payload.agentsData.length}`);

    // Get Irys uploader
    const { uploader, environment } = await getIrysUploader();

    // Prepare data for upload
    const dataToUpload = JSON.stringify(payload, null, 2);

    console.log(`[Irys Upload] Uploading ${dataToUpload.length} bytes to ${environment}`);

    // Build agent names for tags
    const agentNames = payload.agentsData.map(a => a.name).join(', ');

    // Upload to Irys
    const receipt = await uploader.upload(dataToUpload, {
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "App-Name", value: "PredictOS" },
        { name: "App-Version", value: "1.0.0" },
        { name: "Request-Id", value: payload.requestId },
        { name: "PM-Type", value: payload.pmType },
        { name: "Event-Identifier", value: payload.eventIdentifier },
        { name: "Analysis-Mode", value: payload.analysisMode },
        { name: "Agents-Count", value: payload.agentsData.length.toString() },
        { name: "Agents", value: agentNames.substring(0, 100) }, // Limit tag length
        { name: "Schema-Version", value: payload.schemaVersion },
        { name: "Environment", value: environment },
      ],
    });

    const processingTime = Date.now() - startTime;
    const gatewayUrl = getGatewayUrl(receipt.id);

    console.log(`[Irys Upload] Success! Transaction ID: ${receipt.id}`);
    console.log(`[Irys Upload] Gateway URL: ${gatewayUrl}`);
    console.log(`[Irys Upload] Processing time: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      transactionId: receipt.id,
      gatewayUrl,
      environment,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during upload";
    console.error("[Irys Upload] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/irys-upload
 * 
 * Returns information about the Irys configuration status (without sensitive data)
 */
export async function GET(): Promise<NextResponse> {
  const configValidation = validateIrysConfig();
  const environment = process.env.IRYS_CHAIN_ENVIRONMENT;
  
  return NextResponse.json({
    configured: configValidation.valid,
    environment: environment || "not set",
    error: configValidation.error,
  });
}

