#!/bin/bash
# SOI Pattaya - Update Script
# Pulls new git code, updates server, updates packages, etc.

set -euo pipefail

echo "🔄 SOI Pattaya - Server Update"
echo "=============================="

# Configuration
APP_DIR="/var/www/soipattaya"

# Navigate to app directory
cd $APP_DIR

echo "📥 Pulling latest changes from git..."
git pull origin main

echo "📦 Updating dependencies..."
# Update root dependencies
npm install

# Update client dependencies
cd client
npm install
cd ..

# Update server dependencies
cd server
npm install
cd ..

echo "🗄️ Updating database schema..."
cd server
npx prisma generate
npx prisma db push
cd ..

echo "🔨 Rebuilding application..."
# Build server
cd server
npm run build
cd ..

# Build client
cd client
npm run build
cd ..

echo "🚀 Restarting application..."
pm2 restart soipattaya

echo "🔒 Renewing SSL certificate..."
certbot renew --quiet

echo "✅ Update complete!"
echo "🌐 App is running at: https://soipattaya.com"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
