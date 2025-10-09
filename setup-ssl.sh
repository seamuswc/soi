#!/bin/bash
# SSL Setup Script for SOI Pattaya
# Run this AFTER the main deployment to enable HTTPS

set -euo pipefail

echo "🔒 SOI Pattaya - SSL Setup"
echo "=========================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Configuration
DOMAIN="soipattaya.com"
EMAIL="admin@soipattaya.com"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "❌ Nginx is not running. Please deploy the app first."
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get update -yq
    apt-get install -yq certbot python3-certbot-nginx
fi

# Get SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
echo "   This will configure HTTPS automatically"
echo ""

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ SSL Setup Complete!"
echo "🌐 Your app is now available at: https://$DOMAIN"
echo "🔒 SSL certificate will auto-renew via certbot"
echo ""
echo "📋 Certificate info:"
certbot certificates

echo ""
echo "🎉 HTTPS is now enabled!"
