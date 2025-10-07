#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage: npm run promo <code> <max_uses>');
  console.log('📝 Example: npm run promo "WELCOME20" 100');
  process.exit(1);
}

const promoCode = args[0];
const maxUses = args[1];

// Validate maxUses is a number
if (isNaN(maxUses) || parseInt(maxUses) < 0) {
  console.log('❌ Max uses must be a positive number');
  process.exit(1);
}

console.log('🎟️  Setting Promo Code');
console.log('=====================');
console.log(`Code: ${promoCode}`);
console.log(`Max Uses: ${maxUses}`);
console.log('');

// Read existing .env file or create new one
let envContent = '';
const envPath = '.env';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  // Create default .env content if file doesn't exist
  envContent = `# SOI Pattaya Environment
DATABASE_URL="file:/var/www/soipattaya/server/database.sqlite"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="poop"
ADMIN_TOKEN="admin_token_12345"
VITE_GOOGLE_MAPS_API_KEY="AIzaSyBVdAS-3mrNYARIDmqn2dP1tG1Khqv5GoM"
SOLANA_MERCHANT_ADDRESS="your_solana_address_here"
APTOS_MERCHANT_ADDRESS="your_aptos_address_here"
SUI_MERCHANT_ADDRESS="your_sui_address_here"
NODE_ENV="production"
PORT=3000
SITE_DOMAIN="soipattaya.com"
`;
}

// Update or add PROMO_CODE and PROMO_MAX_USES
const lines = envContent.split('\n');
let promoCodeFound = false;
let promoMaxUsesFound = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('PROMO_CODE=')) {
    lines[i] = `PROMO_CODE="${promoCode}"`;
    promoCodeFound = true;
  }
  if (lines[i].startsWith('PROMO_MAX_USES=')) {
    lines[i] = `PROMO_MAX_USES="${maxUses}"`;
    promoMaxUsesFound = true;
  }
}

// Add lines if they don't exist
if (!promoCodeFound) {
  lines.push(`PROMO_CODE="${promoCode}"`);
}
if (!promoMaxUsesFound) {
  lines.push(`PROMO_MAX_USES="${maxUses}"`);
}

// Write updated .env file
const updatedContent = lines.join('\n');
fs.writeFileSync(envPath, updatedContent);

console.log('✅ Promo code updated successfully!');
console.log(`📁 Updated: ${envPath}`);
console.log('');
console.log('🔄 Restart your server to apply changes:');
console.log('   npm run dev    (for development)');
console.log('   npm run start  (for production)');
