# 🚀 Quick Fix: Logo Not Showing in Ward Register PDF (Production)

## Problem
Ward register PDFs downloaded in production are missing the logo at the top.

## Root Cause
The logo file `logo.png` is missing from the production server at the expected location: `/var/www/eff-membership-system/backend/assets/logo.png`

## ⚡ Quick Fix (5 Minutes)

### Option 1: Run the Automated Script (Recommended)

1. **Upload the fix script to your production server**:
   ```bash
   # From your local machine
   scp deployment/fix-logo-production.sh user@your-server:/tmp/
   ```

2. **SSH into production and run the script**:
   ```bash
   ssh user@your-server
   cd /tmp
   chmod +x fix-logo-production.sh
   sudo bash fix-logo-production.sh
   ```

3. **Done!** The script will:
   - Create the assets directory if missing
   - Copy the logo from `src/assets/images/EFF_Reglogo.png` to `assets/logo.png`
   - Set correct permissions
   - Restart the PM2 application

### Option 2: Manual Fix (3 Commands)

```bash
# SSH into production server
ssh user@your-server

# Navigate to backend directory
cd /var/www/eff-membership-system/backend

# Create assets directory and copy logo
mkdir -p assets
cp src/assets/images/EFF_Reglogo.png assets/logo.png

# Set permissions
chmod 644 assets/logo.png

# Restart application
pm2 restart eff-api
```

### Option 3: Upload Logo from Local Machine

```bash
# From your local machine, upload the logo directly
scp backend/assets/logo.png user@your-server:/var/www/eff-membership-system/backend/assets/logo.png

# Then SSH in and restart
ssh user@your-server
pm2 restart eff-api
```

## ✅ Verify the Fix

1. **Check if logo file exists**:
   ```bash
   ls -la /var/www/eff-membership-system/backend/assets/logo.png
   ```
   Should show: `-rw-r--r-- 1 user user [size] [date] logo.png`

2. **Test PDF generation**:
   - Log into the system
   - Navigate to a ward
   - Download the ward register as PDF
   - Open the PDF and check if the logo appears at the top

3. **Check application logs**:
   ```bash
   pm2 logs eff-api --lines 50 | grep -i logo
   ```
   Should show: `✅ EFF logo found at: /var/www/eff-membership-system/backend/assets/logo.png`

## 📋 Technical Details

### Where the Logo Should Be
```
/var/www/eff-membership-system/
└── backend/
    ├── assets/
    │   └── logo.png          ← Logo must be here
    ├── src/
    │   └── assets/
    │       └── images/
    │           └── EFF_Reglogo.png  ← Source logo
    └── dist/
        └── assets/
            └── images/
                └── EFF_Reglogo.png  ← Compiled logo (for Word docs)
```

### Code Reference
The code in `backend/src/services/htmlPdfService.ts` (line 100) looks for:
```javascript
const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
```

When PM2 runs the app with `cwd=/var/www/eff-membership-system/backend`, this resolves to:
```
/var/www/eff-membership-system/backend/assets/logo.png
```

## 🔍 Troubleshooting

### Logo still not showing after fix?

1. **Verify file permissions**:
   ```bash
   ls -la /var/www/eff-membership-system/backend/assets/logo.png
   # Should be readable (644 or 755)
   ```

2. **Check PM2 working directory**:
   ```bash
   pm2 info eff-api | grep cwd
   # Should show: /var/www/eff-membership-system/backend
   ```

3. **Check if file is actually a PNG**:
   ```bash
   file /var/www/eff-membership-system/backend/assets/logo.png
   # Should show: PNG image data
   ```

4. **View application logs**:
   ```bash
   pm2 logs eff-api --lines 100
   # Look for logo-related messages
   ```

5. **Restart with logs**:
   ```bash
   pm2 restart eff-api
   pm2 logs eff-api
   # Then trigger a PDF download and watch the logs
   ```

## 📚 Additional Resources

- **Full Deployment Guide**: `deployment/LOGO_DEPLOYMENT_GUIDE.md`
- **All Logo Paths**: `deployment/LOGO_PATHS_SUMMARY.md`
- **Automated Script**: `deployment/fix-logo-production.sh`

## 🎯 Summary

**What you need to do**:
1. Ensure `logo.png` exists at `/var/www/eff-membership-system/backend/assets/logo.png`
2. Restart the PM2 application
3. Test by downloading a ward register PDF

**Fastest method**: Run the automated script (Option 1 above)

**Time required**: 5 minutes

**Risk level**: Low (only adds a file, doesn't modify code)

