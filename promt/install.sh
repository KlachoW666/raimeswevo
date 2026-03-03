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

# 2. Setup UFW Firewall
echo "[2/6] Configuring Firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# 3. Install Node.js & npm (via NodeSource 20.x)
echo "[3/6] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 4. Clone Repository & Install Dependencies
echo "[4/6] Setting up Application..."
APP_DIR="/var/www/miniapp"
REPO_URL="https://github.com/KlachoW666/afdsghjklsgdhy65.git"

if [ -d "$APP_DIR" ]; then
    echo "Removing old installation..."
    rm -rf "$APP_DIR"
fi

git clone "$REPO_URL" "$APP_DIR"

# --- Frontend ---
echo "[4a/6] Building Frontend..."
cd "$APP_DIR/promt/frontend"
npm install

# Delete stale DB if exists (PIN hashing changed)
if [ -f "$APP_DIR/promt/backend/data/zyphex.db" ]; then
    echo "Removing old database (PIN hashing changed)..."
    rm -f "$APP_DIR/promt/backend/data/zyphex.db"
fi

echo "Building for production..."
npm run build

# --- Backend ---
echo "[4b/6] Setting up Backend API..."
cd "$APP_DIR/promt/backend"
npm install
pm2 delete zyphex-api 2>/dev/null || true
pm2 start server.js --name zyphex-api
pm2 save 2>/dev/null || true
pm2 startup 2>/dev/null || true

# 5. Configure Nginx with HTTPS for Mini App (by IP)
echo "[5/6] Configuring Nginx..."
SERVER_IP="${SERVER_IP:-188.127.230.83}"
SSL_DIR="/etc/nginx/ssl/miniapp"
mkdir -p "$SSL_DIR"

# Self-signed certificate for IP (Let's Encrypt does not support IPs)
if [ ! -f "$SSL_DIR/cert.pem" ]; then
    echo "Generating self-signed SSL certificate for $SERVER_IP..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
        -subj "/CN=$SERVER_IP" \
        -addext "subjectAltName=IP:$SERVER_IP"
    chmod 600 "$SSL_DIR/key.pem"
fi

NGINX_CONF="/etc/nginx/sites-available/miniapp"
cat > $NGINX_CONF << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;

    ssl_certificate     $SSL_DIR/cert.pem;
    ssl_certificate_key $SSL_DIR/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /var/www/miniapp/promt/frontend/dist;
    index index.html;

    # API — proxy to backend
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support (for future WS endpoints)
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 6. Final Instructions
echo "======================================"
echo "          Setup Complete!             "
echo "======================================"
echo ""
echo "Mini App is served at: https://$SERVER_IP"
echo ""
echo "In Telegram BotFather set Main App URL to:"
echo "  https://$SERVER_IP"
echo ""
echo "WARNING: Self-signed certificate. Telegram will show 'Your connection is not private'."
echo "FIX: Use a domain + Let's Encrypt: point A-record to this IP, then run:"
echo "  sed -i 's/server_name _;/server_name app.your-domain.com;/' /etc/nginx/sites-available/miniapp"
echo "  certbot --nginx -d app.your-domain.com"
echo "  systemctl reload nginx"
echo "Then in BotFather set Main App URL to: https://app.your-domain.com"
echo "======================================"
