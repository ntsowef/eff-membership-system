# Logo Deployment Guide for Ward Register PDF

## Problem
The ward register PDF is not showing the logo in production because the logo file is missing or not accessible on the production server.

## Solution

### Step 1: Verify Logo File Exists Locally
The logo should exist at:
```
backend/assets/logo.png
```

### Step 2: Upload Logo to Production Server

**Option A: Using SCP (Secure Copy)**
```bash
# From your local machine, upload the logo to production
scp backend/assets/logo.png user@your-server:/var/www/eff-membership-system/backend/assets/logo.png
```

**Option B: Using SFTP**
```bash
sftp user@your-server
cd /var/www/eff-membership-system/backend/assets
put backend/assets/logo.png
exit
```

**Option C: Manual Upload via File Manager**
1. Connect to your server via FTP/SFTP client (FileZilla, WinSCP, etc.)
2. Navigate to `/var/www/eff-membership-system/backend/assets/`
3. Upload `logo.png` to this directory

### Step 3: Verify File Permissions on Production Server

SSH into your production server and run:
```bash
# Navigate to backend directory
cd /var/www/eff-membership-system/backend

# Check if assets directory exists
ls -la assets/

# If assets directory doesn't exist, create it
mkdir -p assets

# Set proper permissions
chmod 755 assets
chmod 644 assets/logo.png

# Ensure the file is owned by the correct user (usually the user running Node.js)
# Replace 'www-data' with your actual user if different
sudo chown www-data:www-data assets/logo.png
```

### Step 4: Verify the Logo Path in Code

The code in `backend/src/services/htmlPdfService.ts` (line 100) looks for:
```javascript
const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
```

When running in production with PM2, `process.cwd()` should be `/var/www/eff-membership-system/backend`, so the full path becomes:
```
/var/www/eff-membership-system/backend/assets/logo.png
```

### Step 5: Test the Logo

After uploading, test by:
1. Downloading a ward register PDF
2. Check the PDF to see if the logo appears at the top

### Step 6: Check PM2 Logs (If Issues Persist)

```bash
# Check PM2 logs for any errors
pm2 logs eff-api

# Look for messages like:
# "✅ EFF logo found at: /path/to/logo.png"
# or
# "⚠️ EFF logo not found at: /path/to/logo.png"
```

## Logo Requirements

- **Filename**: `logo.png`
- **Format**: PNG (recommended) or JPG
- **Recommended size**: 300x300 pixels or similar square aspect ratio
- **Display size in PDF**: 90 pixels width
- **Location**: `backend/assets/logo.png` (at backend root level)

## Alternative: Use EFF_Reglogo.png

If you want to use the existing `EFF_Reglogo.png` from `backend/src/assets/images/`, you can:

1. Copy it to the correct location:
```bash
# On production server
cd /var/www/eff-membership-system/backend
mkdir -p assets
cp src/assets/images/EFF_Reglogo.png assets/logo.png
```

2. Or create a symbolic link:
```bash
cd /var/www/eff-membership-system/backend/assets
ln -s ../src/assets/images/EFF_Reglogo.png logo.png
```

## Troubleshooting

### Logo still not showing?

1. **Check file exists**:
   ```bash
   ls -la /var/www/eff-membership-system/backend/assets/logo.png
   ```

2. **Check file permissions**:
   ```bash
   # File should be readable by the Node.js process user
   chmod 644 /var/www/eff-membership-system/backend/assets/logo.png
   ```

3. **Check PM2 working directory**:
   ```bash
   pm2 info eff-api | grep cwd
   ```
   Should show: `/var/www/eff-membership-system/backend`

4. **Restart the application**:
   ```bash
   pm2 restart eff-api
   ```

5. **Check logs for path resolution**:
   ```bash
   pm2 logs eff-api --lines 100
   ```

## Quick Fix Script

Create and run this script on your production server:

```bash
#!/bin/bash
# fix-logo.sh

cd /var/www/eff-membership-system/backend

# Create assets directory if it doesn't exist
mkdir -p assets

# Copy logo from src/assets/images if it exists there
if [ -f "src/assets/images/EFF_Reglogo.png" ]; then
    cp src/assets/images/EFF_Reglogo.png assets/logo.png
    echo "✅ Logo copied from src/assets/images/"
fi

# Set permissions
chmod 755 assets
chmod 644 assets/logo.png

# Set ownership (adjust user as needed)
sudo chown -R www-data:www-data assets/

echo "✅ Logo setup complete!"
echo "📍 Logo location: $(pwd)/assets/logo.png"

# Restart PM2
pm2 restart eff-api

echo "✅ Application restarted"
```

Run it:
```bash
chmod +x fix-logo.sh
./fix-logo.sh
```

