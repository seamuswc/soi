#!/bin/bash
# SOI Pattaya - Production Deployment Script
# Usage: ./deploy.sh

set -euo pipefail

echo "🚀 SOI Pattaya - Production Deployment"
echo "======================================"

# Configuration
APP_DIR="/var/www/soipattaya"
DOMAIN="soipattaya.com"

echo "📋 Configuration:"
echo "   App Directory: $APP_DIR"
echo "   Domain: $DOMAIN"
echo ""

# Check if we're on the server
if [ ! -d "$APP_DIR" ]; then
    echo "❌ This script must be run on the server at $APP_DIR"
    echo "   For local deployment, use: ssh root@soipattaya.com 'cd /var/www/soipattaya && ./deploy.sh'"
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

echo "📥 Pulling latest changes..."
git pull origin main

echo "🔐 Setting up environment files..."
# Copy root .env to server for Prisma compatibility
cp .env server/.env || echo "⚠️  No root .env file found"
# Remove client .env to use root .env
rm -f client/.env

echo "📦 Installing/updating dependencies..."
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies  
cd server
npm install
cd ..

echo "🗄️ Updating database schema..."
cd server
npx prisma generate
npx prisma db push
cd ..

echo "🔨 Building application..."

# Build server
echo "   Building server..."
cd server
npm run build
cd ..

# Build client
echo "   Building client..."
cd client
npm run build
cd ..

echo "🚀 Restarting application..."
pm2 restart all

echo "✅ Deployment complete!"
echo "🌐 App is running at: https://$DOMAIN"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo ""
echo "🎉 SOI Pattaya is updated and running!"