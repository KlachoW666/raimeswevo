#!/bin/bash
# Start/update Mini App (Zyphex). Run from /root: ./start.sh
# First-time setup: run install.sh once.

set -e

APP_DIR="/var/www/miniapp"
REPO_URL="https://github.com/KlachoW666/afdsghjklsgdhy65.git"
BACKEND_PORT="${BACKEND_PORT:-3001}"
DOMAIN="${DOMAIN:-zyphex.ru}"
SERVER_IP="${SERVER_IP:-188.127.230.83}"
SSL_DIR="/etc/nginx/ssl/miniapp"

echo "======================================"
echo "    Mini App — start/update           "
echo "======================================"

# Check app directory
if [ ! -d "$APP_DIR" ]; then
    echo "Error: $APP_DIR not found. Run install.sh first (full setup)."
    exit 1
fi

# 1. Update from git
echo "[1/4] Updating from git..."
cd "$APP_DIR"
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
    echo "Repo updated."
else
    echo "Not a git repo, cloning..."
    if [ -n "$(ls -A $APP_DIR 2>/dev/null)" ]; then
        echo "Error: $APP_DIR exists but is not a git repo. Run install.sh or clean the directory."
        exit 1
    fi
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 2. Frontend
echo "[2/4] Building frontend..."
cd "$APP_DIR/promt/frontend"
npm install
if ! npm run build; then
    echo "ERROR: Frontend build failed. Fix errors above and re-run."
    exit 1
fi
if [ ! -f "$APP_DIR/promt/frontend/dist/index.html" ]; then
    echo "ERROR: dist/index.html missing after build."
    exit 1
fi
echo "Frontend built."

# 3. Backend + pm2 (always start with correct cwd so DB path and imports resolve)
echo "[3/4] Backend (zyphex-api)..."
cd "$APP_DIR/promt/backend"
npm install
BACKEND_DIR="$APP_DIR/promt/backend"
if pm2 describe zyphex-api >/dev/null 2>&1; then
    pm2 delete zyphex-api 2>/dev/null || true
fi
PORT=$BACKEND_PORT pm2 start server.js --name zyphex-api --cwd "$BACKEND_DIR"
echo "Backend started on port $BACKEND_PORT (cwd=$BACKEND_DIR)."
pm2 save 2>/dev/null || true
sleep 2
if curl -sf --max-time 5 "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
    echo "  API health check OK (port $BACKEND_PORT)."
else
    echo "  WARNING: API health check failed. Run: pm2 logs zyphex-api"
fi

# 4. Nginx (landing at /, Mini App at /miniapp, API at /api)
echo "[4/4] Nginx..."
NGINX_CONF="/etc/nginx/sites-available/miniapp"
CERT_PEM="$SSL_DIR/cert.pem"
KEY_PEM="$SSL_DIR/key.pem"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  CERT_PEM="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  KEY_PEM="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
  echo "  Using Let's Encrypt certificate for $DOMAIN"
fi
if [ -f "$CERT_PEM" ] && [ -f "$KEY_PEM" ]; then
  STAPLING=""
  [ -f "/etc/letsencrypt/live/$DOMAIN/chain.pem" ] && STAPLING="ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;"
  mkdir -p /var/www/miniapp/.well-known/acme-challenge
  chmod -R 755 /var/www/miniapp/.well-known 2>/dev/null || true
  cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/miniapp;
        allow all;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;

    ssl_certificate     $CERT_PEM;
    ssl_certificate_key $KEY_PEM;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    $STAPLING
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root $APP_DIR/promt/landing;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /miniapp {
        return 301 \$scheme://\$host/miniapp/\$is_args\$args;
    }

    location /miniapp/ {
        alias $APP_DIR/promt/frontend/dist/;
        try_files \$uri /miniapp/index.html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF
fi
if command -v nginx >/dev/null 2>&1; then
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
    echo "Nginx reloaded/started."
else
    echo "Nginx not installed (optional if using install.sh)."
fi

echo ""
echo "======================================"
echo "    Done. App should be running.      "
echo "======================================"
echo "  Landing:  https://$DOMAIN/"
echo "  Mini App: https://$DOMAIN/miniapp (set in BotFather)"
echo "  Backend:  pm2 list && pm2 logs zyphex-api (port $BACKEND_PORT)"
echo "  API test: curl -s http://127.0.0.1:$BACKEND_PORT/api/zyphex/rate"
echo "======================================"
