# Monitoring & Health Checks Setup Guide
## EFF Membership Management System - Split Architecture

**Version:** 1.0  
**Last Updated:** 2025-10-24

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Health Check Scripts](#health-check-scripts)
3. [PM2 Monitoring](#pm2-monitoring)
4. [Log Management](#log-management)
5. [System Monitoring](#system-monitoring)
6. [Database Monitoring](#database-monitoring)
7. [Alerting Setup](#alerting-setup)
8. [Performance Metrics](#performance-metrics)

---

## 🔍 Overview

This guide covers monitoring and health check setup for both backend and frontend servers in the split architecture deployment.

### Monitoring Components

**Backend Server:**
- PM2 process monitoring
- PostgreSQL health checks
- Redis health checks
- API endpoint monitoring
- System resource monitoring

**Frontend Server:**
- Nginx status monitoring
- Static file serving checks
- SSL certificate monitoring
- System resource monitoring

---

## 🏥 Health Check Scripts

### Backend Health Check

The backend health check script is automatically created during setup at:
`/opt/eff-membership/health-check-backend.sh`

**Run manually:**
```bash
cd /opt/eff-membership
./health-check-backend.sh
```

**Schedule with cron (every 5 minutes):**
```bash
crontab -e

# Add this line:
*/5 * * * * /opt/eff-membership/health-check-backend.sh >> /opt/eff-membership/logs/health-check.log 2>&1
```

### Frontend Health Check

The frontend health check script is automatically created during setup at:
`/opt/eff-membership/health-check-frontend.sh`

**Run manually:**
```bash
cd /opt/eff-membership
./health-check-frontend.sh
```

**Schedule with cron (every 5 minutes):**
```bash
crontab -e

# Add this line:
*/5 * * * * /opt/eff-membership/health-check-frontend.sh >> /opt/eff-membership/logs/health-check.log 2>&1
```

---

## 📊 PM2 Monitoring

### PM2 Built-in Monitoring

**View real-time monitoring:**
```bash
pm2 monit
```

**View process status:**
```bash
pm2 status
pm2 list
```

**View detailed info:**
```bash
pm2 info eff-api
pm2 describe eff-api
```

**View logs:**
```bash
# All logs
pm2 logs

# Specific app
pm2 logs eff-api

# Last 100 lines
pm2 logs --lines 100

# Follow logs
pm2 logs --lines 0
```

### PM2 Plus (Optional - Advanced Monitoring)

PM2 Plus provides advanced monitoring, alerting, and management features.

**Setup PM2 Plus:**
```bash
# Link to PM2 Plus
pm2 link <secret_key> <public_key>

# Or register
pm2 plus
```

**Features:**
- Real-time monitoring dashboard
- Custom metrics
- Exception tracking
- Log management
- Deployment tracking
- Email/Slack alerts

**Website:** https://pm2.io/plus/

---

## 📝 Log Management

### Log Locations

**Backend Server:**
```
/opt/eff-membership/logs/backend/     - Application logs
/opt/eff-membership/logs/pm2/         - PM2 logs
/var/log/docker/                      - Docker logs
```

**Frontend Server:**
```
/opt/eff-membership/logs/nginx/       - Nginx logs
/var/log/nginx/                       - System Nginx logs
```

### View Logs

**Backend API logs:**
```bash
# PM2 logs
pm2 logs eff-api

# Application logs
tail -f /opt/eff-membership/logs/backend/app.log

# Docker logs
docker logs eff-membership-postgres
docker logs eff-membership-redis
```

**Frontend Nginx logs:**
```bash
# Access logs
tail -f /opt/eff-membership/logs/nginx/access.log

# Error logs
tail -f /opt/eff-membership/logs/nginx/error.log

# System logs
sudo tail -f /var/log/nginx/error.log
```

### Log Rotation

Log rotation is automatically configured during setup.

**Check log rotation config:**
```bash
cat /etc/logrotate.d/eff-membership
cat /etc/logrotate.d/eff-membership-nginx
```

**Test log rotation:**
```bash
sudo logrotate -f /etc/logrotate.d/eff-membership
```

### Centralized Logging (Optional)

For production environments, consider centralized logging:

**Options:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Graylog
- Splunk
- Papertrail
- Loggly

---

## 💻 System Monitoring

### Basic System Monitoring

**CPU and Memory:**
```bash
# Real-time monitoring
htop

# CPU usage
top

# Memory usage
free -h

# Disk usage
df -h

# Disk I/O
iotop

# Network usage
nethogs
```

**System stats:**
```bash
# Install sysstat if not already installed
sudo apt install sysstat -y

# CPU statistics
mpstat 1 5

# I/O statistics
iostat -x 1 5

# Memory statistics
vmstat 1 5
```

### Automated System Monitoring

**Create monitoring script:**
```bash
cat > /opt/eff-membership/system-monitor.sh <<'EOF'
#!/bin/bash
# System Monitoring Script

LOG_FILE="/opt/eff-membership/logs/system-monitor.log"

echo "=== System Monitor - $(date) ===" >> $LOG_FILE

# CPU Usage
echo "CPU Usage:" >> $LOG_FILE
top -bn1 | grep "Cpu(s)" >> $LOG_FILE

# Memory Usage
echo "Memory Usage:" >> $LOG_FILE
free -h >> $LOG_FILE

# Disk Usage
echo "Disk Usage:" >> $LOG_FILE
df -h /opt/eff-membership >> $LOG_FILE

# Load Average
echo "Load Average:" >> $LOG_FILE
uptime >> $LOG_FILE

echo "" >> $LOG_FILE
EOF

chmod +x /opt/eff-membership/system-monitor.sh
```

**Schedule with cron:**
```bash
crontab -e

# Add this line (every 15 minutes):
*/15 * * * * /opt/eff-membership/system-monitor.sh
```

---

## 🗄️ Database Monitoring

### PostgreSQL Monitoring

**Check database status:**
```bash
docker exec eff-membership-postgres pg_isready -U eff_admin
```

**Database size:**
```bash
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT pg_size_pretty(pg_database_size('eff_membership_db'));"
```

**Active connections:**
```bash
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT count(*) FROM pg_stat_activity;"
```

**Slow queries:**
```bash
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Table sizes:**
```bash
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Redis Monitoring

**Check Redis status:**
```bash
docker exec eff-membership-redis redis-cli ping
```

**Redis info:**
```bash
docker exec eff-membership-redis redis-cli info
```

**Memory usage:**
```bash
docker exec eff-membership-redis redis-cli info memory
```

**Connected clients:**
```bash
docker exec eff-membership-redis redis-cli info clients
```

**Cache hit rate:**
```bash
docker exec eff-membership-redis redis-cli info stats | grep keyspace
```

---

## 🚨 Alerting Setup

### Email Alerts with Monit

**Install Monit:**
```bash
sudo apt install monit -y
```

**Configure Monit:**
```bash
sudo nano /etc/monit/monitrc
```

**Add configuration:**
```
set daemon 120
set log /var/log/monit.log

set mailserver smtp.gmail.com port 587
    username "your-email@gmail.com" password "your-password"
    using tlsv1
    with timeout 30 seconds

set alert admin@your-domain.com

# Monitor PM2 process
check process eff-api with pidfile /home/user/.pm2/pids/eff-api-0.pid
    start program = "/usr/bin/pm2 start eff-api"
    stop program = "/usr/bin/pm2 stop eff-api"
    if cpu > 80% for 5 cycles then alert
    if memory > 80% for 5 cycles then alert

# Monitor Nginx
check process nginx with pidfile /var/run/nginx.pid
    start program = "/usr/bin/systemctl start nginx"
    stop program = "/usr/bin/systemctl stop nginx"
    if failed host localhost port 80 then restart

# Monitor PostgreSQL
check host postgres with address localhost
    if failed port 5432 protocol pgsql then alert

# Monitor Redis
check host redis with address localhost
    if failed port 6379 protocol redis then alert

# Monitor disk space
check filesystem rootfs with path /
    if space usage > 80% then alert

# Monitor system load
check system $HOST
    if loadavg (5min) > 4 then alert
    if memory usage > 80% then alert
    if cpu usage (user) > 70% for 5 cycles then alert
```

**Start Monit:**
```bash
sudo systemctl enable monit
sudo systemctl start monit
sudo monit status
```

### Slack Alerts (Optional)

Create a webhook script for Slack notifications:

```bash
cat > /opt/eff-membership/slack-alert.sh <<'EOF'
#!/bin/bash
# Slack Alert Script

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
MESSAGE="$1"

curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$MESSAGE\"}" \
    $SLACK_WEBHOOK
EOF

chmod +x /opt/eff-membership/slack-alert.sh
```

---

## 📈 Performance Metrics

### Application Performance Monitoring (APM)

Consider implementing APM tools:

**Options:**
- New Relic
- Datadog
- AppDynamics
- Elastic APM
- Prometheus + Grafana

### Custom Metrics Endpoint

Add a metrics endpoint to your backend API:

```typescript
// backend/src/routes/metrics.ts
router.get('/metrics', async (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json(metrics);
});
```

---

## 🔧 Troubleshooting

### Common Issues

**High CPU usage:**
```bash
# Find process using most CPU
top -o %CPU

# Check PM2 processes
pm2 monit
```

**High memory usage:**
```bash
# Check memory usage
free -h
pm2 monit

# Restart if needed
pm2 restart eff-api
```

**Disk space issues:**
```bash
# Check disk usage
df -h

# Find large files
sudo du -h /opt/eff-membership | sort -rh | head -20

# Clean old logs
sudo find /opt/eff-membership/logs -name "*.log" -mtime +30 -delete
```

---

## 📞 Support

For monitoring issues:
1. Check health check logs
2. Review PM2 logs
3. Check system resources
4. Review application logs
5. Contact system administrator

---

**End of Monitoring Setup Guide**

