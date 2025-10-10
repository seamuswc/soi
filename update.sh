#!/bin/bash

set -euo pipefail

# Resolve project root (directory containing this script)
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "📦 Ensuring Node 20.x and latest npm/pm2 (non-interactive where possible)..."
if command -v apt &> /dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || true
  sudo apt-get -o Dpkg::Options::="--force-confold" install -yq nodejs || true
fi
npm install -g npm pm2@latest || true

echo "🔄 Updating code..."
git pull

echo "📦 Installing dependencies (root)..."
if [ -f package-lock.json ]; then 
  npm ci || npm install
else 
  npm install
fi

echo "📦 Installing dependencies (client)..."
pushd client >/dev/null
if [ -f package-lock.json ]; then 
  npm ci || npm install
else 
  npm install
fi
# Ensure Vite envs are present for client build
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "🔐 Syncing VITE_* vars to client/.env"
  grep -E '^VITE_[A-Z0-9_]+=' "$PROJECT_ROOT/.env" > ./.env 2>/dev/null || true
fi
popd >/dev/null

echo "📦 Installing dependencies (server) and applying DB changes..."
pushd server >/dev/null
if [ -f package-lock.json ]; then 
  npm ci || npm install
else 
  npm install
fi
if ! npx prisma migrate deploy; then
  npx prisma db push
fi
popd >/dev/null

echo "🔨 Rebuilding application (client + server)..."
npm run build

echo "🚀 Restarting application with PM2..."
if pm2 restart soipattaya; then
  echo "PM2 process restarted."
else
  echo "PM2 process not found. Starting via ecosystem config..."
  pm2 start ecosystem.config.js || true
fi

echo "✅ Update complete."

