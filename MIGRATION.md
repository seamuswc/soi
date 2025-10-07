# 🚀 SOI Pattaya Server Migration Guide

This guide helps you migrate your SOI Pattaya application from one server to another while preserving all data.

## 📋 Prerequisites

- Access to both old and new servers
- Node.js 20+ installed on new server
- PM2 installed on new server
- Git access to your repository

## 🔄 Migration Process

### Step 1: Backup on Source Server

On your **current server**, run:

```bash
# Navigate to your project directory
cd /var/www/soipattaya

# Create backup and migration package
./migrate-server.sh backup
```

This will create:
- Database backup (JSON format)
- Environment file backup
- Migration package (.tar.gz file)

### Step 2: Transfer Files

Copy the generated `.tar.gz` file to your new server:

```bash
# Example using scp
scp soipattaya-migration-*.tar.gz user@new-server:/tmp/

# Or use rsync
rsync -avz soipattaya-migration-*.tar.gz user@new-server:/tmp/
```

### Step 3: Setup New Server

On your **new server**:

```bash
# Clone your repository
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS

# Copy migration package to project directory
cp /tmp/soipattaya-migration-*.tar.gz .

# Restore everything
./migrate-server.sh restore soipattaya-migration-*.tar.gz
```

## 🛠️ Manual Migration (Alternative)

If you prefer manual control:

### 1. Backup Database

```bash
# On source server
node backup-database.js
```

### 2. Backup Environment

```bash
# Copy your .env file
cp .env .env.backup
```

### 3. Transfer Files

```bash
# Copy backup files to new server
scp backups/latest-backup.json user@new-server:/tmp/
scp .env.backup user@new-server:/tmp/
```

### 4. Restore on New Server

```bash
# On new server
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS

# Copy backup files
cp /tmp/latest-backup.json backups/
cp /tmp/.env.backup .env

# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Setup database
cd server
npx prisma generate
npx prisma migrate deploy
cd ..

# Build application
npm run build

# Restore database
node restore-database.js backups/latest-backup.json

# Start application
pm2 start ecosystem.config.js
```

## 🔍 Verification

After migration, verify everything works:

1. **Check application status:**
   ```bash
   pm2 status
   ```

2. **Check database:**
   ```bash
   cd server
   npx prisma studio
   ```

3. **Test endpoints:**
   ```bash
   curl http://localhost:3000/api/listings
   ```

4. **Check website:**
   - Visit your domain
   - Test creating a listing
   - Verify data is preserved

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check if database file exists
ls -la server/database/

# Regenerate Prisma client
cd server
npx prisma generate
```

### Missing Dependencies
```bash
# Reinstall all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### PM2 Issues
```bash
# Restart PM2
pm2 restart all
pm2 save
pm2 startup
```

## 📁 Backup Files

The migration creates these files:
- `backups/latest-backup.json` - Latest database backup
- `backups/soipattaya-backup-*.json` - Timestamped backups
- `soipattaya-migration-*.tar.gz` - Complete migration package

## 🔒 Security Notes

- Environment files contain sensitive data
- Keep backup files secure
- Delete migration packages after successful migration
- Update any hardcoded server references

## 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs soipattaya`
2. Verify database: `cd server && npx prisma studio`
3. Test API endpoints manually
4. Check nginx configuration

---

**Migration completed successfully!** 🎉
