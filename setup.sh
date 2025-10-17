#!/bin/bash
# SOI Pattaya - Complete Server Setup Script
# This script does a FULL AND COMPLETE server and site setup
# NO QUESTIONS, NO COMMANDS NEEDED AFTER

set -euo pipefail

echo "🚀 SOI Pattaya - Complete Server Setup"
echo "======================================"

# Configuration
DOMAIN="soipattaya.com"
APP_DIR="/var/www/soipattaya"
NGINX_CONFIG="/etc/nginx/sites-available/soipattaya"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   App Directory: $APP_DIR"
echo "   Nginx Config: $NGINX_CONFIG"
echo ""

# Update system
echo "🔄 Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install nginx
echo "🌐 Installing nginx..."
apt-get install -y nginx

# Install certbot for SSL
echo "🔒 Installing SSL tools..."
apt-get install -y certbot python3-certbot-nginx

# Create app directory
echo "📁 Creating app directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (if not already present)
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/seamuswc/soi.git .
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Setup environment files
echo "🔐 Setting up environment files..."
if [ ! -f ".env" ]; then
    echo "⚠️  Creating basic .env file..."
    cat > .env << EOF
# Database
DATABASE_URL="file:./server/database/database.sqlite"

# JWT
JWT_SECRET="$(openssl rand -base64 32)"

# Email (configure these)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@soipattaya.com"

# Vite Environment Variables
VITE_API_URL="https://soipattaya.com/api"
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

# Build application
echo "🔨 Building application..."
cd server && npm run build && cd ..
cd client && npm run build && cd ..

# Configure nginx
echo "🌐 Configuring nginx..."
cat > $NGINX_CONFIG << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static files
    location / {
        root $APP_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable nginx site
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Start nginx
systemctl enable nginx
systemctl start nginx

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup PM2
echo "🚀 Setting up PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup SSL auto-renewal
echo "🔄 Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "✅ Complete server setup finished!"
echo "🌐 App is running at: https://$DOMAIN"
echo "🔒 SSL certificate configured and auto-renewing"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
echo ""
echo "🎉 SOI Pattaya is fully set up and running!"
