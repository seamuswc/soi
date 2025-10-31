#!/bin/bash

# All-in-one deployment script
# Usage:
#   ./deploy.sh <server_ip_or_host> [domain1 [domain2 ...]]
# Example:
#   ./deploy.sh 178.128.95.2 soipattaya.com soikk.com

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <server_ip_or_host> [domain1 [domain2 ...]]"
  exit 1
fi

SERVER="$1"; shift || true
if [ "$#" -eq 0 ]; then
  DOMAINS=("soipattaya.com")
else
  DOMAINS=("$@")
fi
PRIMARY_DOMAIN="${DOMAINS[0]}"

APP_DIR="/var/www/soipattaya"
REPO_URL="https://github.com/seamuswc/soi.git"

echo "🚀 Deploying to $SERVER"
echo "🌐 Domains: ${DOMAINS[*]} (primary: $PRIMARY_DOMAIN)"

# Push local changes first, if any
if git -C "$(pwd)" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "🔄 Ensuring local changes are pushed..."
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "chore: deploy - ensure latest changes"
  fi
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push origin "$CURRENT_BRANCH"
else
  echo "ℹ️  Not a git repository locally; skipping local push."
fi

DOMAINS_JOINED="${DOMAINS[*]}"

ssh root@"$SERVER" "APP_DIR='$APP_DIR' REPO_URL='$REPO_URL' DOMAINS_JOINED='$DOMAINS_JOINED' PRIMARY_DOMAIN='$PRIMARY_DOMAIN' bash -s" << 'REMOTE_EOF'
set -e

export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFNEW=1
export UCF_FORCE_CONFFMISS=1
export APT_LISTCHANGES_FRONTEND=none
export APT_LISTBUGS_FRONTEND=none

# Variables are provided via the SSH invocation environment
# Reconstruct arrays
IFS=' ' read -r -a DOMAINS <<< "$DOMAINS_JOINED"

echo "🧩 Configuration:" 
echo "  APP_DIR: $APP_DIR"
echo "  REPO_URL: $REPO_URL"
echo "  DOMAINS: ${DOMAINS[*]}"
echo "  PRIMARY: $PRIMARY_DOMAIN"

echo "🔄 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing base packages..."
apt install -y curl git ca-certificates build-essential python3 make ufw jq >/dev/null 2>&1 || apt install -y curl git ca-certificates build-essential python3 make ufw jq

echo "📦 Installing Node.js 20.x and PM2..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
# Always ensure latest PM2
npm uninstall -g pm2 >/dev/null 2>&1 || true
npm install -g pm2@latest
pm2 --version

echo "🌐 Installing nginx and certbot..."
apt install -y nginx certbot python3-certbot-nginx

echo "🧱 Configuring firewall..."
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

echo "📁 Preparing app directory..."
mkdir -p "$APP_DIR"

# Ensure git safe.directory for root-managed directory
git config --global --add safe.directory "$APP_DIR" || true

FRESH_INSTALL=0
if [ -d "$APP_DIR/.git" ]; then
  echo "📥 Pulling latest code..."
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
else
  echo "📥 Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  FRESH_INSTALL=1
fi

cd "$APP_DIR"

echo "🔐 Ensuring environment file..."
if [ ! -f .env ]; then
  cat > .env <<EOF
# Database
DATABASE_URL="file:./server/database/database.sqlite"

# Server
PORT=3001
NODE_ENV=production

# Admin
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="poop"
ADMIN_TOKEN="admin123"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_MERCHANT_ADDRESS="YOUR_ACTUAL_SOLANA_WALLET_ADDRESS_HERE"

# Email (Tencent SES)
TENCENT_SES_SECRET_ID=""
TENCENT_SES_SECRET_KEY=""
TENCENT_SES_REGION="ap-singapore"
TENCENT_SES_TEMPLATE_ID_PROMO="66912"
TENCENT_SES_TEMPLATE_ID_DATA="66908"
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@$PRIMARY_DOMAIN"

# Vite Environment Variables
VITE_API_URL="https://$PRIMARY_DOMAIN/api"
VITE_APP_NAME="SOI Pattaya"
EOF
fi

cp .env server/.env

echo "📦 Installing dependencies..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

echo "🗄️  Prisma setup..."
cd server
npx prisma generate
# Fresh deploys should start with a clean database
if [ "$FRESH_INSTALL" = "1" ]; then
  echo "🧹 Fresh install detected – resetting SQLite database..."
  # Remove any possible SQLite locations used in past layouts
  rm -f "$APP_DIR/server/server/database/database.sqlite" || true
  rm -f "$APP_DIR/server/database/database.sqlite" || true
  rm -f "$APP_DIR/server/server/server/database/database.sqlite" || true
fi

npx prisma db push
cd ..

echo "🔨 Building server and client..."
cd server && npm run build && cd ..
cd client && npm run build && cd ..

echo "🌐 Writing nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/soipattaya"
SERVER_NAMES=""
for d in "${DOMAINS[@]}"; do
  SERVER_NAMES+="$d www.$d "
done

cat > "$NGINX_CONFIG" <<NGINXEOF
server {
    listen 80;
    server_name $SERVER_NAMES;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        root $APP_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINXEOF

ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx || true
systemctl reload nginx

echo "🚀 Starting app with PM2..."
# Fresh PM2 bootstrap to avoid legacy global path issues
pm2 kill >/dev/null 2>&1 || true
rm -rf /root/.pm2 || true
npm install -g pm2@latest >/dev/null 2>&1 || true
pm2 update >/dev/null 2>&1 || true
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
  if ! pm2 start "$APP_DIR/ecosystem.config.js"; then
    pm2 start "node server/dist/index.js" --name soipattaya --cwd "$APP_DIR"
  fi
else
  pm2 start "node server/dist/index.js" --name soipattaya --cwd "$APP_DIR"
fi
pm2 save
pm2 startup systemd -u root --hp /root

echo "⏳ Waiting for PM2 to report online..."
attempt=0; max_attempts=45
until pm2 jlist | jq -e '.[] | select(.name=="soipattaya" and .pm2_env.status=="online")' >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "❌ PM2 did not report app online"; pm2 list; pm2 logs soipattaya --lines 50; exit 1
  fi
  sleep 1
done

echo "🧪 Health checks..."
attempt=0; until curl -sf "http://localhost:3001/api/config/merchant-addresses" >/dev/null; do
  attempt=$((attempt+1)); [ "$attempt" -ge 30 ] && { echo "❌ Backend API not responding"; exit 1; }; sleep 2; done

attempt=0; until curl -sf "http://localhost" | grep -q "SoiPattaya"; do
  attempt=$((attempt+1)); [ "$attempt" -ge 30 ] && { echo "❌ Frontend not responding"; exit 1; }; sleep 2; done

echo "🔒 SSL setup (if domains not IPs)..."
NON_IP=()
for d in "${DOMAINS[@]}"; do
  if [[ ! $d =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then NON_IP+=("$d"); fi
done

if [ ${#NON_IP[@]} -gt 0 ]; then
  CERTBOT_ARGS=(--nginx --non-interactive --agree-tos --email admin@"$PRIMARY_DOMAIN")
  for d in "${NON_IP[@]}"; do CERTBOT_ARGS+=( -d "$d" -d "www.$d" ); done
  if ! certbot "${CERTBOT_ARGS[@]}"; then
    echo "⚠️  SSL issuance failed; site remains on HTTP"
  fi
fi

echo "✅ Deployment complete."
REMOTE_EOF
echo "🎉 Done. Visit: https://$PRIMARY_DOMAIN (or http if SSL skipped)"

