# Deployment Quick Start

This guide will get your NEMX Portal online in under 30 minutes.

## What You'll Need

1. **A domain name** (~$10-15/year from Namecheap, GoDaddy, or Cloudflare)
2. **A VPS** (~$12/month from DigitalOcean, Linode, or Vultr)
3. **30 minutes** of your time

---

## Step 1: Buy a Domain (5 minutes)

1. Go to [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com), or [Cloudflare](https://cloudflare.com)
2. Search for your desired domain name
3. Purchase it (usually $10-15/year for .com)

---

## Step 2: Create a VPS (5 minutes)

### Recommended: DigitalOcean

1. Go to [DigitalOcean](https://digitalocean.com) and create an account
2. Click **Create** → **Droplets**
3. Choose:
   - **Image**: Ubuntu 24.04
   - **Size**: Basic → $12/mo (2GB RAM)
   - **Region**: Closest to you
   - **Authentication**: SSH Key (recommended) or Password
4. Click **Create Droplet**
5. Note the **IP Address** shown

---

## Step 3: Point Domain to VPS (2 minutes)

1. Go to your domain registrar's DNS settings
2. Add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 300 |
| A | www | YOUR_VPS_IP | 300 |

Replace `YOUR_VPS_IP` with your VPS's IP address.

---

## Step 4: Deploy (15 minutes)

### Connect to your VPS

```bash
ssh root@YOUR_VPS_IP
```

### Run setup script

```bash
# Install dependencies
apt update && apt install -y git curl

# Clone the project
cd /opt
git clone https://github.com/YOUR_USERNAME/API_project.git app
cd app

# Make scripts executable
chmod +x deploy/*.sh

# Run initial setup
./deploy/setup-vps.sh

# Deploy with your domain
./deploy/deploy.sh yourdomain.com
```

---

## Step 5: Configure Credentials (3 minutes)

```bash
# Edit portal credentials
nano /opt/app/portal/backend/.env
```

Add these lines:
```
PORTAL_USERNAME=admin
PORTAL_PASSWORD=YourSecurePassword123!
SECRET_KEY=paste_generated_key_here
```

Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Restart services:
```bash
systemctl restart portal-backend nemx-backend
```

---

## Done!

Your portal is now live at: `https://yourdomain.com`

- **Login**: Use the username/password you set in Step 5
- **NEMX**: Click the NEMX card after logging in

---

## Troubleshooting

### "502 Bad Gateway"
```bash
systemctl status portal-backend nemx-backend
journalctl -u portal-backend -n 50
```

### "Connection Refused"
```bash
# Check if services are running
systemctl status nginx portal-backend nemx-backend hardhat
```

### SSL Certificate Failed
Wait for DNS propagation (can take up to 48 hours), then:
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Adding More Projects

To add another project to the portal:

1. Edit `portal/frontend/src/pages/Dashboard.tsx`
2. Add a new entry to the `projects` array:
```tsx
{
  id: 'new-project',
  name: 'My New Project',
  description: 'Description here',
  icon: (/* SVG icon */),
  href: '/new-project/',
  gradient: 'from-blue-500 to-indigo-600',
  status: 'active',
},
```
3. Rebuild and redeploy the portal frontend

---

## Need Help?

- Check the full guide: `deploy/README.md`
- View logs: `journalctl -u service-name -f`
- Restart everything: `systemctl restart portal-backend nemx-backend hardhat nginx`

