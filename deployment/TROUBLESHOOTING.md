# Troubleshooting Guide
## EFF Membership Management System - Split Architecture

**Version:** 1.0  
**Last Updated:** 2025-10-24

---

## 📋 Table of Contents

1. [Backend Server Issues](#backend-server-issues)
2. [Frontend Server Issues](#frontend-server-issues)
3. [Database Issues](#database-issues)
4. [Network & Connectivity Issues](#network--connectivity-issues)
5. [Performance Issues](#performance-issues)
6. [Common Error Messages](#common-error-messages)

---

## 🔧 Backend Server Issues

### API Not Responding

**Symptoms:**
- Frontend cannot connect to API
- 502 Bad Gateway errors
- Connection timeout

**Diagnosis:**
```bash
# Check if API is running
pm2 status

# Check API logs
pm2 logs eff-api --lines 100

# Test API locally
curl http://localhost:5000/api/v1/health

# Check if port is listening
sudo netstat -tulpn | grep 5000
```

**Solutions:**

1. **Restart API:**
   ```bash
   pm2 restart eff-api
   ```

2. **Check environment variables:**
   ```bash
   cd /opt/eff-membership/backend
   cat .env | grep -v PASSWORD
   ```

3. **Check for errors in code:**
   ```bash
   cd /opt/eff-membership/backend
   npm run build
   node dist/app.js
   ```

4. **Check firewall:**
   ```bash
   sudo ufw status
   # Ensure frontend server IP is allowed
   ```

### Docker Services Not Starting

**Symptoms:**
- PostgreSQL container not running
- Redis container not running
- Docker compose errors

**Diagnosis:**
```bash
# Check container status
docker ps -a

# Check container logs
docker logs eff-membership-postgres
docker logs eff-membership-redis

# Check Docker daemon
sudo systemctl status docker
```

**Solutions:**

1. **Restart Docker services:**
   ```bash
   cd /opt/eff-membership
   docker compose -f docker-compose.postgres.yml down
   docker compose -f docker-compose.postgres.yml up -d
   ```

2. **Check disk space:**
   ```bash
   df -h
   # If disk is full, clean up old logs and backups
   ```

3. **Check Docker logs:**
   ```bash
   sudo journalctl -u docker -n 100
   ```

4. **Recreate containers:**
   ```bash
   docker compose -f docker-compose.postgres.yml down -v
   docker compose -f docker-compose.postgres.yml up -d
   ```

### PM2 Process Crashes

**Symptoms:**
- API keeps restarting
- PM2 shows "errored" status
- High restart count

**Diagnosis:**
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs eff-api --err --lines 100

# Check system resources
htop
free -h
```

**Solutions:**

1. **Check for memory leaks:**
   ```bash
   pm2 monit
   # If memory keeps growing, restart and investigate
   ```

2. **Increase memory limit:**
   ```bash
   pm2 delete eff-api
   pm2 start dist/app.js --name eff-api --max-memory-restart 2G
   ```

3. **Check for uncaught exceptions:**
   ```bash
   pm2 logs eff-api | grep -i "error\|exception"
   ```

4. **Reset PM2:**
   ```bash
   pm2 kill
   pm2 start ecosystem.config.js --env production
   ```

---

## 🌐 Frontend Server Issues

### Nginx Not Serving Frontend

**Symptoms:**
- 404 errors
- Blank page
- "Welcome to nginx" default page

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /opt/eff-membership/logs/nginx/error.log
```

**Solutions:**

1. **Check if build exists:**
   ```bash
   ls -lh /opt/eff-membership/frontend/dist/
   ```

2. **Rebuild frontend:**
   ```bash
   cd /opt/eff-membership/frontend
   npm run build
   ```

3. **Check Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/eff-membership
   # Verify root path points to correct directory
   ```

4. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### SSL Certificate Issues

**Symptoms:**
- "Your connection is not private" error
- SSL certificate expired
- Mixed content warnings

**Diagnosis:**
```bash
# Check certificate expiry
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions:**

1. **Renew certificate:**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

2. **Force renewal:**
   ```bash
   sudo certbot renew --force-renewal
   ```

3. **Check auto-renewal:**
   ```bash
   sudo systemctl status certbot.timer
   ```

4. **Reinstall certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### API Proxy Not Working

**Symptoms:**
- API calls fail from frontend
- CORS errors
- 502 Bad Gateway

**Diagnosis:**
```bash
# Check Nginx configuration
sudo nginx -t

# Test backend connectivity from frontend server
curl http://BACKEND_SERVER_IP:5000/api/v1/health

# Check Nginx error logs
sudo tail -f /opt/eff-membership/logs/nginx/error.log
```

**Solutions:**

1. **Verify backend IP in Nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/eff-membership
   # Check upstream backend_api server IP
   ```

2. **Test backend connectivity:**
   ```bash
   telnet BACKEND_SERVER_IP 5000
   ```

3. **Check firewall on backend:**
   ```bash
   # On backend server
   sudo ufw status
   # Ensure frontend IP is allowed
   ```

4. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## 🗄️ Database Issues

### Cannot Connect to Database

**Symptoms:**
- "Connection refused" errors
- "ECONNREFUSED" in logs
- API cannot start

**Diagnosis:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec eff-membership-postgres pg_isready -U eff_admin

# Check logs
docker logs eff-membership-postgres
```

**Solutions:**

1. **Restart PostgreSQL:**
   ```bash
   docker restart eff-membership-postgres
   ```

2. **Check environment variables:**
   ```bash
   cat /opt/eff-membership/backend/.env | grep DB_
   ```

3. **Check PostgreSQL logs:**
   ```bash
   docker logs eff-membership-postgres --tail 100
   ```

4. **Verify database exists:**
   ```bash
   docker exec eff-membership-postgres psql -U eff_admin -l
   ```

### Slow Database Queries

**Symptoms:**
- API responses are slow
- Timeouts
- High CPU usage on database

**Diagnosis:**
```bash
# Check active queries
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"

# Check slow queries
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Solutions:**

1. **Kill long-running queries:**
   ```bash
   docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes';"
   ```

2. **Analyze and vacuum:**
   ```bash
   docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "VACUUM ANALYZE;"
   ```

3. **Check indexes:**
   ```bash
   docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';"
   ```

4. **Increase connection pool:**
   ```bash
   # Edit backend/.env
   DB_CONNECTION_LIMIT=30
   # Restart API
   pm2 restart eff-api
   ```

### Database Disk Space Full

**Symptoms:**
- "No space left on device" errors
- Database writes fail
- Container stops

**Diagnosis:**
```bash
# Check disk space
df -h

# Check database size
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT pg_size_pretty(pg_database_size('eff_membership_db'));"
```

**Solutions:**

1. **Clean old backups:**
   ```bash
   find /opt/eff-membership/backups -name "*.dump" -mtime +30 -delete
   ```

2. **Clean logs:**
   ```bash
   find /opt/eff-membership/logs -name "*.log" -mtime +7 -delete
   pm2 flush
   ```

3. **Vacuum database:**
   ```bash
   docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "VACUUM FULL;"
   ```

---

## 🌍 Network & Connectivity Issues

### Frontend Cannot Reach Backend

**Symptoms:**
- API calls timeout
- Network errors in browser console
- 504 Gateway Timeout

**Diagnosis:**
```bash
# From frontend server, test backend connectivity
ping BACKEND_SERVER_IP
telnet BACKEND_SERVER_IP 5000
curl http://BACKEND_SERVER_IP:5000/api/v1/health
```

**Solutions:**

1. **Check firewall on backend:**
   ```bash
   # On backend server
   sudo ufw status
   sudo ufw allow from FRONTEND_SERVER_IP to any port 5000
   ```

2. **Check network connectivity:**
   ```bash
   traceroute BACKEND_SERVER_IP
   ```

3. **Check if API is listening:**
   ```bash
   # On backend server
   sudo netstat -tulpn | grep 5000
   ```

### CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" errors in browser
- API calls blocked by browser

**Diagnosis:**
```bash
# Check CORS configuration
cat /opt/eff-membership/backend/.env | grep CORS_ORIGIN
```

**Solutions:**

1. **Update CORS origin:**
   ```bash
   # Edit backend/.env
   CORS_ORIGIN=https://your-frontend-domain.com
   # Restart API
   pm2 restart eff-api
   ```

2. **Check Nginx proxy headers:**
   ```bash
   sudo nano /etc/nginx/sites-available/eff-membership
   # Ensure proxy headers are set correctly
   ```

---

## ⚡ Performance Issues

### High CPU Usage

**Diagnosis:**
```bash
# Check top processes
top -o %CPU

# Check PM2 processes
pm2 monit
```

**Solutions:**

1. **Identify problematic process:**
   ```bash
   ps aux | sort -nrk 3,3 | head -n 5
   ```

2. **Restart API:**
   ```bash
   pm2 restart eff-api
   ```

3. **Scale with PM2 cluster mode:**
   ```bash
   pm2 delete eff-api
   pm2 start ecosystem.config.js --env production
   ```

### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
free -h
pm2 monit
```

**Solutions:**

1. **Restart services:**
   ```bash
   pm2 restart all
   docker restart eff-membership-postgres eff-membership-redis
   ```

2. **Clear Redis cache:**
   ```bash
   docker exec eff-membership-redis redis-cli FLUSHDB
   ```

3. **Check for memory leaks:**
   ```bash
   pm2 logs eff-api | grep -i "memory"
   ```

---

## ❌ Common Error Messages

### "ECONNREFUSED"
**Cause:** Cannot connect to database or Redis  
**Solution:** Check if Docker containers are running, verify connection settings

### "JWT malformed"
**Cause:** Invalid or expired JWT token  
**Solution:** Clear browser cache, re-login

### "Port 5000 already in use"
**Cause:** Another process is using port 5000  
**Solution:** `sudo lsof -i :5000` and kill the process, or change port

### "Permission denied"
**Cause:** Insufficient file permissions  
**Solution:** `sudo chown -R user:user /opt/eff-membership`

### "502 Bad Gateway"
**Cause:** Nginx cannot reach backend  
**Solution:** Check backend is running, verify firewall rules

---

## 📞 Getting Help

If issues persist:

1. **Collect diagnostic information:**
   ```bash
   /opt/eff-membership/health-check-backend.sh > diagnostic.txt
   pm2 logs --lines 200 >> diagnostic.txt
   docker logs eff-membership-postgres --tail 100 >> diagnostic.txt
   ```

2. **Check logs:**
   - Backend: `/opt/eff-membership/logs/backend/`
   - PM2: `/opt/eff-membership/logs/pm2/`
   - Nginx: `/opt/eff-membership/logs/nginx/`
   - Docker: `docker logs <container-name>`

3. **Contact support with:**
   - Error messages
   - Diagnostic information
   - Steps to reproduce
   - Server specifications

---

**End of Troubleshooting Guide**

