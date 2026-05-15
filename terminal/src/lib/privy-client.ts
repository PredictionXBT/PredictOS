import { PrivyClient } from '@privy-io/server-auth';
import * as ethersV5 from 'ethers5'; // v5 for Polymarket
import fs from 'fs';
import path from 'path';

if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    throw new Error('Missing Privy configuration');
}

export const privy = new PrivyClient(
    process.env.PRIVY_APP_ID,
    process.env.PRIVY_APP_SECRET
);

const WALLET_FILE = path.join(process.cwd(), 'bot-wallet.json');

export async function getSystemWallet() {
    // 1. Check if we already have a wallet saved
    if (fs.existsSync(WALLET_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
            if (data.id && data.address) {
                return data;
            }
        } catch (e) {
            console.error("Error reading wallet file:", e);
        }
    }

    // 2. Create new if not exists
    try {
        console.log("Creating new Privy Server Wallet for Bot...");
        const wallet = await privy.walletApi.create({ chainType: 'ethereum' });
        
        // Save to file
        fs.writeFileSync(WALLET_FILE, JSON.stringify({
            id: wallet.id,
            address: wallet.address,
            chainType: wallet.chainType,
            createdAt: new Date().toISOString()
        }, null, 2));

        return { id: wallet.id, address: wallet.address };
    } catch (error) {
        console.error("Failed to create system wallet:", error);
        return null;
    }
}

/**
 * Create an ethers v5 Signer from a Privy wallet
 * This uses Privy's signing methods under the hood
 */
export async function createPrivySigner(walletId: string, walletAddress: string): Promise<ethersV5.providers.JsonRpcSigner> {
    // Create a custom signer that uses Privy's API for signing
    const provider = new ethersV5.providers.JsonRpcProvider('https://polygon-rpc.com');
    
    const signer = new ethersV5.VoidSigner(walletAddress, provider);
    
    // Override the _signTypedData method to use Privy
    (signer as any)._signTypedData = async (domain: any, types: any, value: any) => {
        console.log('[PrivySigner] Signing typed data with Privy...');
        
        // @ts-ignore
        const signatureResponse = await privy.walletApi.ethereum.signTypedData({
            walletId: walletId,
            typedData: {
                domain,
                types,
                primaryType: Object.keys(types).find(key => key !== 'EIP712Domain') || 'Order',
                message: value
            }
        });
        
        // Extract signature from response
        const signature = typeof signatureResponse === 'string' 
            ? signatureResponse 
            : (signatureResponse as any).signature || String(signatureResponse);
        
        console.log('[PrivySigner] Signature received from Privy');
        return signature;
    };
    
    // Cast to JsonRpcSigner to match Polymarket SDK expectations
    return signer as unknown as ethersV5.providers.JsonRpcSigner;
}
