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

# Use single .env file for all processes (more secure)
echo "🔐 Using single .env file for security..."
# Remove duplicate .env files to prevent confusion and security risks
rm -f $APP_DIR/server/.env $APP_DIR/client/.env

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma db push
cd ..

# Check available memory and add swap if needed
echo "💾 Checking system memory..."
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 3000 ]; then
    echo "⚠️  Low memory detected ($TOTAL_MEM MB). Adding swap space..."
    if [ ! -f /swapfile ]; then
        dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        echo "✅ 4GB swap added"
    else
        echo "   Swap file already exists"
        swapon /swapfile 2>/dev/null || true
    fi
fi

# Build application
echo "🔨 Building application (this may take 2-3 minutes)..."
echo "   Tip: If this times out, use the pre-built deployment script instead"

# Clean and rebuild server to ensure latest code
echo "🧹 Cleaning server build..."
rm -rf server/node_modules server/dist
cd server
npm install
npx prisma generate
npx prisma db push --force-reset
npm run build
cd ..

# Build client
cd client
npm run build
cd ..

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

# Install SSL with Certbot
echo "🔒 Installing Certbot for SSL..."
apt-get -o Dpkg::Options::="--force-confold" install -yq certbot python3-certbot-nginx

# Backup SSH config before SSL setup
echo "🛡️  Backing up SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Get SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
if certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
    echo "✅ SSL certificate installed successfully"
else
    echo "⚠️  SSL certificate installation failed (non-fatal)"
    echo "📝 You can run SSL setup manually later: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# Ensure SSH config wasn't changed by certbot
echo "🔒 Verifying SSH configuration..."
if ! grep -q "^PubkeyAuthentication yes" /etc/ssh/sshd_config; then
    echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
fi
if ! grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config; then
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
fi

# Restart SSH safely
echo "🔄 Reloading SSH service..."
systemctl reload sshd || true

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is running at: https://$DOMAIN"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo "🔧 Edit config: nano $APP_DIR/.env"
echo ""
echo "🎉 SOI Pattaya is now live with SSL!"
