#!/bin/bash

echo "🚀 SOI Pattaya - Bulletproof Deployment"
echo "======================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Configuration
REPO_URL="https://github.com/seamuswc/soipattaya_JS.git"
APP_DIR="/opt/soipattaya"
DOMAIN="soipattaya.com"

echo "📋 Configuration:"
echo "   Repository: $REPO_URL"
echo "   App Directory: $APP_DIR"
echo "   Domain: $DOMAIN"
echo ""

# Update system
echo "🔄 Updating system..."
apt update -y
apt upgrade -y

# Install Node.js (LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Stop any existing services
echo "🛑 Stopping existing services..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

# Remove existing app directory
echo "🗑️ Cleaning up existing installation..."
rm -rf $APP_DIR

# Clone repository
echo "📥 Cloning repository..."
git clone $REPO_URL $APP_DIR
cd $APP_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Create .env file
echo "⚙️ Creating environment file..."
cat > .env << EOF
# SOI Pattaya Environment
DATABASE_URL="file:$APP_DIR/server/database.sqlite"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="soipattaya2024"
ADMIN_TOKEN="admin_token_12345"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
SOLANA_MERCHANT_ADDRESS="your_solana_address_here"
APTOS_MERCHANT_ADDRESS="your_aptos_address_here"
SUI_MERCHANT_ADDRESS="your_sui_address_here"
NODE_ENV="production"
PORT=3000
SITE_DOMAIN="soipattaya.com"
EOF

# Create client .env
echo "⚙️ Creating client environment file..."
cat > client/.env << EOF
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
EOF

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma db push --force-reset
cd ..

# Build application
echo "🔨 Building application..."
npm run build

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/soipattaya << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        root $APP_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
systemctl reload nginx

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app should be running at: http://$DOMAIN"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo "🔧 Edit config: nano $APP_DIR/.env"
echo ""
echo "🎉 SOI Pattaya is now live!"
echo ""
echo "⚠️  IMPORTANT: Edit the .env file with your actual values:"
echo "   nano $APP_DIR/.env"
echo ""
echo "🔑 Default admin credentials:"
echo "   Username: admin"
echo "   Password: soipattaya2024"
