#!/usr/bin/env node
/**
 * Derive Polymarket API Credentials
 *
 * This script derives your API credentials from your private key and
 * automatically updates your supabase/.env.local file.
 *
 * WHEN TO RUN:
 * - After initial setup (once you've added POLYMARKET_WALLET_PRIVATE_KEY to .env.local)
 * - After changing wallets (new private key = new API credentials)
 * - If you get "API key invalid" errors
 *
 * Usage:
 *   cd terminal && npm install   # First time only
 *   node ../scripts/derive-polymarket-creds.js
 *
 * Or from project root:
 *   cd terminal && node ../scripts/derive-polymarket-creds.js
 */

const { ClobClient } = require("@polymarket/clob-client");
const { Wallet } = require("ethers");
const path = require("path");
const fs = require("fs");

const ENV_FILE_PATH = path.join(__dirname, "..", "supabase", ".env.local");

// Try to load from .env.local if not provided via environment
function loadEnvFile() {
  const envPaths = [
    ENV_FILE_PATH,
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=");
          if (key && value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      console.log(`Loaded environment from: ${envPath}`);
      return envPath;
    }
  }
  return null;
}

/**
 * Update or add a key=value in the .env.local file
 */
function updateEnvFile(filePath, key, value) {
  if (!fs.existsSync(filePath)) {
    console.error(`  Cannot update: ${filePath} does not exist`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(content)) {
    // Replace existing value
    content = content.replace(regex, `${key}=${value}`);
  } else {
    // Add new value at end
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }

  fs.writeFileSync(filePath, content);
  return true;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Polymarket API Credential Derivation Tool");
  console.log("=".repeat(60));
  console.log();

  // Load env file
  const loadedEnvPath = loadEnvFile();

  const privateKey = process.env.POLYMARKET_WALLET_PRIVATE_KEY;

  if (!privateKey) {
    console.error("ERROR: POLYMARKET_WALLET_PRIVATE_KEY not found!");
    console.error("");
    console.error("Please add your private key to supabase/.env.local first:");
    console.error("  POLYMARKET_WALLET_PRIVATE_KEY=0x...");
    console.error("");
    console.error("Then run this script again.");
    process.exit(1);
  }

  console.log("Private key found. Deriving API credentials...");
  console.log("(This may take a few seconds)");
  console.log();

  try {
    // Create wallet signer
    const signer = new Wallet(privateKey);
    console.log(`Wallet address: ${signer.address}`);

    // Create CLOB client and derive credentials
    const CLOB_HOST = "https://clob.polymarket.com";
    const CHAIN_ID = 137; // Polygon

    const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer);
    const creds = await client.createOrDeriveApiKey();

    console.log();
    console.log("Derived credentials:");
    console.log(`  POLYMARKET_API_KEY=${creds.key}`);
    console.log(`  POLYMARKET_API_SECRET=${creds.secret}`);
    console.log(`  POLYMARKET_API_PASSPHRASE=${creds.passphrase}`);
    console.log();

    // Auto-update .env.local
    if (fs.existsSync(ENV_FILE_PATH)) {
      console.log("Updating supabase/.env.local...");
      updateEnvFile(ENV_FILE_PATH, "POLYMARKET_API_KEY", creds.key);
      updateEnvFile(ENV_FILE_PATH, "POLYMARKET_API_SECRET", creds.secret);
      updateEnvFile(ENV_FILE_PATH, "POLYMARKET_API_PASSPHRASE", creds.passphrase);
      console.log();
      console.log("=".repeat(60));
      console.log("SUCCESS! Your .env.local has been updated.");
      console.log("=".repeat(60));
      console.log();
      console.log("Now restart your Edge Functions:");
      console.log("  cd supabase && npx supabase functions serve --env-file .env.local");
      console.log();
    } else {
      console.log("=".repeat(60));
      console.log("SUCCESS! Add these values to your supabase/.env.local:");
      console.log("=".repeat(60));
      console.log();
      console.log(`POLYMARKET_API_KEY=${creds.key}`);
      console.log(`POLYMARKET_API_SECRET=${creds.secret}`);
      console.log(`POLYMARKET_API_PASSPHRASE=${creds.passphrase}`);
      console.log();
    }

  } catch (error) {
    console.error("ERROR deriving credentials:", error.message);
    console.error();
    console.error("This usually means:");
    console.error("  - Invalid private key format");
    console.error("  - Network issues connecting to Polymarket");
    console.error("  - The wallet hasn't traded on Polymarket yet");
    process.exit(1);
  }
}

main();
