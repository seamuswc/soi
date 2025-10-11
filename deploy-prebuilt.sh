#!/bin/bash
# Deploy pre-built application to server
# This avoids building on the server which can timeout/run out of memory

set -euo pipefail

echo "🚀 SOI Pattaya - Pre-built Deployment"
echo "====================================="

# Configuration
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-soipattaya.com}"
APP_DIR="/var/www/soipattaya"

echo "📋 Configuration:"
echo "   Server: $SERVER_USER@$SERVER_HOST"
echo "   App Directory: $APP_DIR"
echo ""

# Build locally first
echo "🔨 Building application locally..."
npm run build

echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
  client/dist \
  server/dist \
  server/prisma \
  ecosystem.config.js \
  package.json \
  nginx.conf \
  setup-env.js \
  set-merchant.js \
  set-line.js \
  set-promo.js \
  check-promo.js \
  maintenance.js \
  backup-database.js \
  restore-database.js

echo "📤 Uploading to server..."
scp deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

echo "🔧 Deploying on server..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
set -e
cd /var/www/soipattaya

# Extract new files
echo "📦 Extracting files..."
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

# Restart with PM2
echo "🔄 Restarting application..."
pm2 restart soipattaya || pm2 start ecosystem.config.js

echo "✅ Deployment complete!"
ENDSSH

# Cleanup
rm deploy.tar.gz

echo ""
echo "✅ Pre-built deployment complete!"
echo "🌐 Check your site: https://soipattaya.com"
echo "📊 SSH in and run: pm2 status"
echo ""

