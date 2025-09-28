# SOI Pattaya - Property Listing App

A simple property listing app with blockchain payments (Solana, Aptos, Sui) and admin dashboard.

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Setup Environment
```bash
# Create .env file
cp env.example .env

# Edit with your values
nano .env
```

### 3. Setup Database
```bash
cd server
npx prisma db push
```

### 4. Run Development
```bash
npm run dev
```

- **App**: http://localhost:5173
- **API**: http://localhost:3000

## Environment Variables

Create `.env` file with:
```env
DATABASE_URL="file:./server/database.sqlite"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_password"
ADMIN_TOKEN="your_token"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_key"
SOLANA_MERCHANT_ADDRESS="your_solana_address"
APTOS_MERCHANT_ADDRESS="your_aptos_address"
SUI_MERCHANT_ADDRESS="your_sui_address"
```

## Production Deployment

### 1. Build
```bash
npm run build
```

### 2. Start
```bash
npm start
```

## Linux Server Setup

### 1. Install Requirements
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install nginx -y
```

### 2. Deploy App
```bash
# Clone and setup
git clone <your-repo> /opt/soipattaya
cd /opt/soipattaya
npm install
cd client && npm install
cd ../server && npm install

# Setup database
cd server
npx prisma db push

# Build
cd /opt/soipattaya
npm run build
```

### 3. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/soipattaya
```

Add:
```nginx
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /opt/soipattaya/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Start with PM2
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'soipattaya',
    script: 'server/dist/index.js',
    cwd: '/opt/soipattaya',
    env_file: '/opt/soipattaya/.env',
    instances: 1,
    exec_mode: 'fork'
  }]
};
EOF

# Start
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Features

- **Property Listings**: Create and view property listings
- **Blockchain Payments**: Solana, Aptos, Sui support
- **Admin Dashboard**: Manage listings
- **Mobile Friendly**: Responsive design
- **Google Maps**: Interactive map integration

## Commands

```bash
npm run dev          # Development
npm run build        # Build for production
npm start           # Start production
npm run setup       # Interactive setup
```

## Troubleshooting

**Port in use:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Database issues:**
```bash
cd server
npx prisma db push
```

**Nginx issues:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```