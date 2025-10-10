#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ENV_FILE = path.join(__dirname, '.env');

const CHAINS = {
  'solana': 'SOLANA_MERCHANT_ADDRESS',
  'aptos': 'APTOS_MERCHANT_ADDRESS',
  'sui': 'SUI_MERCHANT_ADDRESS',
  'base': 'BASE_MERCHANT_ADDRESS'
};

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
  console.log('🔐 Crypto Merchant Address Manager\n');
  
  // Show current addresses
  const envContent = readEnv();
  console.log('📋 Current addresses:');
  Object.entries(CHAINS).forEach(([chain, varName]) => {
    const match = envContent.match(new RegExp(`${varName}="([^"]*)"`, 'm'));
    const value = match ? match[1] : 'NOT SET';
    console.log(`  ${chain.toUpperCase().padEnd(10)} → ${value}`);
  });
  console.log('');
  
  // Ask which chain to update
  console.log('Available chains: solana, aptos, sui, base, all');
  const chainInput = (await question('Which chain do you want to update? ')).toLowerCase().trim();
  
  if (chainInput === 'all') {
    // Update all chains
    let newContent = envContent;
    for (const [chain, varName] of Object.entries(CHAINS)) {
      const address = await question(`Enter ${chain.toUpperCase()} address: `);
      if (address.trim()) {
        newContent = updateOrAddEnvVar(newContent, varName, address.trim());
        console.log(`✅ ${chain.toUpperCase()} address set`);
      }
    }
    writeEnv(newContent);
  } else if (CHAINS[chainInput]) {
    // Update single chain
    const varName = CHAINS[chainInput];
    const address = await question(`Enter ${chainInput.toUpperCase()} address: `);
    
    if (address.trim()) {
      const newContent = updateOrAddEnvVar(envContent, varName, address.trim());
      writeEnv(newContent);
      console.log(`✅ ${chainInput.toUpperCase()} merchant address updated!`);
    } else {
      console.log('❌ No address provided');
    }
  } else {
    console.log('❌ Invalid chain. Choose: solana, aptos, sui, base, or all');
  }
  
  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});

