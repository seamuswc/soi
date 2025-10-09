#!/bin/bash
# Domain diagnostic script for SOI Pattaya

echo "🔍 SOI Pattaya Domain Diagnostic"
echo "==============================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo ""
echo "📋 1. Checking Nginx configuration..."
if [ -f /etc/nginx/sites-available/soipattaya ]; then
    echo "✅ Nginx config exists"
    echo "📄 Current server_name configuration:"
    grep "server_name" /etc/nginx/sites-available/soipattaya
else
    echo "❌ Nginx config not found at /etc/nginx/sites-available/soipattaya"
fi

echo ""
echo "📋 2. Checking enabled sites..."
if [ -L /etc/nginx/sites-enabled/soipattaya ]; then
    echo "✅ Site is enabled"
else
    echo "❌ Site not enabled"
    echo "🔧 Fix: sudo ln -sf /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/"
fi

echo ""
echo "📋 3. Checking for default site conflict..."
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "⚠️  Default site still enabled (may cause conflicts)"
    echo "🔧 Fix: sudo rm -f /etc/nginx/sites-enabled/default"
else
    echo "✅ Default site disabled"
fi

echo ""
echo "📋 4. Testing Nginx configuration..."
if nginx -t 2>/dev/null; then
    echo "✅ Nginx config is valid"
else
    echo "❌ Nginx config has errors"
    echo "🔧 Fix: Check nginx error logs"
fi

echo ""
echo "📋 5. Checking if Nginx is running..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    echo "🔧 Fix: sudo systemctl start nginx"
fi

echo ""
echo "📋 6. Checking PM2 process..."
if pm2 list | grep -q soipattaya; then
    echo "✅ PM2 process is running"
    pm2 list | grep soipattaya
else
    echo "❌ PM2 process not found"
    echo "🔧 Fix: cd /var/www/soipattaya && pm2 start ecosystem.config.js"
fi

echo ""
echo "📋 7. Testing local connectivity..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Backend is responding on localhost:3000"
else
    echo "❌ Backend not responding on localhost:3000"
fi

echo ""
echo "📋 8. Checking DNS resolution..."
DOMAIN="soipattaya.com"
if nslookup $DOMAIN > /dev/null 2>&1; then
    echo "✅ Domain resolves:"
    nslookup $DOMAIN | grep "Address:"
else
    echo "❌ Domain does not resolve"
    echo "🔧 Fix: Check DNS settings or use IP address"
fi

echo ""
echo "📋 9. Checking firewall..."
if ufw status | grep -q "Status: active"; then
    echo "✅ Firewall is active"
    echo "📄 Allowed ports:"
    ufw status | grep -E "(80|443|22)"
else
    echo "⚠️  Firewall not active"
fi

echo ""
echo "📋 10. Checking SSL certificate..."
if [ -f /etc/letsencrypt/live/soipattaya.com/fullchain.pem ]; then
    echo "✅ SSL certificate exists"
    echo "📄 Certificate details:"
    openssl x509 -in /etc/letsencrypt/live/soipattaya.com/fullchain.pem -text -noout | grep -E "(Subject:|Not After)"
else
    echo "❌ SSL certificate not found"
    echo "🔧 Fix: Run SSL setup or use HTTP"
fi

echo ""
echo "🎯 Common fixes:"
echo "1. Update domain in nginx config: sudo nano /etc/nginx/sites-available/soipattaya"
echo "2. Reload nginx: sudo systemctl reload nginx"
echo "3. Check DNS: nslookup your-domain.com"
echo "4. Test with curl: curl -H 'Host: your-domain.com' http://your-ip"
echo ""
echo "🔧 Quick fix command:"
echo "sudo sed -i 's/server_name .*/server_name your-domain.com www.your-domain.com;/' /etc/nginx/sites-available/soipattaya && sudo systemctl reload nginx"
