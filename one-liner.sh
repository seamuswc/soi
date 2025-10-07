#!/bin/bash
# One-liner deployment for SOI Pattaya
# Usage: curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash

set -euo pipefail

echo "🚀 SOI Pattaya - One-Liner Deployment"
echo "===================================="

# Set non-interactive mode to avoid SSH config conflicts
export DEBIAN_FRONTEND=noninteractive

# Pre-configure SSH to keep local version (prevents SSH connection loss)
echo "openssh-server openssh-server/sshd_config_keep_local boolean true" | debconf-set-selections

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

echo "📦 Installing PM2 and Nginx..."
npm install -g pm2 && apt install -y nginx git

echo "📦 Cloning repository..."
git clone https://github.com/seamuswc/soipattaya_JS.git /opt/soipattaya
cd /opt/soipattaya

echo "📦 Installing dependencies..."
npm install && cd client && npm install && cd ../server && npm install && cd ..

echo "🔧 Setting up environment..."
npm run setup

echo "⚠️  IMPORTANT: Please edit the .env file with your actual values:"
echo "   nano /opt/soipattaya/.env"
echo ""
echo "Required values:"
echo "   - Google Maps API key"
echo "   - Blockchain merchant addresses"
echo "   - Admin credentials"
echo ""
read -p "Press Enter after editing .env file..."

echo "🗄️  Setting up database..."
cd server && npx prisma db push && cd ..

echo "🔨 Building application..."
npm run build

echo "🌐 Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/soipattaya
sed -i 's|DOMAIN_PLACEHOLDER|soipattaya.com www.soipattaya.com|' /etc/nginx/sites-available/soipattaya
sed -i 's|APP_DIR_PLACEHOLDER|/opt/soipattaya|' /etc/nginx/sites-available/soipattaya
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js && pm2 save && pm2 startup

echo "🔥 Configuring firewall..."
ufw allow 22,80,443 && ufw --force enable

echo "✅ Setup complete!"
echo "🌐 Your app should be running at: http://$(curl -s ifconfig.me)"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status              # Check app status"
echo "   pm2 logs soipattaya     # View logs"
echo "   pm2 restart soipattaya # Restart app"
echo ""
echo "🔧 If you need to edit config:"
echo "   nano /opt/soipattaya/.env"
echo "   pm2 restart soipattaya"
