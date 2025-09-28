# 🚀 Quick Deployment Guide

## Single Command Options

### Option 1: One-Liner (Easiest)
```bash
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash
```

### Option 2: Interactive Script
```bash
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
sudo ./deploy.sh
```

### Option 3: NPM Script
```bash
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
npm run deploy
```

## What Each Command Does

All commands automatically:
- ✅ Install Node.js, PM2, Nginx
- ✅ Clone from [GitHub](https://github.com/seamuswc/soipattaya_JS.git)
- ✅ Install dependencies
- ✅ Setup environment variables
- ✅ Create database
- ✅ Build application
- ✅ Configure Nginx
- ✅ Start with PM2
- ✅ Setup firewall

## After Deployment

1. **Edit environment variables:**
   ```bash
   nano /opt/soipattaya/.env
   ```

2. **Check status:**
   ```bash
   pm2 status
   ```

3. **View logs:**
   ```bash
   pm2 logs soipattaya
   ```

4. **Access your app:**
   - Visit: `http://your-server-ip`
   - Admin: `http://your-server-ip/dashboard`

## Troubleshooting

**Port already in use:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Restart services:**
```bash
pm2 restart soipattaya
sudo systemctl reload nginx
```

**Check logs:**
```bash
pm2 logs soipattaya
sudo journalctl -u nginx
```

## Environment Variables

Edit `/opt/soipattaya/.env`:
```env
# Database
DATABASE_URL="file:/opt/soipattaya/server/database.sqlite"

# Admin Dashboard
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
ADMIN_TOKEN="your_secure_token"

# Google Maps
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# Blockchain Addresses
SOLANA_MERCHANT_ADDRESS="your_solana_address"
APTOS_MERCHANT_ADDRESS="your_aptos_address"
SUI_MERCHANT_ADDRESS="your_sui_address"

# Server
NODE_ENV="production"
PORT=3000
```

## Commands Reference

```bash
# Development
npm run dev

# Production
npm run build
npm start

# PM2 Management
pm2 status
pm2 restart soipattaya
pm2 stop soipattaya
pm2 logs soipattaya

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
```
