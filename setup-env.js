#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 SOI PATTAYA - Quick Setup');
console.log('============================\n');

// Create simple .env file
const envContent = `# SOI Pattaya Environment
DATABASE_URL="file:/var/www/soipattaya/server/database.sqlite"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="poop"
ADMIN_TOKEN="admin_token_12345"
VITE_GOOGLE_MAPS_API_KEY="AIzaSyBVdAS-3mrNYARIDmqn2dP1tG1Khqv5GoM"
SOLANA_MERCHANT_ADDRESS="8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
LINE_ACCOUNT="@soipattaya"
NODE_ENV="production"
PORT=3000
SITE_DOMAIN="soipattaya.com"
PROMO_CODE=""
PROMO_MAX_USES=""
`;

// Write .env file
fs.writeFileSync('.env', envContent);

// Create client/.env for Vite
const clientEnvContent = `VITE_GOOGLE_MAPS_API_KEY="AIzaSyBVdAS-3mrNYARIDmqn2dP1tG1Khqv5GoM"
`;

fs.writeFileSync('client/.env', clientEnvContent);

console.log('✅ Environment files created!');
console.log('📁 Files created:');
console.log('   - .env (root)');
console.log('   - client/.env');
console.log('\n📝 Edit .env file with your actual values:');
console.log('   - SOLANA_MERCHANT_ADDRESS: Your Solana wallet address for receiving USDC');
console.log('   - LINE_ACCOUNT: Your LINE account (e.g., @soipattaya)');
console.log('   - VITE_GOOGLE_MAPS_API_KEY: Google Maps API key');
console.log('   - Admin credentials');
console.log('\n🚀 Then run:');
console.log('   npm run dev    (for development)');
console.log('   npm run build  (for production)');
