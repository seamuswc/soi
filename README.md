# SOI Pattaya — Minimal Deploy

## 🚀 One-command deploy (recommended)
```bash
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash
```
*Includes automatic SSL certificate setup with Let's Encrypt*

## 🧰 Manual deploy on a fresh server
```bash
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
sudo ./deploy.sh
```


## After Setup
```bash
pm2 status              # Check if running
pm2 logs soipattaya     # View logs
pm2 restart soipattaya  # Restart app
pm2 stop soipattaya     # Stop app
pm2 start soipattaya    # Start app
```

## Update to latest code

cd /var/www/soipattaya 
git pull
npm run update

## 🛡️ Safe Updates (Recommended)

```bash
# Safe update with maintenance mode (no user interruption)
npm run safe-update

# Manual maintenance control
npm run maintenance on     # Enable maintenance mode
npm run update            # Run update safely  
npm run maintenance off   # Restore site
npm run maintenance status # Check status
```

## 🎟️ Promo Code Management

```bash
# Set promo code and usage limit
npm run promo "WELCOME20" 100

# Check promo usage statistics
npm run check-promo
```

## 💰 Crypto Merchant Address Management

```bash
# Interactive tool to set/update merchant addresses
npm run merchant

# Supports: Solana, Aptos, Sui, Base
# Updates addresses in .env file for receiving payments
```

## 📱 LINE Account Management

```bash
# Set or update LINE account for Thai Baht payments
npm run line

# Updates LINE_ACCOUNT in .env file
# Used for ScanPay bank transfers via LINE chat
```

## 🛠️ Available NPM Commands

```bash
npm run setup           # Initial environment setup wizard
npm run merchant        # Update crypto merchant addresses
npm run line            # Set LINE account for THB payments
npm run promo           # Set promo code and usage limit
npm run check-promo     # Check promo code statistics
npm run maintenance     # Toggle maintenance mode (on/off/status)
npm run dev             # Start development servers (client + server)
npm run dev:client      # Start only frontend dev server
npm run dev:server      # Start only backend dev server
npm run build           # Build both client and server for production
npm run build:client    # Build only frontend
npm run build:server    # Build only backend
npm run start           # Start production server
npm run deploy          # Deploy to production (requires sudo)
npm run deploy:one-liner # One-command deploy from GitHub
npm run update          # Update app with latest code
npm run safe-update     # Update with automatic maintenance mode
```

## 🔄 Server Migration

### Quick Migration (Automated)

**On your OLD server:**
```bash
cd /var/www/soipattaya
./migrate-server.sh backup
```

**Transfer the .tar.gz file to new server, then:**

**On your NEW server:**
```bash
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
./migrate-server.sh restore soipattaya-migration-*.tar.gz
```

### Manual Migration

If you prefer manual control:

```bash
# 1. Backup database on old server
node backup-database.js

# 2. Copy backup files to new server
scp backups/latest-backup.json user@new-server:/tmp/
scp .env user@new-server:/tmp/

# 3. On new server - restore everything
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
cp /tmp/latest-backup.json backups/
cp /tmp/.env .env
npm install && cd server && npm install && cd .. && cd client && npm install && cd ..
npm run build
node restore-database.js backups/latest-backup.json
pm2 start ecosystem.config.js
```

### What Gets Migrated
- ✅ All property listings and data
- ✅ Promo codes and usage tracking  
- ✅ Environment variables
- ✅ Database schema and migrations
- ✅ Application configuration

See `MIGRATION.md` for detailed instructions and troubleshooting.

