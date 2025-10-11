#!/bin/bash
# Complete deployment from local machine (builds locally, deploys remotely)
# Usage: ./deploy-local.sh [user@]hostname

set -euo pipefail

echo "🚀 SOI Pattaya - Local Build + Remote Deploy"
echo "============================================="

# Configuration
SERVER="${1:-root@soipattaya.com}"
DOMAIN="soipattaya.com"
APP_DIR="/var/www/soipattaya"
REPO_URL="https://github.com/seamuswc/soipattaya_JS.git"

echo "📋 Configuration:"
echo "   Server: $SERVER"
echo "   Domain: $DOMAIN"
echo "   App Directory: $APP_DIR"
echo ""

# Build locally
echo "🔨 Building application locally (fast!)..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
npm run build

echo "✅ Local build complete!"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf /tmp/soipattaya-deploy.tar.gz \
  client/dist \
  server/dist \
  server/prisma \
  ecosystem.config.js \
  package.json \
  nginx.conf \
  setup-env.js \
  set-merchant.js \
  set-line.js \
  set-promo.js \
  check-promo.js \
  maintenance.js \
  backup-database.js \
  restore-database.js

# Setup and deploy on server
echo "🚀 Deploying to server..."
ssh $SERVER bash -s << ENDSSH
set -euo pipefail

echo "📦 Setting up server..."

# Set non-interactive mode
export DEBIAN_FRONTEND=noninteractive

# Install prerequisites
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    apt-get update -yq
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2@latest
fi

if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt-get -o Dpkg::Options::="--force-confold" install -yq nginx git
fi

# Clone repo if it doesn't exist (for config files and structure)
if [ ! -d "$APP_DIR" ]; then
    echo "📥 Cloning repository..."
    git clone $REPO_URL $APP_DIR
fi

cd $APP_DIR

# Setup environment if .env doesn't exist
if [ ! -f .env ]; then
    echo "⚙️ Setting up environment..."
    npm install
    npm run setup
    cp .env server/.env || true
fi

echo "✅ Server prerequisites ready"
ENDSSH

# Upload built files
echo "📤 Uploading built application..."
scp /tmp/soipattaya-deploy.tar.gz $SERVER:/tmp/

# Extract and configure
ssh $SERVER bash -s << 'ENDSSH'
set -euo pipefail

cd /var/www/soipattaya

echo "📦 Extracting application..."
tar -xzf /tmp/soipattaya-deploy.tar.gz
rm /tmp/soipattaya-deploy.tar.gz

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma db push
cd ..

# Configure Nginx if not already done
if [ ! -f /etc/nginx/sites-available/soipattaya ]; then
    echo "🌐 Configuring Nginx..."
    cp nginx.conf /etc/nginx/sites-available/soipattaya
    sed -i "s|DOMAIN_PLACEHOLDER|soipattaya.com www.soipattaya.com|" /etc/nginx/sites-available/soipattaya
    sed -i "s|APP_DIR_PLACEHOLDER|/var/www/soipattaya|" /etc/nginx/sites-available/soipattaya
    ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
fi

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow 22 || true
ufw allow 80 || true
ufw allow 443 || true
ufw --force enable || true

# Start/restart with PM2
echo "🚀 Starting application..."
if pm2 restart soipattaya 2>/dev/null; then
    echo "   Restarted existing process"
else
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
fi

echo "✅ Application deployed!"
ENDSSH

# Setup SSL (one-time)
echo "🔒 Setting up SSL certificate..."
ssh $SERVER bash -s << 'ENDSSH'
if ! certbot certificates 2>/dev/null | grep -q "soipattaya.com"; then
    echo "📦 Installing Certbot..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get -o Dpkg::Options::="--force-confold" install -yq certbot python3-certbot-nginx
    
    echo "🔒 Obtaining SSL certificate..."
    if certbot --nginx -d soipattaya.com -d www.soipattaya.com --non-interactive --agree-tos --email admin@soipattaya.com; then
        echo "✅ SSL certificate installed"
    else
        echo "⚠️  SSL setup skipped (run manually: sudo certbot --nginx -d soipattaya.com -d www.soipattaya.com)"
    fi
else
    echo "✅ SSL certificate already exists"
fi
ENDSSH

# Cleanup
rm /tmp/soipattaya-deploy.tar.gz

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app: https://$DOMAIN"
echo "📊 Check status: ssh $SERVER 'pm2 status'"
echo "📝 View logs: ssh $SERVER 'pm2 logs soipattaya'"
echo ""
echo "🎉 SOI Pattaya is live!"
ENDSSH

