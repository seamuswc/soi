#!/usr/bin/env node

const path = require('path');

// Load Prisma from server directory
const { PrismaClient } = require(path.join(__dirname, 'server', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

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

async function setPromo() {
  try {
    // Create or update promo code in database
    const promo = await prisma.promo.upsert({
      where: { code: promoCode.toLowerCase() },
      update: { remaining_uses: parseInt(maxUses) },
      create: { 
        code: promoCode.toLowerCase(), 
        remaining_uses: parseInt(maxUses) 
      }
    });

    console.log('✅ Promo code configured successfully!');
    console.log(`📋 Code: ${promoCode}`);
    console.log(`🔢 Remaining uses: ${promo.remaining_uses}`);
    console.log('');
    console.log('🎉 Promo is active immediately - NO restart needed!');
    
  } catch (error) {
    console.error('❌ Error setting promo:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setPromo();
