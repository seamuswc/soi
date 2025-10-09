#!/bin/bash
# One-liner deployment for SOI Pattaya
# Usage: curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash

set -euo pipefail

echo "🚀 SOI Pattaya - One-Liner Deployment"
echo "===================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

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

# Set non-interactive mode to avoid SSH config conflicts
export DEBIAN_FRONTEND=noninteractive

# Pre-configure SSH to keep local version (prevents SSH connection loss)
echo "openssh-server openssh-server/sshd_config_keep_local boolean true" | debconf-set-selections

echo "📦 Updating package lists..."
apt-get update -yq

echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "📦 Installing PM2 and Nginx..."
npm install -g npm pm2@latest
apt-get -o Dpkg::Options::="--force-confold" install -yq nginx git

# Clone or update repository
echo "📥 Setting up application..."
if [ -d "$APP_DIR" ]; then
    echo "   Updating existing repository..."
    cd $APP_DIR
    git pull
else
    echo "   Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f package-lock.json ]; then npm ci; else npm install; fi
cd client && if [ -f package-lock.json ]; then npm ci; else npm install; fi && cd ..
cd server && if [ -f package-lock.json ]; then npm ci; else npm install; fi && cd ..

# Setup environment variables
echo "⚙️ Setting up environment variables..."
npm run setup

# Copy .env to server directory for Prisma
echo "📋 Copying environment variables to server..."
cp $APP_DIR/.env $APP_DIR/server/.env || true

# Ensure Vite envs are present for client build
echo "🔐 Syncing VITE_* vars to client/.env"
grep -E '^VITE_[A-Z0-9_]+' $APP_DIR/.env > $APP_DIR/client/.env || true

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma db push
cd ..

# Build application
echo "🔨 Building application..."
npm run build

# Configure Nginx
echo "🌐 Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/$SITE_NAME
sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN www.$DOMAIN|" /etc/nginx/sites-available/$SITE_NAME
sed -i "s|APP_DIR_PLACEHOLDER|$APP_DIR|" /etc/nginx/sites-available/$SITE_NAME

# Enable site
ln -sf /etc/nginx/sites-available/$SITE_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup firewall (non-interactive)
echo "🔥 Configuring firewall..."
ufw allow 22 || true
ufw allow 80 || true
ufw allow 443 || true
ufw --force enable || true

# Install SSL with Certbot (non-interactive)
echo "🔒 Installing SSL certificate..."
apt-get -o Dpkg::Options::="--force-confold" install -yq certbot python3-certbot-nginx

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is running at: https://$DOMAIN"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo "🔧 Edit config: nano $APP_DIR/.env"
echo ""
echo "🎉 SOI Pattaya is now live with SSL!"
