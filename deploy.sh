#!/bin/bash
# SOI Pattaya - Production Deployment Script
# Usage: ./deploy.sh [--force-build] [--local-build]
#   --force-build: Force rebuild even if dist exists (for server restarts)
#   --local-build: Build locally and upload compiled files (faster for quick fixes)

set -euo pipefail

FORCE_BUILD=false
LOCAL_BUILD=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --force-build)
            FORCE_BUILD=true
            ;;
        --local-build)
            LOCAL_BUILD=true
            ;;
    esac
done

echo "🚀 SOI Pattaya - Production Deployment"
echo "======================================"

# Configuration
APP_DIR="/var/www/soipattaya"
DOMAIN="soipattaya.com"

echo "📋 Configuration:"
echo "   App Directory: $APP_DIR"
echo "   Domain: $DOMAIN"
echo "   Force Build: $FORCE_BUILD"
echo "   Local Build: $LOCAL_BUILD"
echo ""

# Local build mode - compile locally and upload
if [ "$LOCAL_BUILD" = true ]; then
    echo "🏗️  Local Build Mode - Compiling locally..."
    
    # Don't touch client/.env - keep existing API keys
    echo "   Preserving existing client/.env (API keys safe)..."
    
    # Build server locally
    echo "   Building server locally..."
    cd server
    npm run build
    cd ..
    
    # Build client locally  
    echo "   Building client locally..."
    cd client
    npm run build
    cd ..
    
    # Upload compiled files to server
    echo "📤 Uploading compiled files to server..."
    scp -r server/dist root@soipattaya.com:/var/www/soipattaya/server/
    scp -r client/dist/* root@soipattaya.com:/var/www/soipattaya/client/dist/
    
    # Restart application on server
    echo "🚀 Restarting application on server..."
    ssh root@soipattaya.com 'cd /var/www/soipattaya && pm2 restart all'
    
    echo "✅ Local build deployment complete!"
    echo "🌐 App is running at: https://$DOMAIN"
    exit 0
fi

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
# Only copy server .env if it doesn't exist (preserve API keys)
if [ ! -f "server/.env" ]; then
    cp .env server/.env || echo "⚠️  No root .env file found"
else
    echo "   Using existing server/.env..."
fi

# NEVER touch client/.env - API keys are managed via settings tab
echo "   Preserving client/.env (API keys managed via settings tab)..."

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

# Build logic: only build if missing or force requested
if [ "$FORCE_BUILD" = true ] || [ ! -d "server/dist" ] || [ -z "$(ls -A server/dist)" ]; then
    echo "   Building server..."
    cd server
    npm run build
    cd ..
else
    echo "   Server already built, skipping..."
fi

if [ "$FORCE_BUILD" = true ] || [ ! -d "client/dist" ] || [ -z "$(ls -A client/dist)" ]; then
    echo "   Building client..."
    cd client
    npm run build
    cd ..
else
    echo "   Client already built, skipping..."
fi

echo "🚀 Restarting application..."
pm2 restart all

echo "✅ Deployment complete!"
echo "🌐 App is running at: https://$DOMAIN"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo ""
echo "🎉 SOI Pattaya is updated and running!"