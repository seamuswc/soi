#!/bin/bash
# SOI Pattaya - Update Script
# Pulls new git code, updates server, updates packages, etc.

set -euo pipefail

# FORCE non-interactive mode for ALL operations
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFNEW=1
export UCF_FORCE_CONFFMISS=1
export APT_LISTCHANGES_FRONTEND=none
export APT_LISTBUGS_FRONTEND=none

echo "🔄 SOI Pattaya - Server Update"
echo "=============================="

# Configuration
APP_DIR="/var/www/soipattaya"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory $APP_DIR not found!"
    echo "💡 Run setup.sh first to install the application"
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

echo "📥 Pulling latest changes from git..."
if ! git pull origin main; then
    echo "❌ Git pull failed!"
    exit 1
fi

echo "🔐 Updating environment variables..."
# Merge new variables from .env.example into .env
if [ -f .env.example ]; then
    if [ -f .env ]; then
        # Count existing variables in .env
        existing_count=$(grep -v "^[[:space:]]*#" .env | grep -v "^[[:space:]]*$" | grep "=" | wc -l)
        
        # Read .env.example and check each variable
        added_count=0
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] || [[ ! "$line" =~ = ]]; then
                continue
            fi
            
            # Extract variable name (everything before =)
            var_name=$(echo "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*=.*$//' | xargs)
            
            # Check if variable already exists in .env
            if [ -n "$var_name" ] && ! grep -q "^[[:space:]]*${var_name}[[:space:]]*=" .env; then
                # Variable doesn't exist, add it to .env
                echo "$line" >> .env
                added_count=$((added_count + 1))
            fi
        done < .env.example
        
        if [ $added_count -gt 0 ]; then
            echo "✅ Added $added_count new environment variable(s) from .env.example"
        else
            echo "✅ Environment variables up to date"
        fi
    else
        # No .env file exists, copy from .env.example
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ Environment file created"
    fi
    
    # Always copy .env to server/.env
    cp .env server/.env
    echo "✅ Environment file synced to server directory"
else
    echo "⚠️  .env.example not found, skipping environment variable update"
fi

echo "📦 Updating dependencies..."
# Update root dependencies
if ! npm install --silent; then
    echo "❌ Root dependencies update failed!"
    exit 1
fi

# Update client dependencies
echo "Updating client dependencies..."
cd client
if ! npm install --silent; then
    echo "❌ Client dependencies update failed!"
    exit 1
fi
cd ..

# Update server dependencies
echo "Updating server dependencies..."
cd server
if ! npm install --silent; then
    echo "❌ Server dependencies update failed!"
    exit 1
fi
cd ..

echo "🗄️ Updating database schema..."
cd server
if ! npx prisma generate; then
    echo "❌ Prisma generate failed!"
    exit 1
fi

if ! npx prisma db push; then
    echo "❌ Database schema update failed!"
    exit 1
fi
cd ..

echo "🔨 Rebuilding application..."
# Build server with error checking
echo "Building server..."
cd server
if ! npm run build; then
    echo "❌ Server build failed!"
    echo "💡 Check TypeScript compilation errors"
    exit 1
fi
cd ..

# Build client with error checking
echo "Building client..."
cd client
if ! npm run build; then
    echo "❌ Client build failed!"
    echo "💡 Check for build errors"
    exit 1
fi
cd ..

echo "🚀 Restarting application..."
# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found! Installing..."
    npm install -g pm2 --silent
fi

# Update PM2 and restart application
pm2 update >/dev/null 2>&1 || true
if ! pm2 reload soipattaya --update-env; then
    echo "❌ Failed to reload application!"
    echo "💡 Trying to restart application..."
    if ! pm2 restart soipattaya --update-env; then
        echo "❌ Failed to restart application!"
        echo "💡 Trying to start application..."
        if ! pm2 start ecosystem.config.js; then
            echo "❌ Failed to start application!"
            exit 1
        fi
    fi
fi

# Ensure jq is available for robust PM2 JSON health checks
if ! command -v jq &> /dev/null; then
    echo "📦 Installing jq for health checks..."
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y jq >/dev/null 2>&1 || true
fi

# Wait for application to start with robust PM2 JSON check
echo "⏳ Waiting for application to start..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until pm2 jlist | jq -e '.[] | select(.name=="soipattaya" and .pm2_env.status=="online")' >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
        echo "❌ Application is not reported online by PM2"
        echo "📝 PM2 list:" && pm2 list || true
        echo "📝 Recent logs:" && pm2 logs soipattaya --lines 20 || true
        exit 1
    fi
    sleep 1
done

echo "🔒 Renewing SSL certificate..."
# Only renew SSL if certificates exist
if [ -d "/etc/letsencrypt/live" ]; then
    if certbot renew --quiet; then
        echo "✅ SSL certificate renewed"
        systemctl reload nginx
    else
        echo "⚠️  SSL renewal failed, but continuing..."
    fi
else
    echo "ℹ️  No SSL certificates found, skipping renewal"
fi

# Wait a moment for everything to settle after SSL renewal
sleep 3

# Test application with retry logic (run last, after all operations)
echo "🧪 Testing application..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until curl -sf "http://localhost:3001/api/config/merchant-addresses" > /dev/null; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
        echo "❌ Backend API not responding after $MAX_ATTEMPTS attempts!"
        echo "📝 Backend logs:"
        pm2 logs soipattaya --lines 10
        exit 1
    fi
    echo "   Attempt $ATTEMPTS/$MAX_ATTEMPTS - waiting for server..."
    sleep 2
done
echo "✅ Backend API is responding"

# Test frontend with retry logic (check /create page which loads React components)
ATTEMPTS=0
MAX_ATTEMPTS=15
until curl -sf "http://localhost/create" | grep -qE "(html|HTML|<div|root)"; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
        echo "⚠️  Frontend health check failed, but continuing (site may still be working)"
        echo "   Note: Frontend may need a moment to fully load"
        break
    fi
    echo "   Attempt $ATTEMPTS/$MAX_ATTEMPTS - waiting for frontend..."
    sleep 2
done
if [ "$ATTEMPTS" -lt "$MAX_ATTEMPTS" ]; then
    echo "✅ Frontend is responding"
fi

echo ""
echo "✅ Update complete!"
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 App is running successfully!"
echo "📝 Useful commands:"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs soipattaya"
echo "   Monitor: pm2 monit"