#!/bin/bash
# Bulletproof one-liner deployment for SOI Pattaya
# Usage: curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner-bulletproof.sh | sudo bash

echo "🚀 SOI Pattaya - Bulletproof One-Liner Deployment"
echo "================================================="

# Update system
apt update -y && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs

# Install PM2, Nginx, Git, Certbot
npm install -g pm2 && apt install -y nginx git certbot python3-certbot-nginx

# Stop existing services
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Clean up and clone
rm -rf /opt/soipattaya
git clone https://github.com/seamuswc/soipattaya_JS.git /opt/soipattaya
cd /opt/soipattaya

# Install dependencies
npm install && cd client && npm install && cd .. && cd server && npm install && cd ..

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="file:/opt/soipattaya/server/database.sqlite"
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
echo 'VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"' > client/.env

# Setup database and build
cd server && npx prisma db push --force-reset && cd .. && npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/soipattaya << 'EOF'
server {
    listen 80;
    server_name soipattaya.com www.soipattaya.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /opt/soipattaya/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site and start services
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start with PM2
pm2 start ecosystem.config.js && pm2 save && pm2 startup

# Setup firewall
ufw allow 22,80,443 && ufw --force enable

# Get SSL certificate
certbot --nginx -d soipattaya.com -d www.soipattaya.com --non-interactive --agree-tos --email admin@soipattaya.com

echo "✅ Done! App running at: https://soipattaya.com"
echo "🔑 Admin: admin / soipattaya2024"
echo "📝 Edit config: nano /opt/soipattaya/.env"
