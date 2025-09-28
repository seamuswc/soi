# Installation Guide

## 🚀 Quick Install (Recommended)

```bash
# One-command deployment
npm run deploy
```

## 📦 Manual Installation by OS

### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use system package manager
sudo apt install nodejs npm

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### CentOS/RHEL
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo yum install nginx -y
```

### Fedora
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo dnf install nginx -y
```

### Arch Linux
```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo pacman -S nginx
```

### macOS
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install PM2
npm install -g pm2

# Install Nginx
brew install nginx
```

### Windows
```bash
# Install Node.js from https://nodejs.org/
# Or use Chocolatey:
choco install nodejs

# Install PM2
npm install -g pm2

# Install Nginx
choco install nginx
```

## 🔧 Alternative: Using NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default lts/*

# Install PM2
npm install -g pm2
```

## ✅ Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PM2 version
pm2 --version

# Check Nginx version
nginx -v
```

## 🚀 Deploy Application

After installing dependencies:

```bash
# Clone repository
git clone <your-repo-url> /opt/soipattaya
cd /opt/soipattaya

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Setup database
cd server
npx prisma db push
cd ..

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🆘 Troubleshooting

**Node.js not found:**
```bash
# Check if Node.js is installed
which node
which npm

# If not found, reinstall using package manager
```

**Permission denied:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**PM2 not found:**
```bash
# Reinstall PM2 globally
sudo npm install -g pm2
```

**Nginx not starting:**
```bash
# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```
