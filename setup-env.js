#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 SOI PATTAYA - Quick Setup');
console.log('============================\n');

// Create simple .env file
const envContent = `# SOI Pattaya Environment
DATABASE_URL="file:./server/database.sqlite"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="soipattaya2024"
ADMIN_TOKEN="admin_token_12345"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
SOLANA_MERCHANT_ADDRESS="your_solana_address_here"
APTOS_MERCHANT_ADDRESS="your_aptos_address_here"
SUI_MERCHANT_ADDRESS="your_sui_address_here"
NODE_ENV="development"
PORT=3000
`;

// Write .env file
fs.writeFileSync('.env', envContent);

// Create client/.env for Vite
const clientEnvContent = `VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
`;

fs.writeFileSync('client/.env', clientEnvContent);

console.log('✅ Environment files created!');
console.log('📁 Files created:');
console.log('   - .env (root)');
console.log('   - client/.env');
console.log('\n📝 Edit .env file with your actual values:');
console.log('   - Google Maps API key');
console.log('   - Blockchain addresses');
console.log('   - Admin credentials');
console.log('\n🚀 Then run:');
console.log('   npm run dev    (for development)');
console.log('   npm run build  (for production)');