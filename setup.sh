#!/bin/bash

# SOI Pattaya - Complete Server Setup Script
# This script sets up a complete production environment

set -e  # Exit on any error

# FORCE non-interactive mode for ALL operations
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFNEW=1
export UCF_FORCE_CONFFMISS=1
export APT_LISTCHANGES_FRONTEND=none
export APT_LISTBUGS_FRONTEND=none

# Configuration
# Accept multiple domains as space-separated args. First is primary.
if [ "$#" -eq 0 ]; then
    DOMAINS=("soipattaya.com")
else
    DOMAINS=("$@")
fi
PRIMARY_DOMAIN="${DOMAINS[0]}"
APP_DIR="/var/www/soipattaya"
NGINX_CONFIG="/etc/nginx/sites-available/soipattaya"

echo "🚀 SOI Pattaya - Complete Server Setup"
echo "======================================"
echo "📋 Configuration:"
echo "   Domains: ${DOMAINS[*]}"
echo "   App Directory: $APP_DIR"
echo "   Nginx Config: $NGINX_CONFIG"

# Update system packages
echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# Install required base packages (non-interactive)
echo "📦 Installing base packages (curl, git, build tools)..."
apt install -y curl git ca-certificates build-essential python3 make >/dev/null 2>&1 || apt install -y curl git ca-certificates build-essential python3 make

# Handle SSH configuration conflicts (NON-INTERACTIVE)
echo "🔧 Configuring SSH..."
if [ -f /etc/ssh/sshd_config ]; then
    # Backup current SSH config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    # Set default SSH config to avoid conflicts
    cat > /etc/ssh/sshd_config << EOF
Port 22
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF
    systemctl restart ssh
fi

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
# Remove any existing PM2 installation first
npm uninstall -g pm2 2>/dev/null || true
# Install PM2 fresh
npm install -g pm2@latest
# Ensure PM2 is properly installed
pm2 --version

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
VITE_API_URL="https://$PRIMARY_DOMAIN/api"
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
# Build server_name list including www aliases
SERVER_NAMES=""
for d in "${DOMAINS[@]}"; do
    SERVER_NAMES+="$d www.$d "
done
cat > $NGINX_CONFIG << EOF
server {
    listen 80;
    server_name $SERVER_NAMES;
    
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

"# Start application with PM2"
echo "🚀 Starting application..."
# Kill any existing PM2 processes
pm2 kill 2>/dev/null || true
# Start using ecosystem if present, otherwise fallback
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    if ! pm2 start "$APP_DIR/ecosystem.config.js"; then
        echo "⚠️  PM2 ecosystem start failed, falling back to direct start..."
        pm2 start "node server/dist/index.js" --name soipattaya --cwd "$APP_DIR"
    fi
else
    echo "ℹ️  No ecosystem.config.js found, starting app directly..."
    pm2 start "node server/dist/index.js" --name soipattaya --cwd "$APP_DIR"
fi
pm2 save
pm2 startup systemd -u root --hp /root

"# Wait for application to start"
echo "⏳ Waiting for application to start..."

# Retry helper (up to 30 attempts, 2s apart)
attempt=0
max_attempts=30
until pm2 list | grep -q "online.*soipattaya"; do
    attempt=$((attempt+1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "❌ Application failed to report online in PM2!"
        echo "📋 PM2 Status:"
        pm2 list
        echo "📋 PM2 Logs:"
        pm2 logs soipattaya --lines 50
        exit 1
    fi
    sleep 2
done

"# Test application"
echo "🧪 Testing application..."

# Backend health check with retries
attempt=0
until curl -sf "http://localhost:3001/api/config/merchant-addresses" > /dev/null; do
    attempt=$((attempt+1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "❌ Backend API not responding after retries!"
        exit 1
    fi
    sleep 2
done

# Frontend health check with retries
attempt=0
until curl -sf "http://localhost" | grep -q "SoiPattaya"; do
    attempt=$((attempt+1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "❌ Frontend not responding after retries!"
        exit 1
    fi
    sleep 2
done

echo "✅ Application is running successfully!"

# Setup SSL for all non-IP domains provided
NON_IP_DOMAINS=()
for d in "${DOMAINS[@]}"; do
    if [[ ! $d =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        NON_IP_DOMAINS+=("$d")
    fi
done

if [ ${#NON_IP_DOMAINS[@]} -eq 0 ]; then
    echo "ℹ️  Only IP(s) provided - skipping SSL setup"
    echo "🌐 Site is available at: http://${DOMAINS[0]}"
else
    echo "🔒 Setting up SSL certificates for: ${NON_IP_DOMAINS[*]} ..."
    CERTBOT_ARGS=(--nginx --non-interactive --agree-tos --email admin@"$PRIMARY_DOMAIN")
    for d in "${NON_IP_DOMAINS[@]}"; do
        CERTBOT_ARGS+=( -d "$d" -d "www.$d" )
    done
    if certbot "${CERTBOT_ARGS[@]}"; then
        echo "✅ SSL certificate(s) installed successfully!"
        echo "🌐 Primary site: https://$PRIMARY_DOMAIN"
    else
        echo "⚠️  SSL setup failed, but site is available at: http://$PRIMARY_DOMAIN"
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