#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎟️  SOI Pattaya - Promo Usage Check');
console.log('====================================\n');

// Find database file
const possiblePaths = [
  './server/database/database.sqlite',
  './server/database.sqlite', 
  '/var/www/soipattaya/server/database.sqlite',
  '/var/www/soipattaya/server/database/database.sqlite'
];

let dbPath = null;
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    dbPath = path;
    break;
  }
}

if (!dbPath) {
  console.log('❌ Database not found. Tried paths:');
  possiblePaths.forEach(p => console.log(`   - ${p}`));
  process.exit(1);
}

console.log(`📁 Database: ${dbPath}\n`);

try {
  // Check if sqlite3 is available
  execSync('which sqlite3', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ sqlite3 not found. Install with:');
  console.log('   Ubuntu/Debian: sudo apt install sqlite3');
  console.log('   macOS: brew install sqlite3');
  process.exit(1);
}

try {
  // Get promo data
  const query = `
    SELECT 
      code,
      remaining_uses,
      created_at,
      updated_at
    FROM Promo 
    ORDER BY updated_at DESC;
  `;
  
  const result = execSync(`sqlite3 "${dbPath}" "${query}"`, { encoding: 'utf8' });
  
  if (!result.trim()) {
    console.log('📊 No promo codes found in database');
    console.log('💡 Set a promo code with: npm run promo "CODE" 100');
    process.exit(0);
  }
  
  const lines = result.trim().split('\n');
  
  console.log('📊 Promo Usage Summary:');
  console.log('======================');
  
  lines.forEach(line => {
    const [code, remaining, created, updated] = line.split('|');
    
    // Try to get configured max uses from environment
    let maxUses = 'Unknown';
    try {
      const envFile = fs.readFileSync('.env', 'utf8');
      const match = envFile.match(/PROMO_MAX_USES="?(\d+)"?/);
      if (match) {
        maxUses = parseInt(match[1]);
      }
    } catch (e) {
      // Ignore if .env not found
    }
    
    const used = maxUses !== 'Unknown' ? maxUses - parseInt(remaining) : 'Unknown';
    
    console.log(`\n🎟️  Code: ${code}`);
    console.log(`   Remaining: ${remaining} uses`);
    if (maxUses !== 'Unknown') {
      console.log(`   Used: ${used} / ${maxUses} uses`);
      console.log(`   Usage: ${Math.round((used / maxUses) * 100)}%`);
    }
    console.log(`   Created: ${created}`);
    console.log(`   Last Used: ${updated}`);
  });
  
  console.log('\n💡 Commands:');
  console.log('   npm run promo "NEWCODE" 50  - Set new promo');
  console.log('   npm run promo "CODE" 0      - Disable promo');
  
} catch (error) {
  console.log('❌ Error checking promo usage:');
  console.log(`   ${error.message}`);
  process.exit(1);
}
