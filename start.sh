#!/bin/bash

# Update app from Git and put into operation (run from server, e.g. /var/www/miniapp)
set -e

APP_DIR="${APP_DIR:-/var/www/miniapp}"

echo "======================================"
echo "    Updating Mini App from Git...    "
echo "======================================"

if [ ! -d "$APP_DIR/.git" ]; then
    echo "Error: $APP_DIR is not a git repository. Run install.sh first."
    exit 1
fi

echo "[1/5] Pulling latest changes..."
cd "$APP_DIR"
git pull

echo "[2/5] Installing dependencies..."
cd "$APP_DIR/promt/frontend"
npm install

echo "[3/5] Building for production..."
npm run build

echo "[4/5] Backend API..."
cd "$APP_DIR/promt/backend"
npm install
pm2 restart zyphex-api 2>/dev/null || pm2 start server.js --name zyphex-api
pm2 save 2>/dev/null || true

echo "[5/5] Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "======================================"
echo "    Update complete. App is live.     "
echo "======================================"
