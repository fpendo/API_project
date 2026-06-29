#!/bin/bash
#
# VPS Initial Setup Script
# Run this first on a fresh VPS (Ubuntu 22.04/24.04)
#
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/deploy/setup-vps.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VPS Initial Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Update system
echo -e "\n${YELLOW}Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo -e "\n${YELLOW}Installing essential tools...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    ufw \
    fail2ban

# Configure firewall
echo -e "\n${YELLOW}Configuring firewall...${NC}"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Configure fail2ban
echo -e "\n${YELLOW}Configuring fail2ban...${NC}"
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create app user (optional - for better security)
echo -e "\n${YELLOW}Creating app directory...${NC}"
sudo mkdir -p /opt/app
sudo chown $USER:$USER /opt/app

# Install Node.js 20
echo -e "\n${YELLOW}Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3
echo -e "\n${YELLOW}Installing Python 3...${NC}"
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx
echo -e "\n${YELLOW}Installing Nginx...${NC}"
sudo apt install -y nginx

# Install Certbot
echo -e "\n${YELLOW}Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  VPS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "${YELLOW}Installed:${NC}"
echo -e "  - Node.js $(node -v)"
echo -e "  - Python $(python3 --version)"
echo -e "  - Nginx $(nginx -v 2>&1)"
echo -e "  - Certbot"
echo -e "  - UFW Firewall (ports 22, 80, 443 open)"
echo -e "  - Fail2ban"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Point your domain's DNS A record to this server's IP"
echo -e "2. Clone your project to /opt/app"
echo -e "3. Run ./deploy/deploy.sh <your-domain.com>"

