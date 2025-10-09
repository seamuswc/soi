#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load Prisma from server directory
const { PrismaClient } = require(path.join(__dirname, 'server', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    console.log('📦 Starting database backup...');
    
    // Get all listings
    const listings = await prisma.listing.findMany({
      orderBy: { created_at: 'asc' }
    });
    
    // Get all promos
    const promos = await prisma.promo.findMany({
      orderBy: { created_at: 'asc' }
    });
    
    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      listings: listings,
      promos: promos,
      total_listings: listings.length,
      total_promos: promos.length
    };
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soipattaya-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup created successfully: ${filename}`);
    console.log(`📊 Backed up ${listings.length} listings and ${promos.length} promos`);
    console.log(`📁 Backup location: ${filepath}`);
    
    // Also create a latest backup
    const latestPath = path.join(backupDir, 'latest-backup.json');
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));
    console.log(`📁 Latest backup: ${latestPath}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
