#!/bin/bash
# Local build and deploy for SOI Pattaya
# Builds locally, then pushes to server

set -euo pipefail

echo "🚀 SOI Pattaya - Local Build & Deploy"
echo "===================================="

# Configuration
REPO_URL="https://github.com/seamuswc/soipattaya_JS.git"
APP_DIR="/var/www/soipattaya"
DOMAIN="soipattaya.com"
SITE_NAME="soipattaya"

echo "📋 Configuration:"
echo "   Repository: $REPO_URL"
echo "   App Directory: $APP_DIR"
echo "   Domain: $DOMAIN"
echo ""

# Build locally first
echo "🔨 Building application locally..."
echo "   Building client..."
cd /Users/seamus/Desktop/soipattaya_JS/client
npm install
npm run build
cd /Users/seamus/Desktop/soipattaya_JS

echo "   Building server..."
cd /Users/seamus/Desktop/soipattaya_JS/server
npm install
npm run build
cd /Users/seamus/Desktop/soipattaya_JS

echo "✅ Local build complete!"

# Commit and push changes
echo "📤 Committing and pushing changes..."
git add .
git commit -m "Deploy: $(date)" || true
git push origin main

echo "🚀 Deploying to server..."

# Deploy to server using the main deploy script
ssh root@soipattaya.com "
    echo '📥 Updating repository on server...'
    cd $APP_DIR
    git pull origin main
    
    echo '🚀 Running full deployment...'
    ./deploy.sh
    
    echo '✅ Server deployment complete!'
"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is running at: https://$DOMAIN"
echo "📊 Check status: ssh root@soipattaya.com 'pm2 status'"
echo "📝 View logs: ssh root@soipattaya.com 'pm2 logs soipattaya'"
echo ""
echo "🎉 SOI Pattaya is now live!"