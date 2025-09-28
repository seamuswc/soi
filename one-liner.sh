#!/bin/bash
# One-liner deployment for SOI Pattaya
# Usage: curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash

echo "🚀 SOI Pattaya - One-Liner Deployment"
echo "===================================="

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs

# Install PM2 and Nginx
npm install -g pm2 && apt install -y nginx git

# Clone and setup
git clone https://github.com/seamuswc/soipattaya_JS.git /opt/soipattaya
cd /opt/soipattaya
npm install && cd client && npm install && cd ../server && npm install && cd ..

# Setup environment
npm run setup
echo "⚠️  Please edit .env file: nano /opt/soipattaya/.env"
read -p "Press Enter after editing .env..."

# Setup database and build
cd server && npx prisma db push && cd .. && npm run build

# Configure Nginx
cp nginx.conf /etc/nginx/sites-available/soipattaya
sed -i 's|_|soipattaya.com www.soipattaya.com|' /etc/nginx/sites-available/soipattaya
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start with PM2
pm2 start ecosystem.config.js && pm2 save && pm2 startup

# Setup firewall
ufw allow 22,80,443 && ufw --force enable

echo "✅ Done! App running at: http://$(curl -s ifconfig.me)"
