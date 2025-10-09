#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load Prisma from server directory
const { PrismaClient } = require(path.join(__dirname, 'server', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function restoreDatabase(backupFile) {
  try {
    console.log('🔄 Starting database restore...');
    
    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }
    
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    console.log(`📦 Restoring from backup created: ${backupData.timestamp}`);
    console.log(`📊 Found ${backupData.total_listings} listings and ${backupData.total_promos} promos`);
    
    // Clear existing data (optional - comment out if you want to merge)
    console.log('🗑️  Clearing existing data...');
    await prisma.listing.deleteMany();
    await prisma.promo.deleteMany();
    
    // Restore listings
    if (backupData.listings && backupData.listings.length > 0) {
      console.log(`📝 Restoring ${backupData.listings.length} listings...`);
      
      for (const listing of backupData.listings) {
        await prisma.listing.create({
          data: {
            building_name: listing.building_name,
            latitude: listing.latitude,
            longitude: listing.longitude,
            floor: listing.floor,
            sqm: listing.sqm,
            cost: listing.cost,
            description: listing.description,
            youtube_link: listing.youtube_link,
            reference: listing.reference,
            payment_network: listing.payment_network,
            thai_only: listing.thai_only,
            has_pool: listing.has_pool,
            has_parking: listing.has_parking,
            is_top_floor: listing.is_top_floor,
            six_months: listing.six_months,
            expires_at: new Date(listing.expires_at),
            created_at: new Date(listing.created_at),
            updated_at: new Date(listing.updated_at)
          }
        });
      }
      console.log('✅ Listings restored successfully');
    }
    
    // Restore promos
    if (backupData.promos && backupData.promos.length > 0) {
      console.log(`🎟️  Restoring ${backupData.promos.length} promos...`);
      
      for (const promo of backupData.promos) {
        await prisma.promo.create({
          data: {
            code: promo.code,
            remaining_uses: promo.remaining_uses,
            created_at: new Date(promo.created_at),
            updated_at: new Date(promo.updated_at)
          }
        });
      }
      console.log('✅ Promos restored successfully');
    }
    
    console.log('🎉 Database restore completed successfully!');
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide backup file path');
  console.log('Usage: node restore-database.js <backup-file-path>');
  console.log('Example: node restore-database.js backups/latest-backup.json');
  process.exit(1);
}

restoreDatabase(backupFile);
