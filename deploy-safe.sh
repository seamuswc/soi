#!/bin/bash

echo "🚀 SOI Pattaya - Safe Deployment (No Server Config Changes)"
echo "=========================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Configuration
REPO_URL="https://github.com/seamuswc/soipattaya_JS.git"
APP_DIR="/var/www/soipattaya"

echo "📋 Configuration:"
echo "   Repository: $REPO_URL"
echo "   App Directory: $APP_DIR"
echo "   ⚠️  SAFE MODE: Will NOT modify existing server configurations"
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
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
elif command -v dnf &> /dev/null; then
    # Fedora - use NodeSource repository
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
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
    nvm install 20
    nvm use 20
    nvm alias default 20
fi

# Update npm and install latest PM2
echo "📦 Updating npm and installing PM2..."
npm install -g npm pm2@latest

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
if [ -f package-lock.json ]; then npm ci; else npm install; fi
cd client && if [ -f package-lock.json ]; then npm ci; else npm install; fi && cd ..
cd server && if [ -f package-lock.json ]; then npm ci; else npm install; fi && cd ..

# Setup environment variables
echo "⚙️ Setting up environment variables..."
npm run setup
echo ""
echo "⚠️  IMPORTANT: Please edit the .env file with your actual values:"
echo "   nano $APP_DIR/.env"
echo ""
read -p "Press Enter after you have updated the .env file..."

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

echo ""
echo "✅ Application setup complete!"
echo "📁 App installed at: $APP_DIR"
echo "🔧 Edit config: nano $APP_DIR/.env"
echo ""
echo "🚀 To start the application:"
echo "   cd $APP_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "🌐 To configure Nginx (manual):"
echo "   1. Copy nginx.conf to your sites-available"
echo "   2. Update domain and paths as needed"
echo "   3. Enable the site and reload nginx"
echo ""
echo "⚠️  SAFE MODE: No server configurations were modified!"
