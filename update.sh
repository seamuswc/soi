#!/bin/bash

set -euo pipefail

# Resolve project root (directory containing this script)
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 Updating code..."
git pull

echo "📦 Installing dependencies (root)..."
npm install

echo "📦 Installing dependencies (client)..."
pushd client >/dev/null
npm install
# Ensure Vite envs are present for client build
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "🔐 Syncing VITE_* vars to client/.env"
  grep -E '^VITE_[A-Z0-9_]+=' "$PROJECT_ROOT/.env" > ./.env 2>/dev/null || true
fi
popd >/dev/null

echo "📦 Installing dependencies (server) and applying DB changes..."
pushd server >/dev/null
npm install
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

