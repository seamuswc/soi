#!/bin/bash

# SOI Pattaya - Complete Server Setup Script
# This script sets up a complete production environment

set -e  # Exit on any error

# Configuration
DOMAIN=${1:-"soipattaya.com"}
APP_DIR="/var/www/soipattaya"
NGINX_CONFIG="/etc/nginx/sites-available/soipattaya"

echo "🚀 SOI Pattaya - Complete Server Setup"
echo "======================================"
echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   App Directory: $APP_DIR"
echo "   Nginx Config: $NGINX_CONFIG"

# Update system packages
echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install nginx
echo "🌐 Installing nginx..."
apt install -y nginx

# Install SSL tools
echo "🔒 Installing SSL tools..."
apt install -y certbot python3-certbot-nginx

# Create app directory
echo "📁 Creating app directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Pull latest code
echo "📥 Pulling latest code..."
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/seamuswc/soi.git .
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Setup environment files
echo "🔐 Setting up environment files..."
if [ ! -f ".env" ]; then
cat > .env << EOF
# Database
DATABASE_URL="file:./server/database/database.sqlite"

# Server
PORT=3001
NODE_ENV=production

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_MERCHANT_ADDRESS="YOUR_ACTUAL_SOLANA_WALLET_ADDRESS_HERE"

# Email (Tencent SES)
TENCENT_SES_SECRET_ID=""
TENCENT_SES_SECRET_KEY=""
TENCENT_SES_REGION="ap-singapore"
TENCENT_SES_TEMPLATE_ID_PROMO="66912"
TENCENT_SES_TEMPLATE_ID_DATA="66908"
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@soipattaya.com"

# Vite Environment Variables
VITE_API_URL="https://$DOMAIN/api"
VITE_APP_NAME="SOI Pattaya"
EOF
fi

# Copy server .env
cp .env server/.env

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma generate
npx prisma db push
cd ..

# Build application with error checking
echo "🔨 Building application..."
echo "Building server..."
cd server
if ! npm run build; then
    echo "❌ Server build failed!"
    exit 1
fi
cd ..

echo "Building client..."
cd client
if ! npm run build; then
    echo "❌ Client build failed!"
    exit 1
fi
cd ..

# Configure nginx (HTTP only first)
echo "🌐 Configuring nginx..."
cat > $NGINX_CONFIG << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location / {
        root $APP_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
if ! nginx -t; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Reload nginx
systemctl reload nginx

# Start application with PM2
echo "🚀 Starting application..."
pm2 delete soipattaya 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Check if application is running
if ! pm2 list | grep -q "online.*soipattaya"; then
    echo "❌ Application failed to start!"
    pm2 logs soipattaya --lines 20
    exit 1
fi

# Test application
echo "🧪 Testing application..."
if ! curl -s "http://localhost:3001/api/config/merchant-addresses" > /dev/null; then
    echo "❌ Backend API not responding!"
    exit 1
fi

if ! curl -s "http://localhost" | grep -q "SoiPattaya"; then
    echo "❌ Frontend not responding!"
    exit 1
fi

echo "✅ Application is running successfully!"

# Setup SSL if domain is provided and not an IP
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ℹ️  IP address detected - skipping SSL setup"
    echo "🌐 Site is available at: http://$DOMAIN"
else
    echo "🔒 Setting up SSL certificate..."
    if certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
        echo "✅ SSL certificate installed successfully!"
        echo "🌐 Site is available at: https://$DOMAIN"
    else
        echo "⚠️  SSL setup failed, but site is available at: http://$DOMAIN"
    fi
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Your site is now live!"
echo "📝 Next steps:"
echo "   1. Update environment variables in $APP_DIR/.env"
echo "   2. Configure your Solana merchant address"
echo "   3. Set up email credentials for Tencent SES"
echo "   4. Test all functionality"