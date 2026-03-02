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
    rm -rf "$APP_DIR"
fi

git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR/frontend"

# Build the frontend application
echo "Installing NPM packages..."
npm install
echo "Building for production..."
npm run build

# 5. Configure Nginx
echo "[5/6] Configuring Nginx..."
DOMAIN="your-domain.com" # CHANGE THIS LATER

NGINX_CONF="/etc/nginx/sites-available/miniapp"
cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/miniapp/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 6. Final Instructions
echo "======================================"
echo "          Setup Complete!             "
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Point your domain A record to this server's IP address."
echo "2. Edit /etc/nginx/sites-available/miniapp and replace '_' with your domain name."
echo "3. Run SSL setup: certbot --nginx -d your-domain.com"
echo "4. Reload nginx: systemctl reload nginx"
echo ""
echo "Your app is currently being served on HTTP (Port 80) from /var/www/miniapp/frontend/dist"
echo "======================================"
