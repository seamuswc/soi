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
APP_DIR="/opt/soipattaya"

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
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
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
