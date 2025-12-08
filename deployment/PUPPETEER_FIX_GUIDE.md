# Puppeteer/Chromium PDF Generation Fix Guide

## Problem
Puppeteer cannot launch Chromium for PDF generation due to missing system libraries:
```
error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

## Solution Options

### Option 1: Install Required Dependencies (Recommended)

**Quick Fix:**
```bash
# SSH into your server
ssh your-server

# Run the installation script
cd /var/www/eff-membership-system
sudo bash deployment/install-chromium-dependencies.sh

# Restart the backend
pm2 restart eff-api
```

**Manual Installation:**
```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates fonts-liberation libappindicator3-1 libasound2 \
  libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
  libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \
  wget xdg-utils libdrm2 libgbm-dev libnss3-dev libxshmfence1
```

### Option 2: Use System Chrome (Alternative)

If you have Chrome/Chromium already installed:

1. **Find Chrome executable:**
```bash
which google-chrome
# or
which chromium-browser
```

2. **Set environment variable in `.env`:**
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
# or
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

3. **Restart backend:**
```bash
pm2 restart eff-api
```

### Option 3: Skip Chromium Download (For Docker)

If using Docker, add to your Dockerfile:
```dockerfile
# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Verification

After applying the fix:

1. **Check if dependencies are installed:**
```bash
ldconfig -p | grep libatk
# Should show: libatk-1.0.so.0
```

2. **Test PDF generation:**
   - Login to your application
   - Navigate to Ward Audit
   - Try to export a ward report as PDF
   - Check if download succeeds

3. **Check backend logs:**
```bash
pm2 logs eff-api --lines 50
# Should see: "✅ PDF generation successful"
```

## Troubleshooting

### Still Getting Errors?

**Check Puppeteer version:**
```bash
cd /var/www/eff-membership-system/backend
npm list html-pdf-node puppeteer
```

**Check Chromium location:**
```bash
ls -la node_modules/puppeteer/.local-chromium/
```

**Test Puppeteer directly:**
```bash
cd /var/www/eff-membership-system/backend
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); console.log('✅ Puppeteer works!'); await browser.close(); })()"
```

### Memory Issues

If you get memory errors, increase PM2 memory limit:
```bash
pm2 delete eff-api
pm2 start ecosystem.config.js --env production --max-memory-restart 2G
pm2 save
```

### Permission Issues

Ensure proper permissions:
```bash
cd /var/www/eff-membership-system/backend
sudo chown -R $USER:$USER node_modules
sudo chmod -R 755 node_modules
```

## Related Files

- `backend/src/services/htmlPdfService.ts` - PDF generation service
- `backend/src/services/attendanceRegisterEmailService.ts` - Email with PDF
- `backend/src/routes/members.ts` - Ward audit export endpoint
- `deployment/install-chromium-dependencies.sh` - Dependency installation script

## Additional Resources

- [Puppeteer Troubleshooting](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)
- [html-pdf-node Documentation](https://www.npmjs.com/package/html-pdf-node)
- [Chrome Headless Dependencies](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)

