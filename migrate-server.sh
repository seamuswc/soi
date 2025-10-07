#!/bin/bash

set -euo pipefail

echo "🚀 SOI Pattaya Server Migration Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on source or destination server
if [ "$1" = "backup" ]; then
    print_status "Creating backup on SOURCE server..."
    
    # Create backup directory
    mkdir -p backups
    
    # Backup database
    print_status "Backing up database..."
    node backup-database.js
    
    # Backup environment file
    print_status "Backing up environment file..."
    cp .env backups/.env.backup
    
    # Create migration package
    print_status "Creating migration package..."
    tar -czf soipattaya-migration-$(date +%Y%m%d-%H%M%S).tar.gz \
        backups/ \
        .env \
        server/database/ \
        --exclude=node_modules \
        --exclude=client/dist \
        --exclude=server/dist
    
    print_success "Migration package created! Transfer this file to your new server."
    print_status "Next steps:"
    echo "1. Copy the .tar.gz file to your new server"
    echo "2. Run: ./migrate-server.sh restore <package-file>"
    
elif [ "$1" = "restore" ]; then
    if [ -z "${2:-}" ]; then
        print_error "Please provide migration package file"
        echo "Usage: ./migrate-server.sh restore <package-file>"
        exit 1
    fi
    
    MIGRATION_FILE="$2"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    print_status "Restoring on DESTINATION server..."
    
    # Extract migration package
    print_status "Extracting migration package..."
    tar -xzf "$MIGRATION_FILE"
    
    # Restore environment
    if [ -f "backups/.env.backup" ]; then
        print_status "Restoring environment file..."
        cp backups/.env.backup .env
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    cd server && npm install && cd ..
    cd client && npm install && cd ..
    
    # Generate Prisma client
    print_status "Setting up database..."
    cd server
    npx prisma generate
    npx prisma migrate deploy
    cd ..
    
    # Build application
    print_status "Building application..."
    npm run build
    
    # Restore database
    if [ -f "backups/latest-backup.json" ]; then
        print_status "Restoring database..."
        node restore-database.js backups/latest-backup.json
    fi
    
    # Start application
    print_status "Starting application..."
    pm2 start ecosystem.config.js
    
    print_success "Migration completed successfully!"
    print_status "Your application should now be running on the new server."
    
else
    print_error "Invalid argument. Use 'backup' or 'restore'"
    echo ""
    echo "Usage:"
    echo "  ./migrate-server.sh backup                    # On source server"
    echo "  ./migrate-server.sh restore <package-file>    # On destination server"
    echo ""
    echo "Example:"
    echo "  # On old server:"
    echo "  ./migrate-server.sh backup"
    echo ""
    echo "  # Copy soipattaya-migration-*.tar.gz to new server"
    echo ""
    echo "  # On new server:"
    echo "  ./migrate-server.sh restore soipattaya-migration-20240101-120000.tar.gz"
    exit 1
fi
