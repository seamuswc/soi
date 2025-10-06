#!/bin/bash

echo "🚀 SOI Pattaya - One-Command Deployment"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Configuration
REPO_URL="https://github.com/seamuswc/soipattaya_JS.git"
APP_DIR="/var/www/soipattaya"
DOMAIN="soipattaya.com" # Your actual domain
SITE_NAME="soipattaya"

echo "📋 Configuration:"
echo "   Repository: $REPO_URL"
echo "   App Directory: $APP_DIR"
echo "   Domain: $DOMAIN"
echo ""

# Update system
echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js using package manager
echo "📦 Installing Node.js..."

# Try different package managers
if command -v apt &> /dev/null; then
    # Ubuntu/Debian - use NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
elif command -v yum &> /dev/null; then
    # CentOS/RHEL - use NodeSource repository
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
elif command -v dnf &> /dev/null; then
    # Fedora - use NodeSource repository
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    dnf install -y nodejs
elif command -v pacman &> /dev/null; then
    # Arch Linux
    pacman -S --noconfirm nodejs npm
elif command -v brew &> /dev/null; then
    # macOS
    brew install node
else
    # Fallback to nvm
    echo "Using nvm as fallback..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 18
    nvm use 18
    nvm alias default 18
fi

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install Git if not present
echo "📦 Installing Git..."
apt install -y git

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
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Setup environment variables
echo "⚙️ Setting up environment variables..."
npm run setup
echo ""
echo "⚠️  IMPORTANT: Please edit the .env file with your actual values:"
echo "   nano $APP_DIR/.env"
echo ""
read -p "Press Enter after you have updated the .env file..."

# Copy .env to server directory for Prisma
echo "📋 Copying environment variables to server..."
cp $APP_DIR/.env $APP_DIR/server/.env

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

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Install SSL with Certbot
echo "🔒 Installing SSL certificate..."
apt install -y certbot python3-certbot-nginx

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