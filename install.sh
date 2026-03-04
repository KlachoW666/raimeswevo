#!/bin/bash

# Debian 13 Setup Script for Telegram Mini App (Run as Root)
set -e

echo "======================================"
echo "    Starting Debian 13 Setup...       "
echo "======================================"

# 1. Update system and install basic dependencies
echo "[1/6] Updating system..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx build-essential ufw

# 2. Setup UFW Firewall (ports 80, 443 must be open for web access)
echo "[2/6] Configuring Firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "UFW status: $(ufw status | head -5)"

# 3. Install Node.js & npm (via NodeSource 20.x)
echo "[3/6] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 4. Clone or update repository
echo "[4/6] Setting up Application..."
APP_DIR="/var/www/miniapp"
REPO_URL="https://github.com/KlachoW666/afdsghjklsgdhy65.git"

if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repo (database and settings are preserved)..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    cd - >/dev/null
else
    if [ -d "$APP_DIR" ]; then
        echo "Removing non-git directory..."
        rm -rf "$APP_DIR"
    fi
    git clone "$REPO_URL" "$APP_DIR"
fi

# --- Frontend ---
echo "[4a/6] Building Frontend..."
cd "$APP_DIR/promt/frontend"
npm install
echo "Building for production..."
npm run build

# --- Backend API (required for auth, wallet, exchange) — port 3001 to avoid conflict with other app on 3000 ---
BACKEND_PORT="${BACKEND_PORT:-3001}"
echo "[4b/6] Setting up Backend API (port $BACKEND_PORT)..."
cd "$APP_DIR/promt/backend"
npm install
if pm2 describe zyphex-api >/dev/null 2>&1; then
    echo "Restarting backend (zyphex-api)..."
    pm2 delete zyphex-api 2>/dev/null || true
fi
echo "Starting backend (zyphex-api) on port $BACKEND_PORT..."
PORT=$BACKEND_PORT pm2 start server.js --name zyphex-api --cwd "$APP_DIR/promt/backend"
pm2 save 2>/dev/null || true
pm2 startup 2>/dev/null || true

# 5. Configure Nginx (HTTP + HTTPS) for domain zyphex.ru
echo "[5/6] Configuring Nginx..."
DOMAIN="${DOMAIN:-zyphex.ru}"
SERVER_IP="${SERVER_IP:-188.127.230.83}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
SSL_DIR="/etc/nginx/ssl/miniapp"
mkdir -p "$SSL_DIR"

# Self-signed cert for domain (used until/if Let's Encrypt is obtained)
if [ ! -f "$SSL_DIR/cert.pem" ]; then
    echo "Generating self-signed SSL certificate for $DOMAIN..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN,IP:$SERVER_IP"
    chmod 600 "$SSL_DIR/key.pem"
fi

NGINX_CONF="/etc/nginx/sites-available/miniapp"
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;

    ssl_certificate     $SSL_DIR/cert.pem;
    ssl_certificate_key $SSL_DIR/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /var/www/miniapp/promt/frontend/dist;
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

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx 2>/dev/null || true

# Optional: Let's Encrypt for domain (run if A-record zyphex.ru -> $SERVER_IP)
if command -v certbot >/dev/null 2>&1; then
    echo "Trying Let's Encrypt for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-admin@zyphex.ru}" 2>/dev/null && systemctl reload nginx 2>/dev/null || echo "  (certbot skipped or failed — using self-signed; run manually later if needed)"
fi

# 6. Final Instructions
echo "======================================"
echo "          Setup Complete!             "
echo "======================================"
echo ""
echo "Mini App URL (BotFather -> Mini App):"
echo "  https://$DOMAIN"
echo ""
echo "Domain:    $DOMAIN, www.$DOMAIN (VPS $SERVER_IP)"
echo "Frontend:  Nginx from $APP_DIR/promt/frontend/dist (HTTP -> HTTPS)"
echo "Backend:   pm2 port $BACKEND_PORT, Nginx proxies /api/"
echo "Database:  $APP_DIR/promt/backend/data/zyphex.db (preserved on update)"
echo ""
echo "If connection refused: open ports 80,443 in hosting firewall; pm2 list; systemctl status nginx"
echo "Check:     pm2 list && pm2 logs zyphex-api --lines 5"
echo ""
echo "To get Let's Encrypt cert later: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "======================================"
