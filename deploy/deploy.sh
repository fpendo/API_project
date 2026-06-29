#!/bin/bash
#
# NEMX Portal Deployment Script
# Run this on your VPS after initial setup
#
# Usage: ./deploy.sh <domain_name>
# Example: ./deploy.sh myportal.com
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name required${NC}"
    echo "Usage: ./deploy.sh <domain_name>"
    exit 1
fi

DOMAIN=$1
APP_DIR="/opt/app"
NEMX_DIR="$APP_DIR/nemx"
PORTAL_DIR="$APP_DIR/portal"
WEB_DIR="/var/www"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  NEMX Portal Deployment${NC}"
echo -e "${GREEN}  Domain: $DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Install system dependencies
echo -e "\n${YELLOW}[1/10] Installing system dependencies...${NC}"
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx python3 python3-pip python3-venv nodejs npm git

# Install Node.js 20 if needed
if ! command_exists node || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Step 2: Create directory structure
echo -e "\n${YELLOW}[2/10] Creating directory structure...${NC}"
sudo mkdir -p $APP_DIR
sudo mkdir -p $NEMX_DIR
sudo mkdir -p $PORTAL_DIR
sudo mkdir -p $WEB_DIR/portal
sudo mkdir -p $WEB_DIR/nemx

# Set ownership
sudo chown -R $USER:$USER $APP_DIR

# Step 3: Copy application files
echo -e "\n${YELLOW}[3/10] Copying application files...${NC}"
# Assuming this script is run from the project root
cp -r backend $NEMX_DIR/
cp -r contracts $NEMX_DIR/
cp -r scripts $NEMX_DIR/
cp package*.json $NEMX_DIR/
cp hardhat.config.ts $NEMX_DIR/
cp tsconfig.json $NEMX_DIR/
cp -r portal/backend $PORTAL_DIR/
cp -r portal/frontend $PORTAL_DIR/

# Step 4: Install NEMX dependencies
echo -e "\n${YELLOW}[4/10] Installing NEMX dependencies...${NC}"
cd $NEMX_DIR

# Node.js dependencies (for Hardhat)
npm ci --production=false

# Python backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Step 5: Install Portal dependencies
echo -e "\n${YELLOW}[5/10] Installing Portal dependencies...${NC}"
cd $PORTAL_DIR

# Portal backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Portal frontend
cd ../frontend
npm ci
npm run build

# Copy portal build to web directory
sudo cp -r dist/* $WEB_DIR/portal/

# Step 6: Build NEMX frontend
echo -e "\n${YELLOW}[6/10] Building NEMX frontend...${NC}"
cd $NEMX_DIR/backend/frontend
npm ci
npm run build

# Copy nemx build to web directory
sudo cp -r dist/* $WEB_DIR/nemx/

# Step 7: Configure Nginx
echo -e "\n${YELLOW}[7/10] Configuring Nginx...${NC}"
# Replace domain in nginx config
sudo cp deploy/nginx/portal.conf /etc/nginx/sites-available/portal
sudo sed -i "s/DOMAIN_NAME/$DOMAIN/g" /etc/nginx/sites-available/portal
sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Step 8: Set up SSL with Let's Encrypt
echo -e "\n${YELLOW}[8/10] Setting up SSL certificate...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# Step 9: Install systemd services
echo -e "\n${YELLOW}[9/10] Installing systemd services...${NC}"
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable hardhat portal-backend nemx-backend
sudo systemctl start hardhat
sleep 5  # Wait for Hardhat to start
sudo systemctl start portal-backend nemx-backend

# Restart nginx
sudo systemctl restart nginx

# Step 10: Deploy contracts
echo -e "\n${YELLOW}[10/10] Deploying smart contracts...${NC}"
cd $NEMX_DIR
npx hardhat run scripts/deploy.ts --network localhost

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Your portal is now available at: https://$DOMAIN"
echo -e ""
echo -e "${YELLOW}Important next steps:${NC}"
echo -e "1. Set portal credentials in: $PORTAL_DIR/backend/.env"
echo -e "   PORTAL_USERNAME=your_username"
echo -e "   PORTAL_PASSWORD=your_secure_password"
echo -e ""
echo -e "2. Set NEMX environment in: $NEMX_DIR/backend/.env"
echo -e ""
echo -e "3. Restart services after config changes:"
echo -e "   sudo systemctl restart portal-backend nemx-backend"
echo -e ""
echo -e "4. View logs:"
echo -e "   sudo journalctl -u portal-backend -f"
echo -e "   sudo journalctl -u nemx-backend -f"
echo -e "   sudo journalctl -u hardhat -f"

