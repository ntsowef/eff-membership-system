# Portal Deployment Guide - portal.effmemberportal.org

## Overview

This guide covers deploying the frontend to the same server as the backend, accessible via `portal.effmemberportal.org`.

## Architecture

```
Internet → Nginx (443/80) → Frontend Static Files (/frontend/dist)
                          → Backend API (127.0.0.1:5000)
                          → WebSocket (127.0.0.1:5000)
```

## Files Created

| File | Purpose |
|------|---------|
| `portal.effmemberportal.org.conf` | Nginx config with SSL |
| `portal.effmemberportal.org.NO-SSL.conf` | Nginx config without SSL (for initial setup) |
| `ecosystem.portal.config.js` | PM2 configuration for backend |

---

## Step-by-Step Deployment

### Step 1: DNS Configuration

Add an A record for `portal.effmemberportal.org` pointing to your server IP.

### Step 2: Deploy Frontend Files

```bash
# On the server
cd /var/www/eff-membership-system

# Pull latest code
git pull origin main

# Build frontend
cd frontend
npm install
npm run build

# Verify dist folder exists
ls -la dist/
```

### Step 3: Install Nginx Config (NO-SSL first)

```bash
# Copy NO-SSL config first
sudo cp nginx/portal.effmemberportal.org.NO-SSL.conf /etc/nginx/sites-available/portal.effmemberportal.org

# Enable the site
sudo ln -sf /etc/nginx/sites-available/portal.effmemberportal.org /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4: Install SSL with Certbot

```bash
# Install Certbot if not already installed
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d portal.effmemberportal.org

# Certbot will automatically update your Nginx config
```

### Step 5: Start Backend with PM2

```bash
cd /var/www/eff-membership-system

# Create logs directory
mkdir -p logs

# Start backend
pm2 start ecosystem.portal.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Test the site
curl -I https://portal.effmemberportal.org
curl https://portal.effmemberportal.org/api/v1/health
```

---

## Important Commands

```bash
# Restart backend
pm2 restart eff-backend

# View backend logs
pm2 logs eff-backend --lines 50

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
tail -f /var/log/nginx/portal.effmemberportal-error.log

# Rebuild frontend
cd /var/www/eff-membership-system/frontend && npm run build
```

---

## Frontend Environment

Make sure `/var/www/eff-membership-system/frontend/.env.production` contains:

```env
VITE_API_URL=https://portal.effmemberportal.org/api
VITE_SOCKET_URL=https://portal.effmemberportal.org
```

Then rebuild: `npm run build`

---

## Troubleshooting

### 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Check backend logs: `pm2 logs eff-backend`
- Verify port 5000 is listening: `netstat -tlnp | grep 5000`

### Frontend not loading
- Check dist folder exists: `ls -la /var/www/eff-membership-system/frontend/dist`
- Check Nginx config: `sudo nginx -t`
- Check Nginx logs: `tail -f /var/log/nginx/portal.effmemberportal-error.log`

### WebSocket not connecting
- Ensure `/socket.io` location block exists in Nginx
- Check for proxy timeout settings

