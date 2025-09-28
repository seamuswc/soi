#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🚀 SOI PATTAYA - Environment Setup');
  console.log('=====================================\n');

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📝 Please provide the following information:\n');

  // Database configuration
  const databaseUrl = await question('🗄️  Database URL (default: file:/Users/seamus/Desktop/soipattaya_JS/server/database.sqlite): ') || 'file:/Users/seamus/Desktop/soipattaya_JS/server/database.sqlite';

  // Admin credentials
  const adminUsername = await question('👤 Admin Username (default: admin): ') || 'admin';
  const adminPassword = await question('🔐 Admin Password (default: soipattaya2024): ') || 'soipattaya2024';
  const adminToken = await question('🎫 Admin Token (default: admin_token_12345): ') || 'admin_token_12345';

  // Google Maps API
  const googleMapsKey = await question('🗺️  Google Maps API Key: ');

  // Blockchain addresses
  const solanaAddress = await question('💰 Solana Merchant Address: ');
  const aptosAddress = await question('💰 Aptos Merchant Address: ');
  const suiAddress = await question('💰 Sui Merchant Address: ');

  // Server configuration
  const nodeEnv = await question('🌍 Node Environment (default: development): ') || 'development';
  const port = await question('🔌 Port (default: 3000): ') || '3000';

  // Create .env content
  const envContent = `# ===========================================
# SOI PATTAYA - ENVIRONMENT CONFIGURATION
# ===========================================
# Generated on ${new Date().toISOString()}

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_URL="${databaseUrl}"

# ===========================================
# ADMIN AUTHENTICATION
# ===========================================
ADMIN_USERNAME="${adminUsername}"
ADMIN_PASSWORD="${adminPassword}"
ADMIN_TOKEN="${adminToken}"

# ===========================================
# GOOGLE MAPS API
# ===========================================
VITE_GOOGLE_MAPS_API_KEY="${googleMapsKey}"

# ===========================================
# BLOCKCHAIN CONFIGURATION
# ===========================================
# Solana Configuration
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_MERCHANT_ADDRESS="${solanaAddress}"

# Aptos Configuration
APTOS_MERCHANT_ADDRESS="${aptosAddress}"

# Sui Configuration
SUI_MERCHANT_ADDRESS="${suiAddress}"

# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV="${nodeEnv}"
PORT=${port}
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  // Also create client/.env for Vite
  const clientEnvPath = path.join(__dirname, 'client', '.env');
  const clientEnvContent = `# ===========================================
# SOI PATTAYA - CLIENT ENVIRONMENT
# ===========================================

# ===========================================
# GOOGLE MAPS API
# ===========================================
VITE_GOOGLE_MAPS_API_KEY="${googleMapsKey}"
`;

  fs.writeFileSync(clientEnvPath, clientEnvContent);

  console.log('\n✅ Environment setup complete!');
  console.log('📁 Created files:');
  console.log('   - .env (root)');
  console.log('   - client/.env');
  console.log('\n🚀 You can now run:');
  console.log('   npm run dev    (for development)');
  console.log('   npm run build  (for production)');
  console.log('   npm start      (to start production server)');

  rl.close();
}

setupEnvironment().catch(console.error);
