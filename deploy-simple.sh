#!/bin/bash
# Simple SSH Deployment Script for SOI Pattaya

set -e

# Configuration
SERVER_IP="178.128.95.2"
APP_DIR="/var/www/soipattaya"

echo "🚀 SOI Pattaya - Simple SSH Deployment"
echo "======================================"
echo "📋 Server: $SERVER_IP"
echo "📋 App Directory: $APP_DIR"

# Step 1: Copy files to server
echo "📁 Copying files to server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    ./ root@$SERVER_IP:$APP_DIR/

# Step 2: Run setup commands on server
echo "🔧 Setting up server..."
ssh root@$SERVER_IP << 'EOF'
set -e

# Set non-interactive mode
export DEBIAN_FRONTEND=noninteractive

# Update system
apt update && apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi

# Navigate to app directory
cd /var/www/soipattaya

# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Build application
cd server && npm run build && cd ..
cd client && npm run build && cd ..

# Setup database
cd server && npx prisma generate && npx prisma db push && cd ..

# Configure Nginx
cat > /etc/nginx/sites-available/soipattaya << 'NGINX_EOF'
server {
    listen 80;
    server_name 178.128.95.2;
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /var/www/soipattaya/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start application
pm2 kill 2>/dev/null || true
pm2 start "npm start" --name soipattaya --cwd /var/www/soipattaya/server
pm2 save
pm2 startup systemd -u root --hp /root

# Wait and check
sleep 5
if pm2 list | grep -q "online.*soipattaya"; then
    echo "✅ Application started successfully!"
    pm2 list
else
    echo "❌ Application failed to start!"
    pm2 logs soipattaya --lines 10
    exit 1
fi
EOF

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: http://$SERVER_IP"
echo "📊 Check status: ssh root@$SERVER_IP 'pm2 list'"
