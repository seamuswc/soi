#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🎟️  SOI Pattaya - Promo Usage Check');
console.log('====================================\n');

async function checkPromos() {
  try {
    // Get all promo codes from database
    const promos = await prisma.promo.findMany({
      orderBy: {
        updated_at: 'desc'
      }
    });
    
    if (promos.length === 0) {
      console.log('📊 No promo codes found in database');
      console.log('💡 Set a promo code with: npm run promo "CODE" 100');
      return;
    }
    
    console.log('📊 Promo Usage Summary:');
    console.log('======================');
    
    for (const promo of promos) {
      console.log(`\n🎟️  Code: ${promo.code}`);
      console.log(`   Remaining: ${promo.remaining_uses} uses`);
      console.log(`   Created: ${promo.created_at.toISOString()}`);
      console.log(`   Last Updated: ${promo.updated_at.toISOString()}`);
    }
    
    console.log('\n💡 Commands:');
    console.log('   npm run promo "NEWCODE" 50  - Set new promo');
    console.log('   npm run promo "CODE" 0      - Disable promo');
    
  } catch (error) {
    console.log('❌ Error checking promo usage:');
    console.log(`   ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkPromos();
