# SOI Pattaya - React + Vite + Fastify App

## Setup

1. Install dependencies:
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. Set up environment variables in server/.env and client/.env (see examples above).

3. Run Prisma migrations:
   ```
   cd server
   npx prisma migrate dev
   ```

## Development

```
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Build

```
npm run build
```

## Start Production

```
npm start
```

For deployment, use a Node.js host, serve client/build as static, proxy API to server.

## Linux Server Setup (Ubuntu/Debian)

### 1. System Requirements
- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum (4GB recommended)
- 20GB disk space
- Root or sudo access

### 2. Install Node.js and npm
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 Process Manager
```bash
# Install PM2 globally
sudo npm install -g pm2

# Enable PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 4. Install Nginx (Reverse Proxy)
```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 5. Clone and Setup Application
```bash
# Install Git if not present
sudo apt install git -y

# Clone repository
git clone <your-repo-url> /opt/soipattaya
cd /opt/soipattaya

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install
```

### 6. Database Setup
```bash
# Navigate to server directory
cd /opt/soipattaya/server

# Set up database
DATABASE_URL="file:/opt/soipattaya/server/database.sqlite" npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 7. Environment Configuration
```bash
# Create environment file
sudo nano /opt/soipattaya/server/.env
```

Add the following content:
```env
# Database
DATABASE_URL="file:/opt/soipattaya/server/database.sqlite"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password_here"
ADMIN_TOKEN="your_secure_token_here"

# Google Maps API (optional)
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# Blockchain addresses (optional)
SOLANA_MERCHANT_ADDRESS="your_solana_address"
APTOS_MERCHANT_ADDRESS="your_aptos_address"
SUI_MERCHANT_ADDRESS="your_sui_address"

# Production settings
NODE_ENV="production"
PORT=3000
```

### 8. Build Application
```bash
# Build the application
cd /opt/soipattaya
npm run build
```

### 9. Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/soipattaya
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Static files
    location / {
        root /opt/soipattaya/client/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

Enable the site:
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 10. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 11. Start Application with PM2
```bash
# Create PM2 ecosystem file
nano /opt/soipattaya/ecosystem.config.js
```

Add the following content:
```javascript
module.exports = {
  apps: [{
    name: 'soipattaya',
    script: 'server/dist/index.js',
    cwd: '/opt/soipattaya',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'file:/opt/soipattaya/server/database.sqlite',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'your_secure_password_here',
      ADMIN_TOKEN: 'your_secure_token_here',
      PORT: 3000
    },
    error_file: '/var/log/pm2/soipattaya-error.log',
    out_file: '/var/log/pm2/soipattaya-out.log',
    log_file: '/var/log/pm2/soipattaya.log',
    time: true
  }]
};
```

Start the application:
```bash
# Start with PM2
pm2 start /opt/soipattaya/ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs soipattaya
```

### 12. Firewall Configuration
```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### 13. Monitoring and Maintenance
```bash
# View PM2 logs
pm2 logs soipattaya

# Restart application
pm2 restart soipattaya

# Update application
cd /opt/soipattaya
git pull
npm run build
pm2 restart soipattaya

# Monitor system resources
pm2 monit
```

### 14. Backup Strategy
```bash
# Create backup script
sudo nano /opt/soipattaya/backup.sh
```

Add the following content:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/soipattaya"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/soipattaya/server/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/soipattaya

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sqlite" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Make it executable and add to cron:
```bash
chmod +x /opt/soipattaya/backup.sh

# Add to crontab
crontab -e
# Add this line for daily backups at 2 AM:
# 0 2 * * * /opt/soipattaya/backup.sh
```

### 15. Troubleshooting
```bash
# Check application status
pm2 status
pm2 logs soipattaya --lines 100

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check disk space
df -h

# Check memory usage
free -h

# Check application logs
tail -f /var/log/pm2/soipattaya.log
```

### 16. Security Checklist
- [ ] Change default admin credentials
- [ ] Use strong passwords
- [ ] Enable firewall
- [ ] Install SSL certificate
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly

---

Note: Update wallet addresses and API keys in .env files.
The app now uses direct Solana RPC for payment validation, no Helius required.
Only Solana payments are supported.
Users can pay via QR or directly with Phantom wallet.

