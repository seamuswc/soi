#!/bin/bash

# SOI Pattaya - Server Wipe Script (DANGEROUS)
# Usage:
#   ./wipe-server.sh <server_ip_or_host> [domain1 [domain2 ...]]
# Example:
#   ./wipe-server.sh 178.128.95.2 soipattaya.com soibkk.com

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <server_ip_or_host> [domain1 [domain2 ...]]"
  exit 1
fi

SERVER="$1"; shift || true
DOMAINS=("$@")

APP_DIR="/var/www/soipattaya"
NGINX_SITE="/etc/nginx/sites-available/soipattaya"

DOMAINS_JOINED="${DOMAINS[*]}"

echo "⚠️  COMPLETE WIPE on ${SERVER}"
echo "   This will remove app files, PM2 state, nginx, certbot, SSL certs, and Node PM2 globals."
echo "   Domains: ${DOMAINS_JOINED}"

ssh root@"$SERVER" "APP_DIR='$APP_DIR' NGINX_SITE='$NGINX_SITE' DOMAINS_JOINED='$DOMAINS_JOINED' bash -s" << 'REMOTE_EOF'
set -e

APP_DIR="${APP_DIR:-/var/www/soipattaya}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/soipattaya}"
DOMAINS_JOINED="${DOMAINS_JOINED:-}"

IFS=' ' read -r -a DOMAINS <<< "$DOMAINS_JOINED"

echo "🛑 Stopping PM2 processes..."
pm2 delete all >/dev/null 2>&1 || true
pm2 kill >/dev/null 2>&1 || true
rm -rf /root/.pm2 || true
systemctl disable pm2-root >/dev/null 2>&1 || true
rm -f /etc/systemd/system/pm2-root.service || true

echo "🧹 Removing application directory: $APP_DIR"
rm -rf "$APP_DIR" || true

echo "🧹 Removing nginx config and sites..."
rm -f "$NGINX_SITE" || true
SITE_NAME="${NGINX_SITE##*/}"
rm -f "/etc/nginx/sites-enabled/$SITE_NAME" || true
rm -rf /etc/nginx/sites-available/* || true
rm -rf /etc/nginx/sites-enabled/* || true
rm -rf /etc/nginx/conf.d/* || true
rm -rf /etc/nginx || true

echo "🧹 Removing SSL certificates (if any)..."
for d in "${DOMAINS[@]}"; do
  [ -z "$d" ] && continue
  # Try certbot delete first
  if command -v certbot >/dev/null 2>&1; then
    certbot delete --cert-name "$d" --non-interactive --quiet || true
  fi
  # Force-remove leftover dirs
  rm -rf "/etc/letsencrypt/live/$d" || true
  rm -rf "/etc/letsencrypt/archive/$d" || true
  rm -f "/etc/letsencrypt/renewal/$d.conf" || true
  # www subdomain too
  rm -rf "/etc/letsencrypt/live/www.$d" || true
  rm -rf "/etc/letsencrypt/archive/www.$d" || true
  rm -f "/etc/letsencrypt/renewal/www.$d.conf" || true
done

echo "🧹 Killing any process on port 3001..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3001/tcp >/dev/null 2>&1 || true
fi

echo "🧨 Uninstalling all packages previously installed by deploy (nginx, certbot, nodejs, git, curl, ufw, build tools) and PM2 globals..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null 2>&1 || true
apt-get purge -y \
  nginx nginx-common nginx-core \
  certbot python3-certbot-nginx \
  nodejs \
  git curl ca-certificates \
  build-essential make \
  ufw >/dev/null 2>&1 || true
apt-get autoremove -y >/dev/null 2>&1 || true
apt-get autoclean -y >/dev/null 2>&1 || true
# Remove firewall config
ufw disable >/dev/null 2>&1 || true
rm -rf /etc/ufw || true


# Remove global PM2 and Node globals remnants
npm uninstall -g pm2 >/dev/null 2>&1 || true
rm -rf /usr/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2 || true

# Remove Let's Encrypt directories entirely
rm -rf /etc/letsencrypt || true

echo "✅ Server wipe complete."
REMOTE_EOF

echo "🎉 Done. The server has been wiped of app artifacts. You can now run deploy.sh."


