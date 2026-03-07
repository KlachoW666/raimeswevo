#!/bin/bash

# Ubuntu 24.04 Setup Script for Telegram Mini App (Run as Root)
set -e

echo "======================================"
echo "    Starting Ubuntu 24.04 Setup...    "
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
REPO_URL="https://github.com/KlachoW666/raimeswevo.git"

if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repo (database and settings are preserved)..."
    cd "$APP_DIR"
    git fetch origin
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || BRANCH=master
    git reset --hard "origin/$BRANCH"
    cd - >/dev/null
else
    if [ -d "$APP_DIR" ]; then
        echo "Removing non-git directory..."
        rm -rf "$APP_DIR"
    fi
    git clone -b master "$REPO_URL" "$APP_DIR"
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
if pm2 describe wevox-api >/dev/null 2>&1; then
    echo "Restarting backend (wevox-api)..."
    pm2 delete wevox-api 2>/dev/null || true
fi
echo "Starting backend (wevox-api) on port $BACKEND_PORT — PM2: restart on crash and on boot."
PORT=$BACKEND_PORT pm2 start server.js --name wevox-api --cwd "$APP_DIR/promt/backend" \
    --max-restarts 999999 \
    --restart-delay 3000 \
    --exp-backoff-restart-delay 100
pm2 save 2>/dev/null || true
# Включить автозапуск PM2 при загрузке сервера (чтобы приложение всегда было включено)
if command -v pm2 >/dev/null 2>&1; then
    PM2_USER=root
    PM2_HOME=/root
    [ -n "$SUDO_USER" ] && PM2_USER="$SUDO_USER" && PM2_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    (pm2 startup systemd -u "$PM2_USER" --hp "$PM2_HOME" 2>&1 | grep -oE 'sudo[^;]+' | head -1 | bash) 2>/dev/null || true
fi

# 5. Configure Nginx (HTTP + HTTPS) for domain WEVOX.RU
echo "[5/6] Configuring Nginx..."
DOMAIN="${DOMAIN:-wevox.ru}"
SERVER_IP="${SERVER_IP:-91.219.151.56}"
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

# Prefer Let's Encrypt cert if present (so start.sh doesn't overwrite it with self-signed)
CERT_PEM="$SSL_DIR/cert.pem"
KEY_PEM="$SSL_DIR/key.pem"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  CERT_PEM="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  KEY_PEM="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
  echo "Using Let's Encrypt certificate for $DOMAIN"
fi

# Let's Encrypt ACME challenge (certbot needs this on port 80)
mkdir -p /var/www/miniapp/.well-known/acme-challenge
chmod -R 755 /var/www/miniapp/.well-known 2>/dev/null || true

# Современные шифры для Telegram/Chromium (избегаем ERR_SSL_VERSION_OR_CIPHER_MISMATCH)
SSL_CIPHERS="ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384"

NGINX_CONF="/etc/nginx/sites-available/miniapp"
cat > "$NGINX_CONF" << NGINXEOF
# Redirect IP to canonical domain (WEVOX.RU)
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    return 301 https://$DOMAIN\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $SERVER_IP;
    ssl_certificate     $CERT_PEM;
    ssl_certificate_key  $KEY_PEM;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         $SSL_CIPHERS;
    ssl_prefer_server_ciphers on;
    return 301 https://$DOMAIN\$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

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
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     $CERT_PEM;
    ssl_certificate_key $KEY_PEM;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         $SSL_CIPHERS;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/miniapp/promt/landing;
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
        alias /var/www/miniapp/promt/frontend/dist/;
        try_files \$uri /miniapp/index.html;
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

# Optional: Let's Encrypt (run if DNS A-record points $DOMAIN to this server)
if command -v certbot >/dev/null 2>&1; then
    echo "Trying Let's Encrypt for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "${CERTBOT_EMAIL:-admin@wevox.ru}" 2>/dev/null || true
    certbot --nginx -d "www.$DOMAIN" --non-interactive 2>/dev/null || true
fi

# Re-apply full Nginx config (certbot may have overwritten it): keep our locations, use LE cert if present
CERT_PEM="$SSL_DIR/cert.pem"
KEY_PEM="$SSL_DIR/key.pem"
[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ] && CERT_PEM="/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && KEY_PEM="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
STAPLING=""
[ -f "/etc/letsencrypt/live/$DOMAIN/chain.pem" ] && STAPLING="ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;"
cat > "$NGINX_CONF" << NGINXEOF2
# Redirect IP to canonical domain (WEVOX.RU)
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    return 301 https://$DOMAIN\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $SERVER_IP;
    ssl_certificate     $CERT_PEM;
    ssl_certificate_key  $KEY_PEM;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         $SSL_CIPHERS;
    ssl_prefer_server_ciphers on;
    return 301 https://$DOMAIN\$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

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
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     $CERT_PEM;
    ssl_certificate_key $KEY_PEM;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         $SSL_CIPHERS;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    $STAPLING
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/miniapp/promt/landing;
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
        alias /var/www/miniapp/promt/frontend/dist/;
        try_files \$uri /miniapp/index.html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF2
nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true

# 6. Verification and summary
echo ""
echo "======================================"
echo "    Verification                     "
echo "======================================"
FAIL=0
if nginx -t 2>/dev/null; then echo "  [OK] Nginx config"; else echo "  [FAIL] Nginx config"; FAIL=1; fi
if systemctl is-active --quiet nginx 2>/dev/null; then echo "  [OK] Nginx running"; else echo "  [FAIL] Nginx not running"; FAIL=1; fi
if pm2 describe wevox-api >/dev/null 2>&1; then echo "  [OK] Backend (wevox-api)"; else echo "  [FAIL] Backend not in pm2"; FAIL=1; fi
if curl -sf --max-time 3 "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1; then echo "  [OK] API health"; else echo "  [FAIL] API health check"; FAIL=1; fi
if [ -f "$APP_DIR/promt/frontend/dist/index.html" ]; then echo "  [OK] Frontend built"; else echo "  [FAIL] Frontend dist missing"; FAIL=1; fi
if [ -f "$APP_DIR/promt/landing/index.html" ]; then echo "  [OK] Landing present"; else echo "  [FAIL] Landing missing"; FAIL=1; fi
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then echo "  [OK] Let's Encrypt cert"; else echo "  [!!] No Let's Encrypt (Telegram may show 'not secure') — run: certbot --nginx -d $DOMAIN"; fi
echo "======================================"
echo "          Setup Complete             "
echo "======================================"
echo ""
echo "Mini App URL (BotFather -> Main App):  https://$DOMAIN/miniapp"
echo "Landing:   https://$DOMAIN/"
echo "Backend:   pm2 port $BACKEND_PORT, Nginx /api/"
echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "Some checks failed. Run: pm2 list; pm2 logs wevox-api; systemctl status nginx"
  echo ""
fi
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "To fix 'unsupported protocol' / 'not secure' in Telegram:"
  echo "  1) Point DNS A-record $DOMAIN to this server IP"
  echo "  2) Run: certbot --nginx -d $DOMAIN"
  echo "  3) Run: ./start.sh  (or re-run this script)"
  echo ""
fi
echo "======================================"
