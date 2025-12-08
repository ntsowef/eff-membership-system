# ⚡ Quick Start - Production Deployment

**For**: EFF Membership Management System  
**Status**: ✅ Production builds ready  
**Time**: ~15 minutes

---

## 🚀 Fastest Way to Deploy (Same Server)

### Prerequisites
- Ubuntu 22.04 or similar Linux server
- Node.js 18+ or 20+ installed
- PostgreSQL 14+ installed and running
- Redis 7+ installed and running
- Nginx installed

---

## Step 1: Configure Environment (2 minutes)

```bash
cd backend

# Copy example .env or create new one
nano .env
```

**Minimum required settings:**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://eff_user:YOUR_PASSWORD@localhost:5432/eff_membership_database
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
JWT_SECRET=YOUR_64_CHAR_SECRET_HERE
JWT_REFRESH_SECRET=YOUR_ANOTHER_64_CHAR_SECRET
CORS_ORIGIN=http://localhost:3000
```

**Generate secrets:**
```bash
openssl rand -base64 64
```

---

## Step 2: Setup Database (3 minutes)

```bash
# Create database
sudo -u postgres psql
```

```sql
CREATE DATABASE eff_membership_database;
CREATE USER eff_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE eff_membership_database TO eff_user;
\q
```

```bash
# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## Step 3: Install PM2 (1 minute)

```bash
sudo npm install -g pm2
```

---

## Step 4: Start Backend (1 minute)

```bash
cd backend

# Install production dependencies (if not already done)
npm install --production

# Start with PM2
pm2 start dist/app.js --name eff-membership-backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

**Verify backend is running:**
```bash
curl http://localhost:5000/api/v1/health
# Should return: {"status":"healthy",...}
```

---

## Step 5: Configure Nginx (5 minutes)

```bash
sudo nano /etc/nginx/sites-available/eff-membership
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name localhost;  # Change to your domain

    # Frontend
    location / {
        root /path/to/Membership-newV2/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable and start:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/eff-membership /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 6: Test Everything (3 minutes)

### Test Backend
```bash
curl http://localhost:5000/api/v1/health
```

### Test Frontend
Open browser: `http://localhost` or `http://your-server-ip`

### Test User Profile Update (THE FIX!)
1. Login to the application
2. Go to Profile page
3. Update your name and email
4. Click Save
5. Should see success message! ✅

---

## ✅ You're Done!

Your application is now running in production mode:
- **Backend**: http://localhost:5000 (proxied through Nginx)
- **Frontend**: http://localhost (served by Nginx)

---

## 📊 Monitoring

```bash
# View PM2 status
pm2 status

# View logs
pm2 logs eff-membership-backend

# Monitor in real-time
pm2 monit

# Restart backend
pm2 restart eff-membership-backend
```

---

## 🔒 Security (Do This Next!)

1. **Setup SSL/HTTPS** (Let's Encrypt):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

2. **Configure Firewall**:
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 5000/tcp  # Block direct backend access
sudo ufw enable
```

3. **Change Default Passwords**:
- Database password
- Redis password
- JWT secrets

---

## 🆘 Common Issues

### Backend won't start
```bash
pm2 logs eff-membership-backend --lines 50
```

### Can't connect to database
```bash
# Test connection
psql -U eff_user -h localhost -d eff_membership_database

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Frontend shows blank page
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify files exist
ls -la /path/to/frontend/dist/
```

---

## 📚 More Information

- **Detailed Guide**: See `PRODUCTION_BUILD_READY.md`
- **Full Deployment**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Summary**: See `DEPLOYMENT_SUMMARY.md`

---

## 🎉 Success!

Your EFF Membership Management System is now running in production with the user profile fix deployed! 🚀

