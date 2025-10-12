#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ENV_FILE = path.join(__dirname, '.env');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function readEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env file not found!');
    process.exit(1);
  }
  return fs.readFileSync(ENV_FILE, 'utf-8');
}

function writeEnv(content) {
  fs.writeFileSync(ENV_FILE, content, 'utf-8');
}

function updateOrAddEnvVar(envContent, varName, value) {
  const regex = new RegExp(`^${varName}=.*$`, 'm');
  
  if (regex.test(envContent)) {
    // Update existing
    return envContent.replace(regex, `${varName}="${value}"`);
  } else {
    // Add new
    return envContent.trim() + `\n${varName}="${value}"\n`;
  }
}

async function main() {
  console.log('🔐 Merchant Address Manager\n');
  
  // Read current .env
  let envContent = readEnv();
  
  // Show current Solana address
  const solanaMatch = envContent.match(/SOLANA_MERCHANT_ADDRESS="([^"]*)"/m);
  const currentSolana = solanaMatch ? solanaMatch[1] : 'NOT SET';
  console.log(`📋 Current Solana address: ${currentSolana}\n`);
  
  // Ask for new Solana address
  const solanaAddress = await question('Enter your Solana wallet address (or press Enter to keep current): ');
  
  if (solanaAddress.trim()) {
    envContent = updateOrAddEnvVar(envContent, 'SOLANA_MERCHANT_ADDRESS', solanaAddress.trim());
    console.log('✅ Solana merchant address updated!');
  } else {
    console.log('⏭️  Keeping current Solana address');
  }
  
  // Write updated .env
  writeEnv(envContent);
  
  console.log('\n✨ Configuration updated successfully!');
  console.log('💡 Tip: Payments will be sent to this Solana address');
  
  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
