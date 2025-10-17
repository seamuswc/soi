# SOI Pattaya - Deployment Commands

## 🚀 Deployments

### 1. Complete Server Setup (First Time)
```bash
sudo ./setup.sh
```
**What it does:** FULL AND COMPLETE server and site setup - installs Node.js, nginx, SSL, PM2, builds code, sets up database, configures everything. NO QUESTIONS, NO COMMANDS NEEDED AFTER.

**Run from inside server:**
```bash
cd /var/www/soipattaya
sudo ./setup.sh
```

**Run from your local terminal via SSH:**
```bash
ssh root@soipattaya.com 'cd /var/www/soipattaya && sudo ./setup.sh'
```

### 2. Update Server (Existing Server)
```bash
sudo ./update.sh
```
**What it does:** Pulls new git code, updates server, updates packages, rebuilds, restarts services.

**Run from inside server:**
```bash
cd /var/www/soipattaya
sudo ./update.sh
```

**Run from your local terminal via SSH:**
```bash
ssh root@soipattaya.com 'cd /var/www/soipattaya && sudo ./update.sh'
```

### 3. Local Development
```bash
npm install
npm run build
cd server && node dist/index.js &
node proxy-server.js &
```
**Access:** http://localhost:8080

## 💾 Database Backup

### Backup Database
```bash
# Create backup
node backup-database.js

# This creates: backup_YYYY-MM-DD_HH-MM-SS.sqlite
```

**Run from inside server:**
```bash
cd /var/www/soipattaya
node backup-database.js
```

**Run from your local terminal via SSH:**
```bash
ssh root@soipattaya.com 'cd /var/www/soipattaya && node backup-database.js'
```

### Restore Database
```bash
# Restore from backup
node restore-database.js backup_2024-10-17_19-30-00.sqlite
```

**Run from inside server:**
```bash
cd /var/www/soipattaya
node restore-database.js backup_2024-10-17_19-30-00.sqlite
```

**Run from your local terminal via SSH:**
```bash
ssh root@soipattaya.com 'cd /var/www/soipattaya && node restore-database.js backup_2024-10-17_19-30-00.sqlite'
```

---

**Repository**: https://github.com/seamuswc/soi