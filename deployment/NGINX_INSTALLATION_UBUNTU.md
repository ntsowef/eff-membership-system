# Nginx Installation Guide for Ubuntu

Complete guide for installing and configuring Nginx on Ubuntu 20.04/22.04 LTS for the EFF Membership System backend API.

---

## 📋 Prerequisites

- Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- Root or sudo access
- Internet connection
- At least 512MB RAM (1GB+ recommended)

---

## 🚀 Installation Methods

### Method 1: Install from Ubuntu Repository (Recommended)

This is the easiest and most stable method.

```bash
# Update package index
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v
```

**Expected Output:**
```
nginx version: nginx/1.18.0 (Ubuntu)  # For Ubuntu 20.04
nginx version: nginx/1.22.0 (Ubuntu)  # For Ubuntu 22.04
```

### Method 2: Install Latest Stable Version from Official Nginx Repository

For the latest features and updates:

```bash
# Install prerequisites
sudo apt install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring

# Import Nginx signing key
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

# Verify the key
gpg --dry-run --quiet --no-keyring --import --import-options import-show /usr/share/keyrings/nginx-archive-keyring.gpg

# Set up the repository for stable nginx packages
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list

# Set repository priority
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
    | sudo tee /etc/apt/preferences.d/99nginx

# Update package index
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v
```

---

## ⚙️ Post-Installation Configuration

### 1. Start and Enable Nginx

```bash
# Start Nginx service
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx
```

**Expected Output:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

### 2. Verify Nginx is Running

```bash
# Check if Nginx process is running
ps aux | grep nginx

# Check if Nginx is listening on port 80
sudo netstat -tlnp | grep :80

# Or use ss command (modern alternative)
sudo ss -tlnp | grep :80

# Test Nginx locally
curl http://localhost

# Get your server's public IP
curl ifconfig.me
```

### 3. Test from Browser

Open your browser and navigate to:
```
http://YOUR_SERVER_IP
```

You should see the **"Welcome to nginx!"** default page.

---

## 🔧 Basic Nginx Configuration

### Understanding Nginx Directory Structure

```
/etc/nginx/
├── nginx.conf              # Main configuration file
├── sites-available/        # Available site configurations
├── sites-enabled/          # Enabled site configurations (symlinks)
├── conf.d/                 # Additional configuration files
├── snippets/               # Configuration snippets
└── modules-enabled/        # Enabled modules
```

### Default Configuration Files

```bash
# Main configuration file
/etc/nginx/nginx.conf

# Default site configuration
/etc/nginx/sites-available/default

# Enabled sites (symlinks)
/etc/nginx/sites-enabled/

# Log files
/var/log/nginx/access.log
/var/log/nginx/error.log

# Web root directory
/var/www/html/
```

### Test Nginx Configuration

Always test configuration before reloading:

```bash
# Test configuration syntax
sudo nginx -t

# Expected output if OK:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Reload Nginx Configuration

```bash
# Reload configuration without downtime
sudo systemctl reload nginx

# Or use nginx command
sudo nginx -s reload

# Restart Nginx (causes brief downtime)
sudo systemctl restart nginx
```

---

## 🔥 Firewall Configuration

### Using UFW (Uncomplicated Firewall)

```bash
# Check UFW status
sudo ufw status

# Allow Nginx HTTP
sudo ufw allow 'Nginx HTTP'

# Allow Nginx HTTPS
sudo ufw allow 'Nginx HTTPS'

# Or allow both (Full)
sudo ufw allow 'Nginx Full'

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

**UFW Nginx Profiles:**
- `Nginx HTTP` - Opens port 80 (HTTP)
- `Nginx HTTPS` - Opens port 443 (HTTPS)
- `Nginx Full` - Opens both ports 80 and 443

### Manual Firewall Rules

If not using UFW:

```bash
# Using iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save iptables rules
sudo netfilter-persistent save
```

---

## 🛠️ Common Nginx Commands

### Service Management

```bash
# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart Nginx
sudo systemctl restart nginx

# Reload configuration
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# Enable on boot
sudo systemctl enable nginx

# Disable on boot
sudo systemctl disable nginx
```

### Configuration Testing

```bash
# Test configuration
sudo nginx -t

# Test and show configuration
sudo nginx -T

# Show Nginx version
nginx -v

# Show version and configure options
nginx -V
```

### Log Management

```bash
# View access log
sudo tail -f /var/log/nginx/access.log

# View error log
sudo tail -f /var/log/nginx/error.log

# View last 100 lines
sudo tail -n 100 /var/log/nginx/access.log

# Search for errors
sudo grep "error" /var/log/nginx/error.log
```

---

## 🔍 Troubleshooting

### Issue 1: Nginx Won't Start

```bash
# Check status and error messages
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Check if port 80 is already in use
sudo netstat -tlnp | grep :80
```

**Common causes:**
- Port 80 already in use (Apache, another web server)
- Configuration syntax errors
- Permission issues

### Issue 2: Port 80 Already in Use

```bash
# Check what's using port 80
sudo netstat -tlnp | grep :80

# If Apache is running
sudo systemctl stop apache2
sudo systemctl disable apache2

# Restart Nginx
sudo systemctl restart nginx
```

### Issue 3: Permission Denied Errors

```bash
# Check Nginx user
ps aux | grep nginx

# Fix permissions on web root
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Check SELinux (if applicable)
sudo setenforce 0  # Temporarily disable
```

### Issue 4: Configuration Test Fails

```bash
# Test configuration with detailed output
sudo nginx -t

# Check for syntax errors in config files
sudo nginx -T | less

# Validate specific config file
sudo nginx -t -c /etc/nginx/sites-available/your-site
```

### Issue 5: Can't Access from Outside

```bash
# Check if Nginx is listening
sudo netstat -tlnp | grep :80

# Check firewall
sudo ufw status

# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'

# Check if server is accessible
curl http://YOUR_SERVER_IP
```

---

## 🔐 Security Best Practices

### 1. Hide Nginx Version

```bash
# Edit main config
sudo nano /etc/nginx/nginx.conf

# Add inside http block:
server_tokens off;

# Reload Nginx
sudo systemctl reload nginx
```

### 2. Set Up Basic Security Headers

```bash
# Edit your site config
sudo nano /etc/nginx/sites-available/default

# Add inside server block:
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Limit Request Rate

```bash
# Add to http block in nginx.conf
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

# Add to server block
limit_req zone=one burst=20 nodelay;
```

### 4. Regular Updates

```bash
# Update Nginx regularly
sudo apt update
sudo apt upgrade nginx

# Check for security updates
sudo apt list --upgradable | grep nginx
```

---

## 📊 Monitoring and Logs

### Enable Access Logging

```bash
# Edit site config
sudo nano /etc/nginx/sites-available/default

# Add inside server block:
access_log /var/log/nginx/access.log;
error_log /var/log/nginx/error.log warn;
```

### Log Rotation

Ubuntu automatically configures log rotation. Check:

```bash
# View logrotate config
cat /etc/logrotate.d/nginx
```

### Real-time Monitoring

```bash
# Monitor access log
sudo tail -f /var/log/nginx/access.log

# Monitor error log
sudo tail -f /var/log/nginx/error.log

# Monitor both
sudo tail -f /var/log/nginx/*.log
```

---

## ✅ Verification Checklist

After installation, verify:

- [ ] Nginx is installed: `nginx -v`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Nginx starts on boot: `sudo systemctl is-enabled nginx`
- [ ] Port 80 is listening: `sudo netstat -tlnp | grep :80`
- [ ] Firewall allows HTTP/HTTPS: `sudo ufw status`
- [ ] Default page accessible: `curl http://localhost`
- [ ] Accessible from outside: `http://YOUR_SERVER_IP`
- [ ] Configuration test passes: `sudo nginx -t`
- [ ] Logs are being written: `sudo tail /var/log/nginx/access.log`

---

## 📝 Next Steps

After installing Nginx:

1. **Configure for Backend API:**
   - Follow `BACKEND_API_SSL_DEPLOYMENT.md`
   - Set up reverse proxy to Node.js backend

2. **Obtain SSL Certificate:**
   - Install Certbot
   - Get Let's Encrypt certificate
   - Configure HTTPS

3. **Optimize Performance:**
   - Configure caching
   - Enable gzip compression
   - Set up connection pooling

4. **Set Up Monitoring:**
   - Configure log rotation
   - Set up monitoring alerts
   - Monitor server resources

---

## 🔗 Useful Resources

- **Official Nginx Documentation:** https://nginx.org/en/docs/
- **Ubuntu Nginx Package:** https://packages.ubuntu.com/search?keywords=nginx
- **Nginx Beginner's Guide:** https://nginx.org/en/docs/beginners_guide.html
- **Nginx Admin Guide:** https://docs.nginx.com/nginx/admin-guide/

---

**Installation Complete!** 🎉

Your Nginx web server is now installed and ready to be configured as a reverse proxy for the EFF Membership System backend API.

Proceed to `BACKEND_API_SSL_DEPLOYMENT.md` for SSL setup and backend configuration.

