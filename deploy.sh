#!/bin/bash

echo "🚀 SOI Pattaya - Simple Deployment"
echo "=================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt update
apt install -y nginx

# Setup application
echo "🔧 Setting up application..."
cd /opt/soipattaya
npm install
cd client && npm install
cd ../server && npm install

# Setup database
echo "🗄️ Setting up database..."
cd server
npx prisma db push
cd ..

# Build application
echo "🔨 Building application..."
npm run build

# Configure Nginx
echo "🌐 Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/soipattaya
ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Start with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Your app should be running at: http://your-server-ip"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs soipattaya"
