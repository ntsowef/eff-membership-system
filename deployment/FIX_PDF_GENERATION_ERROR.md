# Fix PDF Generation Error (500 Error)

## 🚨 Problem Summary

You're getting a **500 Internal Server Error** when trying to export ward audit reports as PDF. The error is:

```
Failed to launch the browser process!
libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

**Root Cause:** Puppeteer (used by `html-pdf-node` for PDF generation) cannot launch Chromium because required system libraries are missing on your Linux server.

---

## ✅ Quick Fix (5 Minutes)

### Step 1: SSH into Your Server

```bash
ssh your-username@your-server-ip
```

### Step 2: Navigate to Project Directory

```bash
cd /var/www/eff-membership-system
```

### Step 3: Run the Installation Script

```bash
sudo bash deployment/install-chromium-dependencies.sh
```

This will install all required system libraries for Chromium.

### Step 4: Restart Backend

```bash
pm2 restart eff-api
```

### Step 5: Test PDF Generation

```bash
cd backend
node ../test/test-puppeteer-chromium.js
```

If you see "✅ ALL TESTS PASSED!", PDF generation is working!

---

## 🧪 Verify the Fix

1. **Login to your application**
2. **Navigate to Ward Audit** (Members → Ward Audit)
3. **Select a ward** with members
4. **Click "Export PDF"**
5. **Check if PDF downloads successfully**

---

## 📊 Check Backend Logs

```bash
pm2 logs eff-api --lines 50
```

**Success indicators:**
- `✅ PDF generation successful`
- `📄 Generating PDF from HTML...`
- No errors about missing libraries

---

## 🔧 Alternative Solutions

### If the Quick Fix Doesn't Work

#### Option A: Use System Chrome

If Chrome is already installed on your server:

```bash
# Find Chrome location
which google-chrome

# Add to backend/.env
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome" >> backend/.env

# Restart
pm2 restart eff-api
```

#### Option B: Install Chrome Manually

```bash
# Download Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

# Install
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f

# Configure Puppeteer
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome" >> /var/www/eff-membership-system/backend/.env

# Restart
pm2 restart eff-api
```

---

## 🐛 Troubleshooting

### Still Getting Errors?

**1. Check if dependencies are installed:**
```bash
ldconfig -p | grep libatk
# Should show: libatk-1.0.so.0
```

**2. Check Puppeteer installation:**
```bash
cd /var/www/eff-membership-system/backend
npm list puppeteer html-pdf-node
```

**3. Test Puppeteer directly:**
```bash
cd /var/www/eff-membership-system/backend
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); console.log('✅ Works!'); await browser.close(); })()"
```

**4. Check PM2 logs for specific errors:**
```bash
pm2 logs eff-api --err --lines 100
```

### Memory Issues

If you get "Out of Memory" errors:

```bash
pm2 delete eff-api
pm2 start /var/www/eff-membership-system/deployment/ecosystem.config.js --env production
pm2 save
```

---

## 📚 Additional Resources

- **Full Guide:** `deployment/PUPPETEER_FIX_GUIDE.md`
- **Installation Script:** `deployment/install-chromium-dependencies.sh`
- **Test Script:** `test/test-puppeteer-chromium.js`
- **Puppeteer Docs:** https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md

---

## ✅ Success Checklist

- [ ] Installed Chromium dependencies
- [ ] Restarted PM2 backend
- [ ] Ran test script successfully
- [ ] PDF export works in application
- [ ] No errors in PM2 logs

---

**Created:** 2025-11-23  
**Issue:** PDF Generation 500 Error  
**Cause:** Missing Chromium system libraries

