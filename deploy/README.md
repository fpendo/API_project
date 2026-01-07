# Deployment Guide

This guide walks you through deploying the NEMX Portal to a VPS (DigitalOcean, Linode, AWS EC2, etc.).

## Prerequisites

1. **Domain Name**: Purchase a domain from any registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. **VPS**: A Linux server with at least 2GB RAM (Ubuntu 22.04/24.04 recommended)
3. **SSH Access**: Ability to SSH into your VPS

## Recommended VPS Providers

| Provider | Plan | Price | Notes |
|----------|------|-------|-------|
| DigitalOcean | Basic Droplet | $12/month | 2GB RAM, easy to use |
| Linode | Nanode | $12/month | 2GB RAM, good performance |
| AWS EC2 | t3.small | ~$15/month | 2GB RAM, free tier available |
| Vultr | Cloud Compute | $12/month | 2GB RAM, global locations |

## Quick Start

### Step 1: Create VPS

1. Create an account with your chosen provider
2. Create a new Ubuntu 22.04 or 24.04 server
3. Note the server's IP address
4. SSH into the server: `ssh root@YOUR_SERVER_IP`

### Step 2: Point Domain to VPS

1. Go to your domain registrar's DNS settings
2. Add an **A Record**:
   - Name: `@` (or leave blank)
   - Value: Your VPS IP address
   - TTL: 300 (or lowest available)
3. Add another **A Record** for www:
   - Name: `www`
   - Value: Your VPS IP address
4. Wait for DNS propagation (5 minutes to 48 hours)

### Step 3: Initial VPS Setup

SSH into your VPS and run:

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/deploy/setup-vps.sh | bash
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nginx certbot python3-certbot-nginx python3 python3-pip python3-venv nodejs npm git curl ufw

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
```

### Step 4: Clone and Deploy

```bash
# Clone your repository
cd /opt/app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git nemx-project
cd nemx-project

# Run deployment script
chmod +x deploy/deploy.sh
./deploy/deploy.sh yourdomain.com
```

### Step 5: Configure Credentials

```bash
# Set portal login credentials
sudo nano /opt/app/portal/backend/.env
```

Add:
```
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_secure_password
SECRET_KEY=generate_a_random_key_here
```

Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Restart services:
```bash
sudo systemctl restart portal-backend nemx-backend
```

## Manual Deployment Steps

If you prefer to deploy manually or the script doesn't work, follow these steps:

### 1. Install Dependencies

```bash
# System packages
sudo apt install -y nginx python3 python3-pip python3-venv

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Set Up Application Structure

```bash
sudo mkdir -p /opt/app/{nemx,portal}
sudo mkdir -p /var/www/{portal,nemx}
sudo chown -R $USER:$USER /opt/app
```

### 3. Install NEMX Backend

```bash
cd /opt/app/nemx/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Install Portal Backend

```bash
cd /opt/app/portal/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Build Frontends

```bash
# Portal frontend
cd /opt/app/portal/frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/portal/

# NEMX frontend
cd /opt/app/nemx/backend/frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/nemx/
```

### 6. Configure Nginx

```bash
# Copy and edit nginx config
sudo cp deploy/nginx/portal.conf /etc/nginx/sites-available/portal
sudo nano /etc/nginx/sites-available/portal  # Replace DOMAIN_NAME with your domain

# Enable site
sudo ln -sf /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Install Systemd Services

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hardhat portal-backend nemx-backend
sudo systemctl start hardhat portal-backend nemx-backend
```

## Service Management

### View Logs

```bash
# Portal backend logs
sudo journalctl -u portal-backend -f

# NEMX backend logs
sudo journalctl -u nemx-backend -f

# Hardhat node logs
sudo journalctl -u hardhat -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
sudo systemctl restart portal-backend
sudo systemctl restart nemx-backend
sudo systemctl restart hardhat
sudo systemctl restart nginx
```

### Check Service Status

```bash
sudo systemctl status portal-backend
sudo systemctl status nemx-backend
sudo systemctl status hardhat
sudo systemctl status nginx
```

## Backups

Run the backup script regularly:

```bash
./deploy/backup.sh /opt/backups
```

Set up a cron job for daily backups:

```bash
crontab -e
# Add this line:
0 2 * * * /opt/app/nemx-project/deploy/backup.sh /opt/backups
```

## Troubleshooting

### 502 Bad Gateway

Check if backend services are running:
```bash
sudo systemctl status portal-backend nemx-backend
```

Check backend logs for errors:
```bash
sudo journalctl -u portal-backend -n 50
sudo journalctl -u nemx-backend -n 50
```

### SSL Certificate Issues

Renew certificate manually:
```bash
sudo certbot renew --dry-run
```

### Database Issues

Reset NEMX database:
```bash
cd /opt/app/nemx/backend
source venv/bin/activate
python reset_db.py --seed --yes
python post_reset_fix.py --yes
```

### Hardhat Node Issues

Check if contracts are deployed:
```bash
cd /opt/app/nemx
npx hardhat run scripts/deploy.ts --network localhost
```

## Security Recommendations

1. **Change default credentials immediately**
2. **Use strong passwords** (20+ characters)
3. **Enable automatic security updates**: `sudo apt install unattended-upgrades`
4. **Set up fail2ban** for brute force protection
5. **Regular backups** - at minimum daily
6. **Monitor logs** for suspicious activity

## Updating the Application

```bash
cd /opt/app/nemx-project
git pull origin main

# Rebuild frontends
cd portal/frontend && npm ci && npm run build
sudo cp -r dist/* /var/www/portal/

cd ../../backend/frontend && npm ci && npm run build
sudo cp -r dist/* /var/www/nemx/

# Restart services
sudo systemctl restart portal-backend nemx-backend
```

