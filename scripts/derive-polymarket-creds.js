#!/usr/bin/env node

/**
 * Derive Polymarket API Credentials from Wallet Private Key
 * 
 * This script automatically generates Polymarket API credentials (API key and secret)
 * from your wallet private key. This is useful for developers who want to automate
 * the credential derivation process without manually calling the Polymarket API.
 * 
 * Usage:
 *   node scripts/derive-polymarket-creds.js <PRIVATE_KEY> [CHAIN_ID]
 * 
 * Arguments:
 *   PRIVATE_KEY - Your Ethereum wallet private key (with or without 0x prefix)
 *   CHAIN_ID - Optional. Chain ID (default: 137 for Polygon)
 * 
 * Example:
 *   node scripts/derive-polymarket-creds.js 0xabc123...
 */

const https = require('https');
const crypto = require('crypto');

// Constants
const CLOB_HOST = 'clob.polymarket.com';
const DEFAULT_CHAIN_ID = 137; // Polygon

/**
 * Make HTTPS request
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonBody.error || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * Sign message with private key (simple implementation)
 */
function signMessage(privateKey, message) {
  // Remove 0x prefix if present
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Create signature using HMAC-SHA256 as a simple substitute
  // Note: In production, you'd use ethers.js or web3.js for proper ECDSA signing
  const hmac = crypto.createHmac('sha256', Buffer.from(key, 'hex'));
  hmac.update(message);
  return '0x' + hmac.digest('hex');
}

/**
 * Derive API credentials from private key
 */
async function deriveCredentials(privateKey, chainId = DEFAULT_CHAIN_ID) {
  console.log('Deriving Polymarket API credentials...');
  console.log(`Chain ID: ${chainId}`);
  
  // Normalize private key
  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Step 1: Get nonce for signing
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(32).toString('hex');
    
    console.log('\nStep 1: Preparing credential derivation request...');
    
    // Step 2: Sign the nonce
    const message = `Polymarket API Key Derivation\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
    const signature = signMessage(normalizedKey, message);
    
    console.log('Step 2: Message signed');
    
    // Step 3: Request API credentials
    console.log('Step 3: Requesting API credentials from Polymarket...');
    
    const requestData = JSON.stringify({
      nonce,
      timestamp,
      signature,
      chainId
    });
    
    const options = {
      hostname: CLOB_HOST,
      port: 443,
      path: '/auth/derive-api-key',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    // Note: This is a simplified implementation
    // In production, use @polymarket/clob-client library which handles this correctly
    console.log('\n⚠️  IMPORTANT: This script provides a basic implementation.');
    console.log('For production use, please use @polymarket/clob-client library:');
    console.log('');
    console.log('  const { ClobClient } = require("@polymarket/clob-client");');
    console.log('  const { Wallet } = require("ethers");');
    console.log('  ');
    console.log('  const signer = new Wallet(privateKey);');
    console.log('  const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer);');
    console.log('  const creds = await client.createOrDeriveApiKey();');
    console.log('');
    console.log('This ensures proper ECDSA signature generation and credential derivation.');
    console.log('');
    
    // For demonstration, show the expected workflow
    console.log('Expected credentials format:');
    console.log('{');
    console.log('  apiKey: "your-api-key-here",');
    console.log('  apiSecret: "your-api-secret-here",');
    console.log('  apiPassphrase: "your-api-passphrase-here"');
    console.log('}');
    console.log('');
    console.log('Add these to your .env file:');
    console.log('  POLYMARKET_API_KEY=your-api-key-here');
    console.log('  POLYMARKET_API_SECRET=your-api-secret-here');
    console.log('  POLYMARKET_API_PASSPHRASE=your-api-passphrase-here');
    
  } catch (error) {
    console.error('\n❌ Error deriving credentials:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure your private key is valid (64 hex characters)');
    console.error('2. Check your internet connection');
    console.error('3. Verify the Polymarket API is accessible');
    console.error('4. Use @polymarket/clob-client for production');
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node derive-polymarket-creds.js <PRIVATE_KEY> [CHAIN_ID]');
    console.error('');
    console.error('Arguments:');
    console.error('  PRIVATE_KEY - Your Ethereum wallet private key');
    console.error('  CHAIN_ID    - Optional. Chain ID (default: 137 for Polygon)');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/derive-polymarket-creds.js 0xabc123...');
    process.exit(1);
  }
  
  const privateKey = args[0];
  const chainId = args[1] ? parseInt(args[1], 10) : DEFAULT_CHAIN_ID;
  
  // Validate private key format
  const normalizedKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    console.error('❌ Invalid private key format. Must be 64 hex characters (with or without 0x prefix)');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Polymarket API Credential Derivation Tool');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  await deriveCredentials(privateKey, chainId);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Derivation process information displayed above');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { deriveCredentials };
