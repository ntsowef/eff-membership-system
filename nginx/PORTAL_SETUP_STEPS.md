# Portal Setup - Step by Step Guide

## Architecture (Option B)

- **Backend API**: `https://api.effmemberportal.org` (already working)
- **Frontend Portal**: `https://portal.effmemberportal.org` (new)

Frontend calls backend via the API domain.

---

## Step 1: Deploy NO-SSL Config

On the server:

```bash
# Copy NO-SSL config
sudo cp /var/www/eff-membership-system/nginx/portal.effmemberportal.org.NO-SSL.conf \
    /etc/nginx/sites-available/portal.effmemberportal.org

# Enable it
sudo ln -sf /etc/nginx/sites-available/portal.effmemberportal.org \
    /etc/nginx/sites-enabled/portal.effmemberportal.org

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 2: Test HTTP Works

```bash
# Test locally with Host header
curl -v http://localhost -H "Host: portal.effmemberportal.org"

# Should return HTTP/1.1 200 OK and HTML content
```

If this works, portal nginx is configured correctly.

---

## Step 3: Get SSL Certificate

Use Certbot with nginx plugin (easiest):

```bash
sudo certbot --nginx -d portal.effmemberportal.org
```

Certbot will:
1. Validate domain ownership via HTTP challenge
2. Obtain certificate
3. Automatically update nginx config with SSL

---

## Step 4: Replace with Full SSL Config

After Certbot succeeds:

```bash
# Copy full SSL config
sudo cp /var/www/eff-membership-system/nginx/portal.effmemberportal.org.conf \
    /etc/nginx/sites-available/portal.effmemberportal.org

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5: Update Frontend Environment

Edit `/var/www/eff-membership-system/frontend/.env.production`:

```env
VITE_API_URL=https://api.effmemberportal.org/api
VITE_SOCKET_URL=https://api.effmemberportal.org
```

Rebuild frontend:

```bash
cd /var/www/eff-membership-system/frontend
npm run build
```

---

## Step 6: Verify Everything Works

```bash
# Test HTTPS
curl -I https://portal.effmemberportal.org

# Should return HTTP/2 200 OK

# Test API proxy
curl -I https://portal.effmemberportal.org/api/v1/health

# Should return backend health response
```

---

## Troubleshooting

### If HTTP doesn't work (Step 2)

Check logs:
```bash
tail -f /var/log/nginx/portal.effmemberportal-error.log
```

Check if frontend dist exists:
```bash
ls -la /var/www/eff-membership-system/frontend/dist/
```

### If Certbot fails

Make sure:
- DNS resolves: `dig portal.effmemberportal.org +short`
- Port 80 is open and nginx is running
- No firewall blocking port 80

Try standalone mode:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d portal.effmemberportal.org
sudo systemctl start nginx
```

### If SSL works but API calls fail

Check backend is running:
```bash
curl -I https://api.effmemberportal.org/api/v1/health
```

Check nginx error logs for proxy errors.

---

## Summary

✅ Frontend: `portal.effmemberportal.org` → serves React SPA  
✅ Backend: `api.effmemberportal.org` → handles API requests  
✅ Frontend calls backend via API domain (cross-origin, but same parent domain)

