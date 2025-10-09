# SOI Pattaya — Minimal Deploy

## 🚀 One-command deploy (recommended)
```bash
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash
```

### Enable SSL (HTTPS) after deployment
```bash
# Run this after the main deployment completes
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/setup-ssl.sh | sudo bash
```

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

